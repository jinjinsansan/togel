export type EmotionState = "stable" | "concern" | "critical";

export type EmotionAnalysis = {
  score: number;
  state: EmotionState;
  reasons: string[];
};

const CRITICAL_KEYWORDS = [
  "死にたい",
  "消えたい",
  "いなくなりたい",
  "無価値",
  "最悪",
  "壊れ",
  "どうでもいい",
  "終わり",
  "耐えられない",
  "絶望",
  "もう無理",
  "恐怖",
];

const CONCERN_KEYWORDS = [
  "不安",
  "怖い",
  "悲しい",
  "つらい",
  "辛い",
  "怒り",
  "怒って",
  "混乱",
  "迷い",
  "焦り",
  "心配",
  "落ち込",
  "泣きたい",
  "憂鬱",
  "嫌",
];

const POSITIVE_ANCHORS = [
  "大丈夫",
  "感謝",
  "安心",
  "嬉しい",
  "助かる",
  "前向き",
  "落ち着いて",
  "楽",
  "穏やか",
];

const normalizeText = (input: string) => input.toLowerCase();

export const evaluateEmotionState = (input: string): EmotionAnalysis => {
  const text = normalizeText(input);
  let score = 0;
  const reasons: string[] = [];

  CRITICAL_KEYWORDS.forEach((keyword) => {
    if (text.includes(keyword)) {
      score += 4;
      reasons.push(`「${keyword}」という強い表現`);
    }
  });

  CONCERN_KEYWORDS.forEach((keyword) => {
    if (text.includes(keyword)) {
      score += 2;
      reasons.push(`「${keyword}」というネガティブ感情`);
    }
  });

  POSITIVE_ANCHORS.forEach((keyword) => {
    if (text.includes(keyword)) {
      score -= 1;
    }
  });

  if (/!{2,}/.test(text)) {
    score += 1;
    reasons.push("強い感情表現（!）");
  }

  if (text.length > 600) {
    score += 1;
    reasons.push("長文で感情が滞留");
  }

  if (/疲(れた|弊)い/.test(text)) {
    score += 1;
    reasons.push("極度の疲弊表現");
  }

  let state: EmotionState = "stable";

  if (score >= 8) {
    state = "critical";
  } else if (score >= 4) {
    state = "concern";
  }

  return {
    score,
    state,
    reasons,
  };
};
