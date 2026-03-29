import type { LineFlexMessage, LineTextMessage, LineMessage } from "./client";
import type { DiagnosisQuestion } from "@/types/diagnosis";

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
            text: "Togelは、あなたの性格を24タイプに分類するAI性格診断です。",
            size: "sm",
            color: "#666666",
            margin: "md",
            wrap: true,
          },
          {
            type: "text",
            text: "このLINEチャットだけで診断が完結します。質問にタップで答えるだけ！",
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
              type: "postback",
              label: "診断を始める",
              data: "action=start_diagnosis",
              displayText: "診断を始める！",
            },
            color: "#E91E63",
          },
        ],
        paddingAll: "15px",
      },
    },
  };
}

export function genderSelectMessage(): LineMessage {
  return {
    type: "text",
    text: "まず、あなたの性別を教えてください。",
    // @ts-expect-error LINE quickReply is valid but not in our minimal type
    quickReply: {
      items: [
        {
          type: "action",
          action: {
            type: "postback",
            label: "👨 男性",
            data: "action=select_gender&gender=male",
            displayText: "男性",
          },
        },
        {
          type: "action",
          action: {
            type: "postback",
            label: "👩 女性",
            data: "action=select_gender&gender=female",
            displayText: "女性",
          },
        },
      ],
    },
  };
}

export function diagnosisTypeSelectMessage(): LineMessage {
  return {
    type: "text",
    text: "診断タイプを選んでください。",
    // @ts-expect-error LINE quickReply is valid but not in our minimal type
    quickReply: {
      items: [
        {
          type: "action",
          action: {
            type: "postback",
            label: "ライト版（10問・3分）",
            data: "action=select_type&type=light",
            displayText: "ライト版で診断する",
          },
        },
        {
          type: "action",
          action: {
            type: "postback",
            label: "スタンダード版（40問・8分）",
            data: "action=select_type&type=full",
            displayText: "スタンダード版で診断する",
          },
        },
      ],
    },
  };
}

export function questionMessage(
  question: DiagnosisQuestion,
  current: number,
  total: number,
): LineMessage {
  const progressBar = buildProgressBar(current, total);

  return {
    type: "text",
    text: `${progressBar}\nQ${current + 1}/${total}\n\n${question.text}`,
    // @ts-expect-error LINE quickReply is valid but not in our minimal type
    quickReply: {
      items: question.options.map((opt) => ({
        type: "action",
        action: {
          type: "postback",
          label: opt.label,
          data: `action=answer&qid=${question.id}&value=${opt.value}`,
          displayText: opt.label,
        },
      })),
    },
  };
}

function buildProgressBar(current: number, total: number): string {
  const filled = Math.round((current / total) * 10);
  const empty = 10 - filled;
  return "▓".repeat(filled) + "░".repeat(empty) + ` ${Math.round((current / total) * 100)}%`;
}

export function analyzingMessage(): LineTextMessage {
  return {
    type: "text",
    text: "全問回答ありがとうございます！\n\nAIがあなたの性格を分析中です...",
  };
}

export function diagnosisResultMessage(
  togelTypeId: string,
  typeName: string,
  emoji: string,
  catchphrase: string,
  bigFiveScores: Record<string, number>,
  strengths: string[],
  growthAreas: string[],
  communication: string,
  relationships: string,
): LineFlexMessage {
  const traitLabels: Record<string, string> = {
    openness: "開放性",
    conscientiousness: "誠実性",
    extraversion: "外向性",
    agreeableness: "協調性",
    neuroticism: "神経症傾向",
  };

  const scoreContents = Object.entries(bigFiveScores).map(([trait, score]) => ({
    type: "box",
    layout: "horizontal",
    contents: [
      {
        type: "text",
        text: traitLabels[trait] ?? trait,
        size: "xs",
        color: "#666666",
        flex: 3,
      },
      {
        type: "text",
        text: `${"●".repeat(Math.round(score))}${"○".repeat(5 - Math.round(score))} ${score.toFixed(1)}`,
        size: "xs",
        color: "#E91E63",
        flex: 5,
        align: "end",
      },
    ],
    margin: "sm",
  }));

  return {
    type: "flex",
    altText: `診断結果: ${togelTypeId} ${typeName}`,
    contents: {
      type: "bubble",
      size: "mega",
      hero: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: emoji, size: "4xl", align: "center" },
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
        paddingAll: "25px",
        backgroundColor: "#FFF0F5",
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "あなたのTogel型", size: "xs", color: "#888888" },
          { type: "text", text: togelTypeId, weight: "bold", size: "xl", margin: "sm" },
          { type: "text", text: typeName, weight: "bold", size: "lg", color: "#E91E63", margin: "xs" },
          { type: "text", text: catchphrase, size: "sm", color: "#666666", margin: "md", wrap: true },
          { type: "separator", margin: "xl" },
          { type: "text", text: "Big Fiveスコア", size: "sm", weight: "bold", margin: "lg" },
          ...scoreContents,
          { type: "separator", margin: "xl" },
          { type: "text", text: "強み", size: "sm", weight: "bold", color: "#16a34a", margin: "lg" },
          ...strengths.slice(0, 3).map((s) => ({
            type: "text",
            text: `✓ ${s}`,
            size: "xs",
            color: "#666666",
            wrap: true,
            margin: "sm",
          })),
          { type: "text", text: "成長ポイント", size: "sm", weight: "bold", color: "#d97706", margin: "lg" },
          ...growthAreas.slice(0, 3).map((s) => ({
            type: "text",
            text: `! ${s}`,
            size: "xs",
            color: "#666666",
            wrap: true,
            margin: "sm",
          })),
          { type: "separator", margin: "xl" },
          { type: "text", text: "コミュニケーション", size: "sm", weight: "bold", color: "#2563eb", margin: "lg" },
          { type: "text", text: communication, size: "xs", color: "#666666", wrap: true, margin: "sm" },
          { type: "text", text: "恋愛傾向", size: "sm", weight: "bold", color: "#9333ea", margin: "lg" },
          { type: "text", text: relationships, size: "xs", color: "#666666", wrap: true, margin: "sm" },
        ],
        paddingAll: "20px",
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "text",
            text: "これから、あなたの型に合わせたアドバイスをお届けします！いつでも話しかけてくださいね。",
            size: "xs",
            color: "#888888",
            wrap: true,
            align: "center",
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
      "他にも、何でも気軽に話しかけてください！",
    ].join("\n"),
  };
}
