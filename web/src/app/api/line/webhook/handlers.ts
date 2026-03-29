import { replyMessage } from "@/lib/line/client";
import {
  welcomeMessage,
  genderSelectMessage,
  diagnosisTypeSelectMessage,
  questionMessage,
  analyzingMessage,
  diagnosisResultMessages,
  alreadyDiagnosedMessage,
  helpMessage,
} from "@/lib/line/messages";
import {
  getOrCreateLineUser,
  getLineUser,
  saveConversation,
  startDiagnosis,
  saveAnswer,
  setGender,
  updateLineUserDiagnosis,
  updateConversationState,
} from "@/lib/line/db";
import { getQuestionsByType } from "@/data/questions";
import { generateDiagnosisResult } from "@/lib/matching/engine";
import type { DiagnosisType, BigFiveScores, PersonalityTypeDefinition } from "@/types/diagnosis";

// --- Text Message Handler ---

export async function handleTextMessage(
  userId: string,
  text: string,
  replyToken: string,
) {
  const normalizedText = text.trim().toLowerCase();
  const user = await getOrCreateLineUser(userId);

  if (matchCommand(normalizedText, ["診断", "しんだん", "診断する", "start"])) {
    if (user?.togel_type) {
      await replyMessage(replyToken, [
        alreadyDiagnosedMessage(user.togel_type),
      ]);
    } else {
      await replyMessage(replyToken, [genderSelectMessage()]);
    }
    return;
  }

  if (matchCommand(normalizedText, ["再診断", "もう一度", "やり直し", "retry"])) {
    if (user) {
      await updateConversationState(userId, "new");
    }
    await replyMessage(replyToken, [genderSelectMessage()]);
    return;
  }

  if (matchCommand(normalizedText, ["結果", "けっか", "マイ結果", "result"])) {
    if (user?.togel_type && user.diagnosis_result) {
      const dr = user.diagnosis_result as Record<string, unknown>;
      const pt = dr.personalityType as PersonalityTypeDefinition;
      const scores = (user.big_five_scores ?? {}) as unknown as BigFiveScores;

      await replyMessage(replyToken, diagnosisResultMessages(scores, pt));
    } else {
      await replyMessage(replyToken, [
        { type: "text", text: "まだ診断が完了していません。" },
        genderSelectMessage(),
      ]);
    }
    return;
  }

  if (matchCommand(normalizedText, ["ヘルプ", "help", "使い方", "？", "?"])) {
    await replyMessage(replyToken, [helpMessage()]);
    return;
  }

  // Default response
  if (user?.togel_type) {
    await saveConversation({ lineUserId: userId, role: "user", content: text });
    await replyMessage(replyToken, [
      {
        type: "text",
        text: `メッセージありがとうございます！\n\n${user.display_name ?? "あなた"}さん（${user.togel_type}）に合ったアドバイス機能は近日公開予定です。\n\n「ヘルプ」と送ると使い方を確認できます。`,
      },
    ]);
  } else {
    await replyMessage(replyToken, [
      { type: "text", text: "まずは性格診断をしてみましょう！" },
      genderSelectMessage(),
    ]);
  }
}

// --- Postback Handler ---

export async function handlePostback(
  userId: string,
  data: string,
  replyToken: string,
) {
  const params = new URLSearchParams(data);
  const action = params.get("action");

  switch (action) {
    case "start_diagnosis":
      await handleStartDiagnosis(userId, replyToken);
      break;

    case "select_gender":
      await handleSelectGender(userId, params.get("gender") as "male" | "female", replyToken);
      break;

    case "select_type":
      await handleSelectType(userId, params.get("type") as "light" | "full", replyToken);
      break;

    case "answer":
      await handleAnswer(
        userId,
        params.get("qid")!,
        parseInt(params.get("value")!, 10),
        replyToken,
      );
      break;

    default:
      console.log("[LINE Webhook] Unknown postback action:", action);
  }
}

// --- Postback sub-handlers ---

async function handleStartDiagnosis(userId: string, replyToken: string) {
  const user = await getOrCreateLineUser(userId);
  if (user?.togel_type) {
    await replyMessage(replyToken, [
      alreadyDiagnosedMessage(user.togel_type),
    ]);
    return;
  }
  await replyMessage(replyToken, [genderSelectMessage()]);
}

async function handleSelectGender(userId: string, gender: "male" | "female", replyToken: string) {
  if (!gender) return;
  await getOrCreateLineUser(userId);
  await setGender(userId, gender);
  await replyMessage(replyToken, [diagnosisTypeSelectMessage()]);
}

async function handleSelectType(userId: string, type: "light" | "full", replyToken: string) {
  if (!type) return;
  await getOrCreateLineUser(userId);
  await startDiagnosis(userId, type);

  const questions = getQuestionsByType(type);
  if (questions.length === 0) {
    await replyMessage(replyToken, [{ type: "text", text: "質問データの取得に失敗しました。" }]);
    return;
  }

  await replyMessage(replyToken, [
    { type: "text", text: `${type === "light" ? "ライト版（10問）" : "スタンダード版（40問）"}を開始します！\n\n直感で答えてください。` },
    questionMessage(questions[0], 0, questions.length),
  ]);
}

async function handleAnswer(
  userId: string,
  questionId: string,
  value: number,
  replyToken: string,
) {
  const user = await getLineUser(userId);
  if (!user || user.conversation_state !== "diagnosing") {
    await replyMessage(replyToken, [{ type: "text", text: "診断セッションが見つかりません。「診断」と送って最初から始めてください。" }]);
    return;
  }

  const diagnosisType = (user.diagnosis_type ?? "light") as DiagnosisType;
  const questions = getQuestionsByType(diagnosisType);
  const currentIndex = user.current_question_index ?? 0;
  const nextIndex = currentIndex + 1;

  await saveAnswer(userId, questionId, value, nextIndex);

  // More questions remaining
  if (nextIndex < questions.length) {
    await replyMessage(replyToken, [
      questionMessage(questions[nextIndex], nextIndex, questions.length),
    ]);
    return;
  }

  // All questions answered - generate diagnosis
  await replyMessage(replyToken, [analyzingMessage()]);

  try {
    const updatedUser = await getLineUser(userId);
    const answers = updatedUser?.diagnosis_answers ?? [];
    const gender = updatedUser?.gender ?? "male";

    const result = generateDiagnosisResult({
      diagnosisType,
      userGender: gender as "male" | "female",
      answers,
    });

    const pt = result.personalityType;

    await updateLineUserDiagnosis({
      lineUserId: userId,
      gender: gender as "male" | "female",
      togelType: pt.id,
      diagnosisResult: result as unknown as Record<string, unknown>,
      bigFiveScores: result.bigFiveScores as unknown as Record<string, number>,
    });

    const { pushMessage } = await import("@/lib/line/client");
    const resultMsgs = diagnosisResultMessages(result.bigFiveScores, pt);
    await pushMessage(userId, resultMsgs);
  } catch (err) {
    console.error("[LINE Diagnosis] Error generating result:", err);
    const { pushMessage } = await import("@/lib/line/client");
    await pushMessage(userId, [
      { type: "text", text: "診断結果の生成に失敗しました。「再診断」と送ってもう一度お試しください。" },
    ]);
  }
}

function matchCommand(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => text.includes(kw));
}
