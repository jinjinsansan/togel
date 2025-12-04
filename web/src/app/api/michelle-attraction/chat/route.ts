import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import type OpenAI from "openai";
import { z } from "zod";

import { MICHELLE_ATTRACTION_AI_ENABLED } from "@/lib/feature-flags";
import { getMichelleAttractionAssistantId, getMichelleAttractionOpenAIClient } from "@/lib/michelle-attraction/openai";
import { retrieveAttractionKnowledgeMatches } from "@/lib/michelle-attraction/rag";

const requestSchema = z.object({
  sessionId: z.string().uuid().optional(),
  message: z.string().min(1).max(2000),
  category: z.enum(["love", "life", "relationship"]).optional(),
});

type StreamEventMap = {
  textDelta: { value?: string };
  error: unknown;
  end: unknown;
};

type ThreadRunStream = {
  on: <E extends keyof StreamEventMap>(event: E, handler: (payload: StreamEventMap[E]) => void) => ThreadRunStream;
};

type OpenAIThreadsBeta = {
  create: () => Promise<{ id: string }>;
  messages: {
    create: (threadId: string, payload: { role: string; content: string }) => Promise<unknown>;
  };
  runs: {
    stream: (threadId: string, payload: { assistant_id: string }) => ThreadRunStream;
  };
};

type OpenAIWithBeta = OpenAI & {
  beta?: {
    threads?: OpenAIThreadsBeta;
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AttractionSupabase = SupabaseClient<any>;

export async function POST(request: Request) {
  if (!MICHELLE_ATTRACTION_AI_ENABLED) {
    return NextResponse.json({ error: "Michelle Attraction AI is currently disabled" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { sessionId: incomingSessionId, message, category } = parsed.data;
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore }) as unknown as AttractionSupabase;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { sessionId, threadId, isNewSession } = await resolveSession(
      supabase,
      user.id,
      incomingSessionId,
      message,
      category,
    );

    const openai = getMichelleAttractionOpenAIClient();
    const assistantId = getMichelleAttractionAssistantId();
    const betaThreads = (openai as OpenAIWithBeta).beta?.threads;

    if (!betaThreads) {
      throw new Error("OpenAI Assistants API is not available in the current SDK version");
    }

    const knowledgeMatches = await retrieveAttractionKnowledgeMatches(message, {
      matchCount: 8,
      similarityThreshold: 0.45,
    });

    const knowledgeContext = knowledgeMatches
      .map((match, index) => `[参考知識${index + 1}]\n${match.content}`)
      .join("\n\n");

    const onboardingPrimer = isNewSession
      ? `【初回オンボーディング指示】\nこの会話は新しいミシェル引き寄せ講座セッションの初回です。以下の手順を厳守して最初の返信を作成してください。\n1. 温かく挨拶し、講座の概要を1〜2文で伝える。\n2. ユーザーが初めてか/継続かを尋ねる。継続なら進捗コード(MCL-L{n}-S{nn}-{STATUS})の提示を必ず求め、コードから次に進むべきセクションを判断する。\n3. 進捗コードが無い場合は診断質問Q1〜Q3を順番に実施し、回答を踏まえて開始レベル/セクションを決定する。\n4. 決定したセクションを明示し、【導入→本編→理解度チェック→進捗コード発行】の流れで丁寧に進める。\n5. セクション完了ごとに最新の進捗コードを生成し、保存を促す。\nこの直後に続くユーザーメッセージに必ず上記フローを適用して返信文を構築すること。\n\n【ユーザーメッセージ】\n${message}`
      : message;

    const finalMessage =
      knowledgeMatches.length > 0
        ? `【ユーザーメッセージ】\n${onboardingPrimer}\n\n---\n内部参考情報（ユーザーには見せないこと）：\n以下のミシェル引き寄せ知識を参考にして回答を構築してください。\n${knowledgeContext}`
        : onboardingPrimer;

    await supabase.from("michelle_attraction_messages").insert({
      session_id: sessionId,
      role: "user",
      content: message,
    });

    try {
      await betaThreads.messages.create(threadId, {
        role: "user",
        content: finalMessage,
      });
    } catch (openaiError) {
      console.error("Michelle Attraction OpenAI message creation error", openaiError);

      if (openaiError instanceof Error && openaiError.message.includes("while a run")) {
        return NextResponse.json(
          { error: "前の応答がまだ処理中です。少しお待ちください。" },
          { status: 429 },
        );
      }

      throw openaiError;
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (payload: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data:${JSON.stringify(payload)}\n\n`));
        };

        try {
          sendEvent({ type: "meta", sessionId, knowledge: knowledgeMatches.slice(0, 4) });

          let fullReply = "";

          const runStream = betaThreads.runs.stream(threadId, {
            assistant_id: assistantId,
          });

          runStream
            .on("textDelta", (delta: { value?: string }) => {
              if (delta.value) {
                fullReply += delta.value;
                sendEvent({ type: "delta", content: delta.value });
              }
            })
            .on("error", (error: unknown) => {
              console.error("Michelle Attraction AI stream error", error);
              sendEvent({ type: "error", message: "AI応答中にエラーが発生しました" });
              controller.close();
            })
            .on("end", async () => {
              if (fullReply.trim()) {
                await supabase.from("michelle_attraction_messages").insert({
                  session_id: sessionId,
                  role: "assistant",
                  content: fullReply,
                });
              }
              sendEvent({ type: "done" });
              controller.close();
            });
        } catch (error) {
          console.error("Michelle Attraction AI controller error", error);
          sendEvent({ type: "error", message: "処理中にエラーが発生しました" });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Michelle attraction chat error", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const resolveSession = async (
  supabase: AttractionSupabase,
  authUserId: string,
  incomingSessionId: string | null | undefined,
  message: string,
  category: z.infer<typeof requestSchema>["category"],
) => {
  if (incomingSessionId) {
    const { data, error } = await supabase
      .from("michelle_attraction_sessions")
      .select("id, openai_thread_id")
      .eq("id", incomingSessionId)
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (error || !data) {
      throw new Error("Session not found");
    }

    const threadId = await ensureThreadId(supabase, data.id, data.openai_thread_id);
    return { sessionId: data.id, threadId, isNewSession: false };
  }

  const derivedCategory = category ?? "life";
  const title = message.trim().slice(0, 60) || "新しい相談";

  const { data, error } = await supabase
    .from("michelle_attraction_sessions")
    .insert({
      auth_user_id: authUserId,
      category: derivedCategory,
      title,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw error ?? new Error("Failed to create session");
  }

  const threadId = await ensureThreadId(supabase, data.id, null);
  return { sessionId: data.id, threadId, isNewSession: true };
};

const ensureThreadId = async (supabase: AttractionSupabase, sessionId: string, current: string | null) => {
  if (current) {
    return current;
  }

  const openai = getMichelleAttractionOpenAIClient();
  const betaThreads = (openai as OpenAIWithBeta).beta?.threads;

  if (!betaThreads) {
    throw new Error("OpenAI Assistants API is not available in the current SDK version");
  }

  const thread = await betaThreads.create();
  await supabase.from("michelle_attraction_sessions").update({ openai_thread_id: thread.id }).eq("id", sessionId);
  return thread.id;
};
