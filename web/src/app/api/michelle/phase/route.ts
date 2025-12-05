import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { z } from "zod";

import { MICHELLE_AI_ENABLED } from "@/lib/feature-flags";
import { getMichelleOpenAIClient } from "@/lib/michelle/openai";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";

type GuidedPhase = "explore" | "deepen" | "release";

const requestSchema = z.object({
  sessionId: z.string().uuid(),
});

const PHASE_OPTIONS: GuidedPhase[] = ["explore", "deepen", "release"];

const DEFAULT_SUMMARIES: Record<GuidedPhase, string> = {
  explore: "気持ちの棚卸しを続けています",
  deepen: "感情の芯を深く見つめています",
  release: "気づきを整理して手放す準備をしています",
};

const MODEL_NAME = process.env.MICHELLE_PHASE_MODEL || "gpt-4o-mini";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MichelleSupabase = SupabaseClient<any>;

const buildConversationSnapshot = (
  messages: { role: string; content: string; created_at: string }[],
  limit = 16,
) => {
  const recent = messages.slice(-limit);
  return recent
    .map((msg) => {
      const label = msg.role === "assistant" ? "AI" : msg.role === "user" ? "ユーザー" : "システム";
      const cleaned = msg.content.replace(/\s+/g, " ").trim();
      return `${label}: ${cleaned}`;
    })
    .join("\n");
};

const parseOpenAIContent = (content: OpenAI.Chat.Completions.ChatCompletionMessage["content"]) => {
  if (!content) {
    return "";
  }

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return (content as Array<{ type?: string; text?: string }>)
      .map((part) => {
        if (part?.type === "text") {
          return part.text ?? "";
        }
        return "";
      })
      .join("\n");
  }

  return "";
};

export async function POST(request: Request) {
  if (!MICHELLE_AI_ENABLED) {
    return NextResponse.json({ error: "Michelle AI is currently disabled" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { sessionId } = parsed.data;
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore) as unknown as MichelleSupabase;

  let user;
  try {
    user = await getRouteUser(supabase, "Michelle current phase");
  } catch (error) {
    if (error instanceof SupabaseAuthUnavailableError) {
      return NextResponse.json(
        { error: "Authentication service is temporarily unavailable. Please try again later." },
        { status: 503 },
      );
    }
    throw error;
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: session, error: sessionError } = await supabase
    .from("michelle_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const { data: messages, error: messageError } = await supabase
    .from("michelle_messages")
    .select("role, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(60);

  if (messageError) {
    console.error("Failed to load michelle messages for phase insight", messageError);
    return NextResponse.json({ error: "Failed to load session messages" }, { status: 500 });
  }

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "まだ会話がありません" }, { status: 400 });
  }

  const conversation = buildConversationSnapshot(messages, 18);

  const openai = getMichelleOpenAIClient();

  const systemPrompt = `あなたは臨床心理士のメンターです。会話の文脈から現在のセッションが次のどのフェーズにあるかを1つ選んでください。
- explore: 感情や事実を整理し始めた段階
- deepen: 感情の芯や思い込みを深掘りしている段階
- release: 気づきをまとめて手放す／セルフケアへ移行する段階
必ずJSONのみで回答してください。`;

  const userPrompt = `以下は直近の会話ログです。現在のフェーズと、その根拠を簡潔にまとめてください。
${conversation}

出力形式:
{
  "phase": "explore|deepen|release",
  "summary": "現在の状態を30文字前後の日本語で説明"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL_NAME,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = parseOpenAIContent(completion.choices[0]?.message?.content);
    let parsedResponse: { phase?: string; summary?: string } = {};

    try {
      parsedResponse = content ? JSON.parse(content) : {};
    } catch (jsonError) {
      console.error("Failed to parse phase insight response", jsonError, { content });
    }

    const normalizedPhase = (parsedResponse.phase || "explore").toLowerCase() as GuidedPhase;
    const phase: GuidedPhase = PHASE_OPTIONS.includes(normalizedPhase) ? normalizedPhase : "explore";
    const summary = parsedResponse.summary?.trim() || DEFAULT_SUMMARIES[phase];

    return NextResponse.json({ phase, summary });
  } catch (error) {
    console.error("Phase insight OpenAI error", error);
    return NextResponse.json({ error: "フェーズ診断に失敗しました" }, { status: 500 });
  }
}
