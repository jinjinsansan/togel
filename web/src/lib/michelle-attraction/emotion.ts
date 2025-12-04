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
  "生きたくない",
  "無価値",
  "最悪",
  "壊れ",
  "どうでもいい",
  "耐えられない",
  "絶望",
  "もう無理",
  "限界",
  "気力がない",
  "価値がない",
  "疲弊",
  "詰んだ",
  "詰み",
  "無理ゲー",
  "心が折れた",
];

const CRITICAL_REGEX: { pattern: RegExp; reason: string }[] = [
  { pattern: /死に(た|て|たい)/, reason: "強い自己否定" },
  { pattern: /消え(た|たい)/, reason: "存在を消したいという表現" },
  { pattern: /生き(て|る)意味がない/, reason: "生きる意味の喪失" },
  { pattern: /(人生|全部).*(終わった|終わり)/, reason: "人生の終焉を示す表現" },
  { pattern: /(終わり|終わら)たい/, reason: "終わらせたいという危険な願望" },
  {
    pattern: /(もう|本当|ほんと|マジ|完全に)[^。！？!?\n\r]{0,12}終わり(だ|です(?!か)|たい)/,
    reason: "自己の終焉宣言",
  },
];

const CONCERN_KEYWORDS = [
  "不安",
  "怖い",
  "恐い",
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
  "しんど",
  "やばい",
  "苦しい",
  "重い",
  "孤独",
  "寂し",
  "眠れない",
  "寝れない",
  "虚無",
  "ストレス",
  "疲れた",
  "疲れすぎ",
  "心がざわつく",
  "メンタル",
];

const CONCERN_REGEX: { pattern: RegExp; reason: string }[] = [
  { pattern: /(心|メンタル).*(折れ|崩れ|やば)/, reason: "心が折れたという表現" },
  { pattern: /(気持ち|心).*(重い|痛い|疲れ)/, reason: "心理的な痛みの表現" },
  { pattern: /(眠れ|寝れ)ない/, reason: "不眠の訴え" },
  { pattern: /(息|呼吸).*(苦しい|しにくい)/, reason: "呼吸のしづらさ" },
  { pattern: /(食欲|ごはん).*(ない|減)/, reason: "食欲不振の表現" },
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
  "ホッと",
];

const NEGATIVE_SLANG = [
  "メンタルやば",
  "心折れ",
  "心が折れ",
  "病む",
  "病んで",
  "無理ぽ",
  "無理ゲー",
  "オワタ",
  "終わった",
  "バグってる",
  "沼ってる",
  "詰ん",
  "しにそう",
];

const QUESTION_RELIEF_PATTERNS = [
  /ですか[?？]?$/,
  /でしょうか[?？]?$/,
  /ますか[?？]?$/,
  /ましたか[?？]?$/,
  /でしたか[?？]?$/,
  /かな[?？]?$/,
  /かしら[?？]?$/,
  /\?\s*$/,
  /？\s*$/,
];

const normalizeText = (input: string) => input.toLowerCase();

const applyQuestionRelief = (score: number, latestUtterance: string, hasCritical: boolean) => {
  if (!latestUtterance || hasCritical || score <= 0) {
    return score;
  }

  const trimmed = latestUtterance.trim();
  const isQuestion = QUESTION_RELIEF_PATTERNS.some((pattern) => pattern.test(trimmed));
  if (!isQuestion) {
    return score;
  }

  return Math.max(0, score - 2);
};

export const evaluateEmotionState = (input: string, options?: { latestUtterance?: string }): EmotionAnalysis => {
  const text = normalizeText(input);
  const latestNormalized = options?.latestUtterance ? normalizeText(options.latestUtterance) : "";
  let score = 0;
  const reasons: string[] = [];
  let criticalTriggered = false;

  CRITICAL_KEYWORDS.forEach((keyword) => {
    if (text.includes(keyword)) {
      score += 4;
      reasons.push(`「${keyword}」という強い表現`);
      criticalTriggered = true;
    }
  });

  CRITICAL_REGEX.forEach(({ pattern, reason }) => {
    if (pattern.test(text)) {
      score += 4;
      reasons.push(reason);
      criticalTriggered = true;
    }
  });

  CONCERN_KEYWORDS.forEach((keyword) => {
    if (text.includes(keyword)) {
      score += 2;
      reasons.push(`「${keyword}」というネガティブ感情`);
    }
  });

  CONCERN_REGEX.forEach(({ pattern, reason }) => {
    if (pattern.test(text)) {
      score += 2;
      reasons.push(reason);
    }
  });

  NEGATIVE_SLANG.forEach((phrase) => {
    if (text.includes(phrase)) {
      score += 2;
      reasons.push(`スラング表現: ${phrase}`);
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

  if (/(疲(れ|弊)(た|すぎ)|燃え尽きた|バーンアウト)/.test(text)) {
    score += 1;
    reasons.push("極度の疲弊表現");
  }

  const sentences = text.split(/[。！？!?\n\r]+/).map((sentence) => sentence.trim()).filter(Boolean);
  if (sentences.length > 0) {
    const heavySentences = sentences.filter((sentence) =>
      /(無理|最悪|終わり|つら|しんど|絶望|嫌|怖|不安|泣|病む)/.test(sentence),
    );
    if (heavySentences.length >= 3) {
      score += 2;
      reasons.push("ネガティブな文が連続");
    }
  }

  if (/(何をしても|どう頑張っても|全て|全部).*(無駄|意味がない|変わらない)/.test(text)) {
    score += 2;
    reasons.push("無力感の表現");
  }

  if (/(涙|泣き).*(止まらない|止められない)/.test(text)) {
    score += 1;
    reasons.push("涙が止まらない状態");
  }

  score = applyQuestionRelief(score, latestNormalized || text, criticalTriggered);

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
