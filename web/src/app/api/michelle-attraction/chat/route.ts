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
  upsertProgressRecord,
  updateEmotionSnapshot,
} from "@/lib/michelle-attraction/progress-server";
import { formatSectionLabel, getNextSection, getPreviousSection } from "@/lib/michelle-attraction/sections";

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

const NEXT_SECTION_KEYWORDS = [
  "次に進みましょう",
  "次に進みます",
  "次へ進みましょう",
  "次へ進みます",
  "先に進みましょう",
  "このまま次に進みます",
  "次のセクションに進みます",
  "次のセクションへ進みましょう",
  "次のステップに進みます",
  "次章に進みます",
];

const PREVIOUS_SECTION_KEYWORDS = [
  "1つ戻りましょう",
  "1つ戻ります",
  "ひとつ戻りましょう",
  "ひとつ戻ります",
  "前のセクションに戻ります",
  "前のステップに戻りましょう",
  "復習のために戻ります",
  "一旦戻りましょう",
  "いったん戻ります",
  "前に戻りましょう",
];

const NEXT_SECTION_REGEXES = [
  /次(?:の|へ)?(?:セクション|章|レッスン|ステップ)?に?進み(?:ましょう|ます|ましょ|ましょうね|ますね|たい)/iu,
  /続いて(?:[^。！？\n]*)(?:セクション|章|レッスン|ステップ)[^。！？\n]*(?:進め|進みましょう|進んで)/iu,
];

const PREVIOUS_SECTION_REGEXES = [
  /前(?:の|へ)?(?:セクション|章|レッスン|ステップ)?に戻(?:りましょう|ります|って)/iu,
  /復習(?:のため)?に戻(?:りましょう|ります|って)/iu,
  /一旦戻(?:りましょう|ります|って)/iu,
];

const MAX_EMOTION_HISTORY = 4;

const USER_NEXT_SECTION_KEYWORDS = [
  "次に進みます",
  "次へ進む",
  "先に進む",
  "次をお願いします",
  "次お願いします",
  "次へ",
  "次お願いします",
  "次のセクション",
  "次のステップ",
  "次へ行きたい",
];

const USER_NEXT_SECTION_REGEXES = [
  /次(?:の|へ)?(?:セクション|章|ステップ)?に?進んで/iu,
  /次(?:の|へ)?(?:セクション|章|ステップ)?を?お願い/iu,
  /(?:このまま|それでは)?次(?:へ|に)/iu,
];

const USER_BACK_SECTION_REGEXES = [
  /戻(?:りたい|ります|って|ろう)/iu,
  /前(?:の|へ)?(?:セクション|章|ステップ)/iu,
  /復習したい/iu,
];

const USER_DETAIL_KEYWORDS = [
  "詳しく",
  "もっと",
  "深く",
  "詳細",
  "教えて",
  "知りたい",
  "解説",
  "説明",
  "噛み砕いて",
];

type ProgressIntent = "next" | "back" | "deeper" | "neutral";

const determineUserProgressIntent = (message: string): ProgressIntent => {
  const normalized = message.replace(/[\s\n\r]+/g, "").toLowerCase();
  if (USER_BACK_SECTION_REGEXES.some((regex) => regex.test(message))) {
    return "back";
  }
  if (
    USER_NEXT_SECTION_KEYWORDS.some((keyword) => normalized.includes(keyword.toLowerCase())) ||
    USER_NEXT_SECTION_REGEXES.some((regex) => regex.test(message))
  ) {
    return "next";
  }
  if (USER_DETAIL_KEYWORDS.some((keyword) => message.includes(keyword))) {
    return "deeper";
  }
  return "neutral";
};

const buildProgressIntentInstruction = (intent: ProgressIntent, progressRecord: ProgressRecord | null) => {
  if (!progressRecord) return "";
  const sectionLabel = formatSectionLabel(progressRecord.current_level, progressRecord.current_section);

  if (intent === "next") {
    return `【進行リクエスト】
ユーザーは「次に進みたい」と表明しました。現在の${sectionLabel}を手短にまとめたうえで、「次に進みましょう」というフレーズを含めて次のセクション名と狙いを宣言してから移動してください。`;
  }

  if (intent === "back") {
    return `【進行リクエスト】
ユーザーは1つ前を復習したい意向です。「1つ戻って復習しましょう」というフレーズを用い、前のセクション内容を優先してください。`;
  }

  if (intent === "deeper") {
    return `【進行リクエスト】
ユーザーは${sectionLabel}をさらに深掘りしたいだけで、次へ進むとは明言していません。次セクションの内容は紹介せず、現在のセクションを噛み砕いて解説してください。`; 
  }

  return `【進行リクエスト】
ユーザーから「次に進む」指示はありません。現在の${sectionLabel}を継続し、こちらから先走って次のセクションを提示しないでください。`;
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
      ? `【初回オンボーディング指示】\nこの会話は新しいミシェル引き寄せ講座セッションの初回です。以下の手順を厳守して最初の返信を作成してください。\n1. 温かく挨拶し、講座の概要を1〜2文で伝える。\n2. ユーザーが初めてか/継続かを尋ねる。継続の場合は「こちらで進捗を自動復元しています」と伝え、コード入力などは絶対に求めないこと。\n3. 進捗が自動復元できない場合のみ診断質問Q1〜Q3を順に行い、開始レベル/セクションを決定する。\n4. 決定したセクションを明示し、【導入→本編→理解度チェック→次の準備】の流れで丁寧に進める。\n5. セクション完了ごとに「進捗は自動保存されました」と伝え、ユーザーに記録作業を依頼しない。\n6. 次のセクションに進める際は文章内で必ず「次に進みましょう」を使い、1つ戻して復習する場合は「1つ戻って復習しましょう」と明示する。\n7. いかなる場合も「進捗コード」「コードを発行/入力」等の表現は使用しないこと。\nこの直後に続くユーザーメッセージに必ず上記フローを適用して返信文を構築すること。\n\n【ユーザーメッセージ】\n${message}`
      : `【継続セッション指示】
ユーザーの進捗と感情状態は自動的に保存・復元されています。コード入力を求めたり、進捗コードという言葉を使用せず、現在のコンテキストを前提に会話を続けてください。次のセクションに進める際は文章内で必ず「次に進みましょう」を使い、1つ戻して復習する場合は「1つ戻って復習しましょう」と明示する。

【ユーザーメッセージ】
${message}`

    let progressContext = "";
    let psychologyInstruction = "";
    let negativityAlertInstruction = "";
    let progressIntentInstruction = "";
    let latestProgressRecord: ProgressRecord | null = null;
    try {
      let progressRecord = await fetchProgressBySession(supabase, user.id, sessionId);
      if (!progressRecord) {
        await ensureProgressRecord(supabase, user.id, sessionId);
        progressRecord = await fetchProgressBySession(supabase, user.id, sessionId);
      }

      if (progressRecord) {
        const emotionInput = await buildEmotionEvaluationInput(supabase, sessionId, message);
        const emotionAnalysis = evaluateEmotionState(emotionInput, { latestUtterance: message });
        progressRecord = await updateEmotionSnapshot(supabase, {
          authUserId: user.id,
          sessionId,
          emotion: emotionAnalysis,
        });

        let recommendationTriggered = false;
        if (emotionAnalysis.state !== "stable") {
          const severityLabel = emotionAnalysis.state === "critical" ? "緊急" : "注意";
          negativityAlertInstruction = `【感情アラート指示】
ユーザーの感情スコアは${severityLabel}レベル（${emotionAnalysis.score}）です。感情が荒れたままでは引き寄せの結果も乱れるため、「まずは心を整えてから引き寄せを進めましょう」と明示してください。根性論ではなく呼吸や心理学チャットを案内し、焦らずに整えるよう寄り添ってください。`;

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

        const userProgressIntent = determineUserProgressIntent(message);
        progressIntentInstruction = buildProgressIntentInstruction(userProgressIntent, progressRecord);
        psychologyInstruction = buildPsychologyGuidance(progressRecord, recommendationTriggered);
        latestProgressRecord = progressRecord;
      }
    } catch (progressError) {
      console.error("Michelle attraction progress context error", progressError);
    }

    const userPayload = [onboardingPrimer];
    if (negativityAlertInstruction) {
      userPayload.push(negativityAlertInstruction);
    }
    if (psychologyInstruction) {
      userPayload.push(psychologyInstruction);
    }
    if (progressIntentInstruction) {
      userPayload.push(progressIntentInstruction);
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
              if (latestProgressRecord) {
                try {
                  await handleAutoProgressUpdate(fullReply, latestProgressRecord, {
                    supabase,
                    authUserId: user.id,
                    sessionId,
                  });
                } catch (autoProgressError) {
                  console.error("Auto progress update error", autoProgressError);
                }
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

const buildEmotionEvaluationInput = async (
  supabase: AttractionSupabase,
  sessionId: string,
  latestMessage: string,
) => {
  try {
    const { data, error } = await supabase
      .from("michelle_attraction_messages")
      .select("content, role")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(12);

    if (error) {
      throw error;
    }

    const previousUserTurns = (data ?? [])
      .filter((entry) => entry.role === "user" && typeof entry.content === "string")
      .slice(0, MAX_EMOTION_HISTORY - 1)
      .map((entry) => (entry.content ?? "").trim())
      .filter(Boolean)
      .reverse();

    const segments = previousUserTurns.map((text, index) => `【これまで${index + 1}】${text}`);
    segments.push(`【最新】${latestMessage}`);

    return segments.join("\n\n");
  } catch (error) {
    console.error("Michelle attraction emotion history fetch error", error);
    return latestMessage;
  }
};

const buildPsychologyGuidance = (record: ProgressRecord, newlyTriggered: boolean) => {
  if (record.psychology_recommendation === "acknowledged") {
    return `【心理学優先指示】
ユーザーは現在ネガティブな感情のケアを優先するためにミシェル心理学へ移行しようとしています。感情が乱れたままでは引き寄せの結果がブレることを明示し、カリキュラムを一時停止して感情解放を最優先にするよう丁寧に案内してください。もしユーザーがどうしても続けたいと希望した場合のみ、セルフケアの注意事項を添えて進行してください。`;
  }

  if (record.psychology_recommendation === "suggested" || newlyTriggered) {
    return `【心理学推奨指示】
ネガティブ感情の強まりが検知されています。感情が荒れている状態では引き寄せがうまく働かないことを必ず伝え、ミシェル心理学で思い込み・感情ブロックを解放すると再び整う旨を案内してください。「今すぐ心理学に移って整える」か「今回はこのままカリキュラムを進めるか」をユーザー自身に選んでもらいましょう。`;
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

const handleAutoProgressUpdate = async (
  responseText: string,
  progressRecord: ProgressRecord,
  params: { supabase: AttractionSupabase; authUserId: string; sessionId: string },
) => {
  const action = detectProgressAction(responseText);
  if (!action) return;

  if (action === "next") {
    const nextSection = getNextSection(progressRecord.current_section);
    if (!nextSection) return;
    await upsertProgressRecord(params.supabase, {
      authUserId: params.authUserId,
      sessionId: params.sessionId,
      level: nextSection.level,
      section: nextSection.section,
      status: "IP",
    });
    return;
  }

  if (action === "back") {
    const previousSection = getPreviousSection(progressRecord.current_section);
    if (!previousSection) return;
    await upsertProgressRecord(params.supabase, {
      authUserId: params.authUserId,
      sessionId: params.sessionId,
      level: previousSection.level,
      section: previousSection.section,
      status: "RV",
    });
  }
};

const detectProgressAction = (responseText: string): "next" | "back" | null => {
  const normalized = responseText.replace(/\s+/g, "");
  if (
    NEXT_SECTION_KEYWORDS.some((keyword) => normalized.includes(keyword)) ||
    NEXT_SECTION_REGEXES.some((regex) => regex.test(responseText))
  ) {
    return "next";
  }

  if (
    PREVIOUS_SECTION_KEYWORDS.some((keyword) => normalized.includes(keyword)) ||
    PREVIOUS_SECTION_REGEXES.some((regex) => regex.test(responseText))
  ) {
    return "back";
  }

  return null;
};
