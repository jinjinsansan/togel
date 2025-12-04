import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type OpenAI from "openai";
import { z } from "zod";

import { MICHELLE_ATTRACTION_AI_ENABLED } from "@/lib/feature-flags";
import { getMichelleAttractionAssistantId, getMichelleAttractionOpenAIClient } from "@/lib/michelle-attraction/openai";
import { retrieveAttractionKnowledgeMatches } from "@/lib/michelle-attraction/rag";
import { evaluateEmotionState } from "@/lib/michelle-attraction/emotion";
import {
  ensureProgressRecord,
  fetchProgressBySession,
  fetchProgressNotes,
  setPsychologyRecommendationState,
  shouldThrottleRecommendation,
  type AttractionSupabase,
  type ProgressRecord,
  type PsychologyRecommendationState,
  updateEmotionSnapshot,
} from "@/lib/michelle-attraction/progress-server";
import { formatSectionLabel } from "@/lib/michelle-attraction/sections";

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

const EMOTIONAL_STATE_LABELS: Record<ProgressRecord["emotional_state"], string> = {
  stable: "穏やか",
  concern: "注意",
  critical: "緊急",
};

const RECOMMENDATION_LABELS: Record<PsychologyRecommendationState, string> = {
  none: "通常学習",
  suggested: "心理学推奨中",
  acknowledged: "心理学ケアへ移行",
  dismissed: "提案を保留",
  resolved: "心理学ケア完了",
};

const formatRecommendationLabel = (state: PsychologyRecommendationState) => {
  if (state === "none") return "";
  return RECOMMENDATION_LABELS[state] ?? "";
};

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

    let progressContext = "";
    let psychologyInstruction = "";
    try {
      let progressRecord = await fetchProgressBySession(supabase, user.id, sessionId);
      if (!progressRecord) {
        await ensureProgressRecord(supabase, user.id, sessionId);
        progressRecord = await fetchProgressBySession(supabase, user.id, sessionId);
      }

      if (progressRecord) {
        const emotionAnalysis = evaluateEmotionState(message);
        progressRecord = await updateEmotionSnapshot(supabase, {
          authUserId: user.id,
          sessionId,
          emotion: emotionAnalysis,
        });

        let recommendationTriggered = false;
        if (emotionAnalysis.state !== "stable") {
          const throttled = shouldThrottleRecommendation(progressRecord);
          const existingState = progressRecord.psychology_recommendation;
          const canRecommend =
            emotionAnalysis.state === "critical" ||
            (!throttled && existingState !== "acknowledged" && existingState !== "suggested");

          if (canRecommend) {
            const reason =
              progressRecord.psychology_recommendation_reason ??
              (emotionAnalysis.reasons.slice(0, 2).join(" / ") || "感情の揺らぎ");
            progressRecord = await setPsychologyRecommendationState(supabase, {
              authUserId: user.id,
              sessionId,
              state: "suggested",
              reason,
            });
            recommendationTriggered = true;
          }
        } else if (
          progressRecord.psychology_recommendation !== "none" &&
          progressRecord.psychology_recommendation !== "acknowledged"
        ) {
          progressRecord = await setPsychologyRecommendationState(supabase, {
            authUserId: user.id,
            sessionId,
            state: "resolved",
          });
        }

        const latestNotes = await fetchProgressNotes(supabase, progressRecord.id, 3);
        const sectionLabel = formatSectionLabel(progressRecord.current_level, progressRecord.current_section);
        const lines = [
          `現在の進捗: ${sectionLabel}`,
          `ステータス: ${progressRecord.progress_status}`,
          `感情状態: ${EMOTIONAL_STATE_LABELS[progressRecord.emotional_state]} (score ${progressRecord.emotional_score})`,
        ];
        if (progressRecord.notes) {
          lines.push(`メモ: ${progressRecord.notes}`);
        }
        const recommendationLabel = formatRecommendationLabel(progressRecord.psychology_recommendation);
        if (recommendationLabel) {
          const reason = progressRecord.psychology_recommendation_reason
            ? ` / ${progressRecord.psychology_recommendation_reason}`
            : "";
          lines.push(`心理学推奨状態: ${recommendationLabel}${reason}`);
        }
        if (latestNotes.length) {
          lines.push(
            `直近の振り返り:\n${latestNotes
              .map((note) => `- [${note.note_type}] ${note.content}`)
              .join("\n")}`,
          );
        }
        progressContext = `【進捗コンテキスト】\n${lines.join("\n")}`;

        psychologyInstruction = buildPsychologyGuidance(progressRecord, recommendationTriggered);
      }
    } catch (progressError) {
      console.error("Michelle attraction progress context error", progressError);
    }

    const userPayload = [onboardingPrimer];
    if (psychologyInstruction) {
      userPayload.push(psychologyInstruction);
    }
    if (progressContext) {
      userPayload.push(progressContext);
    }
    const userMessageWithContext = userPayload.join("\n\n");

    const finalMessage =
      knowledgeMatches.length > 0
        ? `【ユーザーメッセージ】\n${userMessageWithContext}\n\n---\n内部参考情報（ユーザーには見せないこと）：\n以下のミシェル引き寄せ知識を参考にして回答を構築してください。\n${knowledgeContext}`
        : userMessageWithContext;

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

const buildPsychologyGuidance = (record: ProgressRecord, newlyTriggered: boolean) => {
  if (record.psychology_recommendation === "acknowledged") {
    return `【心理学優先指示】
ユーザーは現在ネガティブな感情のケアを優先するためにミシェル心理学へ移行しようとしています。引き寄せカリキュラムを一時停止し、感情解放を優先するよう丁寧に案内してください。もしユーザーがどうしても続けたいと希望した場合のみ、セルフケアの注意事項を添えて進行してください。`;
  }

  if (record.psychology_recommendation === "suggested" || newlyTriggered) {
    return `【心理学推奨指示】
ネガティブ感情の強まりが検知されています。ミシェル心理学で思い込み・感情ブロックを解放すると引き寄せがスムーズになる旨を必ず伝え、「今すぐ心理学に移って整える」か「今回はこのままカリキュラムを進めるか」をユーザー自身に選んでもらってください。`;
  }

  if (record.psychology_recommendation === "dismissed") {
    return `【心理学推奨保留指示】
ユーザーは前回の心理学推奨を見送りました。無理に誘導はせず、必要になったらいつでも心理学チャットで感情を整えられることを一言添えてください。`;
  }

  if (record.psychology_recommendation === "resolved") {
    return `【心理学連携報告】
直近で心理学ケアが完了した状態です。感情が整ったことを労い、必要であれば再度心理学を活用できる旨を軽く触れてからカリキュラムを再開してください。`;
  }

  return "";
};
