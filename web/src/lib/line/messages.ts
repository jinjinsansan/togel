import type { LineFlexMessage, LineTextMessage } from "./client";
import { liffId } from "./env";

const LIFF_DIAGNOSIS_URL = `https://liff.line.me/${liffId}`;

export function welcomeMessage(): LineFlexMessage {
  return {
    type: "flex",
    altText: "Togelへようこそ！性格診断を始めましょう",
    contents: {
      type: "bubble",
      size: "mega",
      hero: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "Togel",
            weight: "bold",
            size: "3xl",
            color: "#E91E63",
            align: "center",
          },
          {
            type: "text",
            text: "トゥゲル",
            size: "sm",
            color: "#888888",
            align: "center",
            margin: "sm",
          },
        ],
        paddingAll: "30px",
        backgroundColor: "#FFF0F5",
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "ようこそ！",
            weight: "bold",
            size: "xl",
            margin: "md",
          },
          {
            type: "text",
            text: "Togelは、あなたの性格を24タイプに分類するAI性格診断サービスです。",
            size: "sm",
            color: "#666666",
            margin: "md",
            wrap: true,
          },
          {
            type: "text",
            text: "たった5分の診断で、あなたの考え方のクセ、恋愛傾向、隠れた本性が明らかに。",
            size: "sm",
            color: "#666666",
            margin: "md",
            wrap: true,
          },
          {
            type: "separator",
            margin: "xl",
          },
          {
            type: "text",
            text: "診断後は、あなたの型に合わせた\nアドバイスをお届けします！",
            size: "sm",
            color: "#E91E63",
            margin: "lg",
            wrap: true,
            weight: "bold",
          },
        ],
        paddingAll: "20px",
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            height: "md",
            action: {
              type: "uri",
              label: "🧠 診断を始める",
              uri: LIFF_DIAGNOSIS_URL,
            },
            color: "#E91E63",
          },
        ],
        paddingAll: "15px",
      },
    },
  };
}

export function diagnosisCompleteMessage(
  togelType: string,
  typeName: string,
  emoji: string,
): LineFlexMessage {
  return {
    type: "flex",
    altText: `診断完了！あなたは${togelType}: ${typeName}です`,
    contents: {
      type: "bubble",
      size: "mega",
      hero: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: emoji,
            size: "4xl",
            align: "center",
          },
          {
            type: "text",
            text: "診断完了！",
            weight: "bold",
            size: "xl",
            color: "#E91E63",
            align: "center",
            margin: "md",
          },
        ],
        paddingAll: "30px",
        backgroundColor: "#FFF0F5",
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "あなたのTogel型",
            size: "sm",
            color: "#888888",
          },
          {
            type: "text",
            text: `${togelType}`,
            weight: "bold",
            size: "xl",
            margin: "sm",
          },
          {
            type: "text",
            text: typeName,
            weight: "bold",
            size: "lg",
            color: "#E91E63",
            margin: "sm",
          },
          {
            type: "separator",
            margin: "xl",
          },
          {
            type: "text",
            text: "これから、あなたの型に合わせたアドバイスやカウンセリングをお届けします！",
            size: "sm",
            color: "#666666",
            margin: "lg",
            wrap: true,
          },
          {
            type: "text",
            text: "いつでも話しかけてくださいね。",
            size: "sm",
            color: "#666666",
            margin: "sm",
            wrap: true,
          },
        ],
        paddingAll: "20px",
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            height: "md",
            action: {
              type: "uri",
              label: "📊 詳しい結果を見る",
              uri: `${LIFF_DIAGNOSIS_URL}/result`,
            },
            color: "#E91E63",
          },
          {
            type: "button",
            style: "link",
            height: "sm",
            action: {
              type: "message",
              label: "相談してみる",
              text: "相談したい",
            },
          },
        ],
        paddingAll: "15px",
      },
    },
  };
}

export function alreadyDiagnosedMessage(togelType: string, typeName: string): LineTextMessage {
  return {
    type: "text",
    text: `あなたは既に診断済みです！\n\n🔮 ${togelType}: ${typeName}\n\n再診断したい場合は「再診断」と送ってください。`,
  };
}

export function helpMessage(): LineTextMessage {
  return {
    type: "text",
    text: [
      "📋 使い方ガイド",
      "",
      "「診断」→ 性格診断を開始",
      "「再診断」→ もう一度診断する",
      "「結果」→ 診断結果を確認",
      "「相談したい」→ カウンセリング開始",
      "",
      "他にも、何でも気軽に話しかけてください！あなたのTogel型に合わせたアドバイスをお伝えします。",
    ].join("\n"),
  };
}
