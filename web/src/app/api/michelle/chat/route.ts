import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import type OpenAI from "openai";
import { z } from "zod";

import { MICHELLE_AI_ENABLED } from "@/lib/feature-flags";
import { getMichelleAssistantId, getMichelleOpenAIClient } from "@/lib/michelle/openai";
import { retrieveKnowledgeMatches } from "@/lib/michelle/rag";
import type { MichelleDatabase } from "@/types/michelle-db";

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
type MichelleSupabase = SupabaseClient<any>;

export async function POST(request: Request) {
  if (!MICHELLE_AI_ENABLED) {
    return NextResponse.json({ error: "Michelle AI is currently disabled" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { sessionId: incomingSessionId, message, category } = parsed.data;
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient<MichelleDatabase>({ cookies: () => cookieStore }) as unknown as MichelleSupabase;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { sessionId, threadId } = await resolveSession(supabase, user.id, incomingSessionId, message, category);

    const openai = getMichelleOpenAIClient();
    const assistantId = getMichelleAssistantId();
    const betaThreads = (openai as OpenAIWithBeta).beta?.threads;

    if (!betaThreads) {
      throw new Error("OpenAI Assistants API is not available in the current SDK version");
    }

    const knowledgeMatches = await retrieveKnowledgeMatches(message, {
      matchCount: 8,
      similarityThreshold: 0.45,
    });

    const knowledgeContext = knowledgeMatches
      .map((match, index) => `[参考知識${index + 1}]\n${match.content}`)
      .join("\n\n");

    const finalMessage =
      knowledgeMatches.length > 0
        ? `【ユーザーメッセージ】\n${message}\n\n---\n内部参考情報（ユーザーには見せないこと）：\n以下のミシェル心理学知識を参考にして回答を構築してください。\n${knowledgeContext}`
        : message;

    await supabase.from("michelle_messages").insert({
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
      console.error("OpenAI message creation error:", openaiError);
      
      // 400エラーの場合は、runが実行中であることをユーザーに通知
      if (openaiError instanceof Error && openaiError.message.includes("while a run")) {
        return NextResponse.json(
          { error: "前の応答がまだ処理中です。少しお待ちください。" },
          { status: 429 }
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
              console.error("Michelle AI stream error", error);
              sendEvent({ type: "error", message: "AI応答中にエラーが発生しました" });
              controller.close();
            })
            .on("end", async () => {
              if (fullReply.trim()) {
                await supabase.from("michelle_messages").insert({
                  session_id: sessionId,
                  role: "assistant",
                  content: fullReply,
                });
              }
              sendEvent({ type: "done" });
              controller.close();
            });
        } catch (error) {
          console.error("Michelle AI controller error", error);
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
    console.error("Michelle chat error", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const resolveSession = async (
  supabase: MichelleSupabase,
  authUserId: string,
  incomingSessionId: string | null | undefined,
  message: string,
  category: z.infer<typeof requestSchema>["category"],
) => {
  if (incomingSessionId) {
    const { data, error } = await supabase
      .from("michelle_sessions")
      .select("id, openai_thread_id")
      .eq("id", incomingSessionId)
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (error || !data) {
      throw new Error("Session not found");
    }

    const threadId = await ensureThreadId(supabase, data.id, data.openai_thread_id);
    return { sessionId: data.id, threadId };
  }

  const derivedCategory = category ?? "life";
  const title = message.trim().slice(0, 60) || "新しい相談";

  const { data, error } = await supabase
    .from("michelle_sessions")
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
  return { sessionId: data.id, threadId };
};

const ensureThreadId = async (supabase: MichelleSupabase, sessionId: string, current: string | null) => {
  if (current) {
    return current;
  }

  const openai = getMichelleOpenAIClient();
  const betaThreads = (openai as OpenAIWithBeta).beta?.threads;

  if (!betaThreads) {
    throw new Error("OpenAI Assistants API is not available in the current SDK version");
  }

  const thread = await betaThreads.create();
  await supabase.from("michelle_sessions").update({ openai_thread_id: thread.id }).eq("id", sessionId);
  return thread.id;
};
