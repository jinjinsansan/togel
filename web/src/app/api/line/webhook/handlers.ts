import { replyMessage } from "@/lib/line/client";
import {
  welcomeMessage,
  alreadyDiagnosedMessage,
  helpMessage,
} from "@/lib/line/messages";
import { getLineUser, saveConversation } from "@/lib/line/db";
import { liffId } from "@/lib/line/env";

const LIFF_DIAGNOSIS_URL = `https://liff.line.me/${liffId}`;

export async function handleTextMessage(
  userId: string,
  text: string,
  replyToken: string,
) {
  const normalizedText = text.trim().toLowerCase();
  const user = await getLineUser(userId);

  // Command routing
  if (matchCommand(normalizedText, ["診断", "しんだん", "診断する", "start"])) {
    await handleDiagnosisRequest(userId, user, replyToken);
    return;
  }

  if (matchCommand(normalizedText, ["再診断", "もう一度", "やり直し", "retry"])) {
    await replyMessage(replyToken, [
      {
        type: "text",
        text: "もう一度診断しましょう！下のボタンから始めてください。",
      },
      welcomeMessage(),
    ]);
    return;
  }

  if (matchCommand(normalizedText, ["結果", "けっか", "マイ結果", "result"])) {
    await handleResultRequest(userId, user, replyToken);
    return;
  }

  if (matchCommand(normalizedText, ["ヘルプ", "help", "使い方", "？", "?"])) {
    await replyMessage(replyToken, [helpMessage()]);
    return;
  }

  if (matchCommand(normalizedText, ["相談", "相談したい", "カウンセリング", "悩み"])) {
    await handleCounselingRequest(userId, user, text, replyToken);
    return;
  }

  // Default: if diagnosed, treat as conversation; otherwise prompt diagnosis
  if (user?.togel_type) {
    await handleConversation(userId, user, text, replyToken);
  } else {
    await replyMessage(replyToken, [
      {
        type: "text",
        text: "まずは性格診断をしてみましょう！診断結果をもとに、あなたに合ったアドバイスができるようになります。",
      },
      welcomeMessage(),
    ]);
  }
}

function matchCommand(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => text.includes(kw));
}

async function handleDiagnosisRequest(
  userId: string,
  user: Awaited<ReturnType<typeof getLineUser>>,
  replyToken: string,
) {
  if (user?.togel_type) {
    const typeLabel = user.togel_type;
    await replyMessage(replyToken, [
      alreadyDiagnosedMessage(typeLabel, ""),
      {
        type: "text",
        text: `再診断したい場合は「再診断」と送ってください。`,
      },
    ]);
  } else {
    await replyMessage(replyToken, [welcomeMessage()]);
  }
}

async function handleResultRequest(
  userId: string,
  user: Awaited<ReturnType<typeof getLineUser>>,
  replyToken: string,
) {
  if (!user?.togel_type) {
    await replyMessage(replyToken, [
      {
        type: "text",
        text: "まだ診断が完了していません。まずは診断を受けてみましょう！",
      },
      welcomeMessage(),
    ]);
    return;
  }

  await replyMessage(replyToken, [
    {
      type: "flex",
      altText: "診断結果を確認",
      contents: {
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: `🔮 あなたのTogel型: ${user.togel_type}`,
              weight: "bold",
              size: "lg",
              wrap: true,
            },
          ],
          paddingAll: "20px",
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "button",
              style: "primary",
              action: {
                type: "uri",
                label: "詳しい結果を見る",
                uri: `${LIFF_DIAGNOSIS_URL}/result`,
              },
              color: "#E91E63",
            },
          ],
          paddingAll: "15px",
        },
      },
    },
  ]);
}

async function handleCounselingRequest(
  userId: string,
  user: Awaited<ReturnType<typeof getLineUser>>,
  text: string,
  replyToken: string,
) {
  if (!user?.togel_type) {
    await replyMessage(replyToken, [
      {
        type: "text",
        text: "カウンセリングを始める前に、まず診断を受けてください。あなたの性格タイプを知ることで、より的確なアドバイスができます！",
      },
      welcomeMessage(),
    ]);
    return;
  }

  await saveConversation({
    lineUserId: userId,
    role: "user",
    content: text,
  });

  // Phase 3で本格的なAIカウンセリングを実装。今はプレースホルダー応答。
  await replyMessage(replyToken, [
    {
      type: "text",
      text: `${user.display_name ?? "あなた"}さん、何でも話してください。\n\nあなたの性格タイプ（${user.togel_type}）に基づいて、アドバイスさせていただきます。\n\n※ AIカウンセリング機能は近日アップデート予定です！`,
    },
  ]);
}

async function handleConversation(
  userId: string,
  user: NonNullable<Awaited<ReturnType<typeof getLineUser>>>,
  text: string,
  replyToken: string,
) {
  await saveConversation({
    lineUserId: userId,
    role: "user",
    content: text,
  });

  // Phase 3で本格的なAI会話を実装
  await replyMessage(replyToken, [
    {
      type: "text",
      text: `メッセージありがとうございます！\n\n${user.display_name ?? "あなた"}さん（${user.togel_type}）に合ったアドバイス機能は近日公開予定です。\n\n「ヘルプ」と送ると使い方を確認できます。`,
    },
  ]);
}
