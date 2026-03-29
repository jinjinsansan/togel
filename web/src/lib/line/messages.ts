import type { LineFlexMessage, LineMessage, LineTextMessage } from "./client";
import type { DiagnosisQuestion, BigFiveScores, PersonalityTypeDefinition } from "@/types/diagnosis";
import { generatePersonalityNarrative } from "@/lib/personality/narrative";
import { getTogelLabel } from "@/lib/personality";

const TRAIT_LABELS: Record<string, string> = {
  openness: "アイデア感度",
  conscientiousness: "計画遂行力",
  extraversion: "交流エネルギー",
  agreeableness: "共感スタイル",
  neuroticism: "ストレス耐性",
};

// --- Welcome ---

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
          { type: "text", text: "Togel", weight: "bold", size: "3xl", color: "#E91E63", align: "center" },
          { type: "text", text: "トゥゲル", size: "sm", color: "#888888", align: "center", margin: "sm" },
        ],
        paddingAll: "30px",
        backgroundColor: "#FFF0F5",
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "ようこそ！", weight: "bold", size: "xl", margin: "md" },
          { type: "text", text: "Togelは、あなたの性格を24タイプに分類するAI性格診断です。", size: "sm", color: "#666666", margin: "md", wrap: true },
          { type: "text", text: "このLINEチャットだけで診断が完結します。質問にタップで答えるだけ！", size: "sm", color: "#666666", margin: "md", wrap: true },
          { type: "separator", margin: "xl" },
          { type: "text", text: "診断後は、あなたの型に合わせた\nアドバイスをお届けします！", size: "sm", color: "#E91E63", margin: "lg", wrap: true, weight: "bold" },
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
            action: { type: "postback", label: "診断を始める", data: "action=start_diagnosis", displayText: "診断を始める！" },
            color: "#E91E63",
          },
        ],
        paddingAll: "15px",
      },
    },
  };
}

// --- Diagnosis Flow ---

export function genderSelectMessage(): LineMessage {
  return {
    type: "text",
    text: "まず、あなたの性別を教えてください。",
    // @ts-expect-error LINE quickReply
    quickReply: {
      items: [
        { type: "action", action: { type: "postback", label: "👨 男性", data: "action=select_gender&gender=male", displayText: "男性" } },
        { type: "action", action: { type: "postback", label: "👩 女性", data: "action=select_gender&gender=female", displayText: "女性" } },
      ],
    },
  };
}

export function diagnosisTypeSelectMessage(): LineMessage {
  return {
    type: "text",
    text: "診断タイプを選んでください。",
    // @ts-expect-error LINE quickReply
    quickReply: {
      items: [
        { type: "action", action: { type: "postback", label: "ライト版（10問・3分）", data: "action=select_type&type=light", displayText: "ライト版で診断する" } },
        { type: "action", action: { type: "postback", label: "スタンダード版（40問・8分）", data: "action=select_type&type=full", displayText: "スタンダード版で診断する" } },
      ],
    },
  };
}

export function questionMessage(question: DiagnosisQuestion, current: number, total: number): LineMessage {
  const filled = Math.round((current / total) * 10);
  const empty = 10 - filled;
  const bar = "▓".repeat(filled) + "░".repeat(empty) + ` ${Math.round((current / total) * 100)}%`;

  return {
    type: "text",
    text: `${bar}\nQ${current + 1}/${total}\n\n${question.text}`,
    // @ts-expect-error LINE quickReply
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

export function analyzingMessage(): LineTextMessage {
  return { type: "text", text: "全問回答ありがとうございます！\n\nAIがあなたの性格を分析中です..." };
}

// --- Diagnosis Result (Web App style) ---

export function diagnosisResultMessages(
  scores: BigFiveScores,
  personalityType: PersonalityTypeDefinition,
): LineFlexMessage[] {
  const narrative = generatePersonalityNarrative(scores, personalityType);
  const label = getTogelLabel(personalityType.id);

  // Bubble 1: Header + あなたってこんな人
  const bubble1 = {
    type: "bubble",
    size: "mega",
    hero: {
      type: "box",
      layout: "vertical",
      contents: [
        { type: "text", text: personalityType.emoji, size: "4xl", align: "center" },
        { type: "text", text: "あなたの性格診断結果", size: "xs", color: "#888888", align: "center", margin: "md" },
        { type: "text", text: label, weight: "bold", size: "xl", align: "center", margin: "sm" },
        { type: "text", text: personalityType.typeName, weight: "bold", size: "lg", color: "#E91E63", align: "center", margin: "xs" },
      ],
      paddingAll: "25px",
      backgroundColor: "#FFF0F5",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        { type: "text", text: "🎯 あなたってこんな人", weight: "bold", size: "md", margin: "md" },
        { type: "text", text: "💡 考え方のクセ", weight: "bold", size: "sm", color: "#E91E63", margin: "lg" },
        ...narrative.thinkingStyle.map((t) => ({
          type: "text", text: `• ${t}`, size: "sm", color: "#444444", wrap: true, margin: "sm",
        })),
        { type: "text", text: "💬 コミュニケーションスタイル", weight: "bold", size: "sm", color: "#E91E63", margin: "lg" },
        ...narrative.communicationStyle.map((t) => ({
          type: "text", text: `• ${t}`, size: "sm", color: "#444444", wrap: true, margin: "sm",
        })),
      ],
      paddingAll: "20px",
    },
  };

  // Bubble 2: 得意技 + 恋愛傾向
  const bubble2 = {
    type: "bubble",
    size: "mega",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        { type: "text", text: "⚡ あなたの得意技", weight: "bold", size: "md", margin: "md" },
        ...narrative.strengths.slice(0, 4).map((s) => ({
          type: "text", text: `✓ ${s}`, size: "sm", color: "#16a34a", wrap: true, margin: "sm",
        })),
        { type: "separator", margin: "xl" },
        { type: "text", text: "💑 恋愛になるとこうなる", weight: "bold", size: "md", margin: "lg" },
        ...narrative.loveTendency.map((t) => ({
          type: "text", text: `• ${t}`, size: "sm", color: "#444444", wrap: true, margin: "sm",
        })),
        { type: "separator", margin: "xl" },
        { type: "text", text: "💕 求めてるのはこんな相手", weight: "bold", size: "sm", color: "#E91E63", margin: "lg" },
        ...narrative.idealPartner.map((t) => ({
          type: "text", text: `→ ${t}`, size: "sm", color: "#444444", wrap: true, margin: "sm",
        })),
      ],
      paddingAll: "20px",
    },
  };

  // Bubble 3: 注意ポイント + 詳細スコア
  const scoreContents = Object.entries(scores).map(([trait, score]) => ({
    type: "box",
    layout: "horizontal",
    contents: [
      { type: "text", text: TRAIT_LABELS[trait] ?? trait, size: "sm", color: "#444444", flex: 4 },
      {
        type: "text",
        text: `${"●".repeat(Math.round(score as number))}${"○".repeat(5 - Math.round(score as number))} ${(score as number).toFixed(1)}`,
        size: "sm", color: "#E91E63", flex: 5, align: "end",
      },
    ],
    margin: "md",
  }));

  const bubble3 = {
    type: "bubble",
    size: "mega",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        { type: "text", text: "⚠️ 要注意ポイント", weight: "bold", size: "md", margin: "md" },
        ...narrative.warnings.map((w) => ({
          type: "text", text: w, size: "sm", color: "#dc2626", wrap: true, margin: "sm",
        })),
        { type: "separator", margin: "xl" },
        { type: "text", text: "📊 詳細スコア", weight: "bold", size: "md", margin: "lg" },
        ...scoreContents,
        { type: "separator", margin: "xl" },
        { type: "text", text: "これから、あなたの型に合わせたアドバイスをお届けします！いつでも話しかけてくださいね。", size: "xs", color: "#888888", wrap: true, margin: "lg", align: "center" },
      ],
      paddingAll: "20px",
    },
  };

  return [
    {
      type: "flex",
      altText: `診断結果: ${label} ${personalityType.typeName}`,
      contents: {
        type: "carousel",
        contents: [bubble1, bubble2, bubble3],
      },
    },
  ];
}

// --- Utilities ---

export function alreadyDiagnosedMessage(togelType: string): LineTextMessage {
  const label = getTogelLabel(togelType);
  return {
    type: "text",
    text: `あなたは既に診断済みです！\n\n🔮 ${label}\n\n再診断したい場合は「再診断」と送ってください。\n「結果」と送ると診断結果を再表示できます。`,
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
