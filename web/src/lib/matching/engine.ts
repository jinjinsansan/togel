import { mockProfiles } from "@/data/mock-profiles";
import {
  Answer,
  BigFiveScores,
  DiagnosisPayload,
  MatchingProfile,
  MatchingResult,
  PersonalityTypeDefinition,
} from "@/types/diagnosis";
import {
  determinePersonalityType,
  estimateProfileScores,
  getTogelLabel,
  snapshotPersonalityType,
} from "@/lib/personality";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Gender = "male" | "female";

type TraitKey = keyof BigFiveScores;

const TRAITS: TraitKey[] = ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"];

const MAX_MOCK_PROFILES_PER_GENDER = 150;
const fallbackAvatars: Record<Gender, string[]> = {
  male: [
    "https://images.unsplash.com/photo-1504595403659-9088ce801e29?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
  ],
  female: [
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1525130413817-d45c1d127c42?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=400&q=80",
  ],
};

const traitKeyMap: Record<string, TraitKey> = {
  o: "openness",
  c: "conscientiousness",
  e: "extraversion",
  a: "agreeableness",
  n: "neuroticism",
};

const TRAIT_NARRATIVES: Record<TraitKey, { high: string; low: string }> = {
  openness: {
    high: "アイデア感度が高く、新しい刺激から学びと楽しさを見出します。",
    low: "慣れ親しんだ型を大切にし、安定した環境で実力を発揮します。",
  },
  conscientiousness: {
    high: "計画遂行力が抜群で、約束や目標を着実に形にします。",
    low: "柔らかな進行が得意で、状況に合わせて手法を切り替えられます。",
  },
  extraversion: {
    high: "交流エネルギーが豊かで、人との対話から大きな活力を得ます。",
    low: "一対一でじっくり向き合う静かなコミュニケーションを好みます。",
  },
  agreeableness: {
    high: "共感スタイルが豊かで、周囲に安心感と温かさを届けます。",
    low: "是々非々の姿勢で率直に意見を伝え、物事を前に進めます。",
  },
  neuroticism: {
    high: "繊細な感受性があるため、相手の心の動きをいち早く察知できます。",
    low: "ストレス耐性が高く、プレッシャー下でも落ち着いた判断ができます。",
  },
};

const TRAIT_LABELS: Record<TraitKey, string> = {
  openness: "アイデア感度",
  conscientiousness: "計画遂行力",
  extraversion: "交流エネルギー",
  agreeableness: "共感スタイル",
  neuroticism: "ストレス耐性",
};

const parseInterestsFromText = (text?: string | null): string[] => {
  if (!text) return ["ライフスタイル"];
  const tokens = text
    .split(/[、,\/・\s]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
  if (tokens.length === 0) return ["ライフスタイル"];
  return tokens.slice(0, 3);
};

const deriveValuesFromFavorite = (favorite?: string | null, bio?: string | null): string => {
  const text = `${favorite ?? ""}${bio ?? ""}`;
  if (text.includes("自然") || text.includes("アウトドア")) return "自然体";
  if (text.includes("キャリア") || text.includes("スタートアップ")) return "挑戦";
  if (text.includes("暮らし") || text.includes("余白")) return "余白のある暮らし";
  if (text.includes("アート") || text.includes("写真")) return "創造性";
  return "自分らしさ";
};

const deriveCommunicationStyle = (bio?: string | null): string => {
  if (!bio) return "ナチュラル";
  if (bio.includes("計画") || bio.includes("整理")) return "ロジカル";
  if (bio.includes("会話") || bio.includes("対話")) return "ナチュラル";
  if (bio.includes("柔らか")) return "柔らかめ";
  return "穏やか";
};

const pickFallbackAvatar = (gender: Gender, index: number) => {
  const list = fallbackAvatars[gender];
  if (list.length === 0) return "https://images.unsplash.com/photo-1507146426996-ef05306b995a?auto=format&fit=crop&w=400&q=80";
  return list[index % list.length];
};

type UserRow = {
  id: string;
  nickname: string;
  gender: Gender;
  age: number | null;
  avatar_url: string | null;
  bio: string;
  job: string;
  favorite_things: string;
  hobbies: string;
  special_skills: string;
};

const mapUserRowToProfile = (row: UserRow, index: number): MatchingProfile => {
  const age = row.age ?? 29;
  return {
    id: row.id,
    nickname: row.nickname,
    age: age < 18 ? 18 : age,
    gender: row.gender,
    avatarUrl: row.avatar_url ?? pickFallbackAvatar(row.gender, index),
    bio: row.bio,
    job: row.job,
    favoriteThings: row.favorite_things,
    hobbies: row.hobbies,
    specialSkills: row.special_skills,
    values: deriveValuesFromFavorite(row.favorite_things, row.bio),
    communication: deriveCommunicationStyle(row.bio),
    interests: parseInterestsFromText(row.hobbies),
    city: "オンライン",
  } satisfies MatchingProfile;
};

const loadRealProfiles = async (gender: Gender): Promise<MatchingProfile[]> => {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("users")
      .select("id, nickname, gender, age, avatar_url, bio, job, favorite_things, hobbies, special_skills")
      .eq("gender", gender)
      .eq("is_mock_data", false)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error || !data) {
      console.error("Failed to load real profiles", error);
      return [];
    }

    return data.map((row, index) => mapUserRowToProfile(row as UserRow, index));
  } catch (error) {
    console.error("Unexpected error loading real profiles", error);
    return [];
  }
};

function calculateBigFiveScores(answers: Answer[]): BigFiveScores {
  const totals: Record<TraitKey, { sum: number; count: number }> = {
    openness: { sum: 0, count: 0 },
    conscientiousness: { sum: 0, count: 0 },
    extraversion: { sum: 0, count: 0 },
    agreeableness: { sum: 0, count: 0 },
    neuroticism: { sum: 0, count: 0 },
  };

  answers.forEach((answer) => {
    const trait = getTraitFromQuestionId(answer.questionId);
    if (!trait) return;
    totals[trait].sum += answer.value;
    totals[trait].count += 1;
  });

  return TRAITS.reduce<BigFiveScores>((scores, trait) => {
    const { sum, count } = totals[trait];
    return {
      ...scores,
      [trait]: count === 0 ? 3 : Number((sum / count).toFixed(2)),
    };
  }, {
    openness: 3,
    conscientiousness: 3,
    extraversion: 3,
    agreeableness: 3,
    neuroticism: 3,
  });
}

function getTraitFromQuestionId(questionId: string): TraitKey | null {
  const key = traitKeyMap[questionId[0]?.toLowerCase() ?? ""];
  return key ?? null;
}

type CompatibilityDetails = {
  personality: number;
  valueAlignment: number;
  communication: number;
  totalCompatibility: number;
};

function calculate24TypeCompatibility(
  userType: PersonalityTypeDefinition,
  userScores: BigFiveScores,
  profileScores: BigFiveScores,
  profileType: PersonalityTypeDefinition
) {
  const traitCompatibility = calculateTraitSimilarity(userScores, profileScores);
  const complementScore = calculateComplementarityScores(userType, profileType);
  const valueScore = calculateValueAlignment24Type(userType, profileType);
  const commScore = calculateCommunication24Type(userType, profileType);
  const hasTraitOverlap = userType.dominantTraits.some((trait) => profileType.dominantTraits.includes(trait));
  const preferredMatch = userType.compatibleTypes.some((candidate) => {
    if (!candidate) return false;
    if (candidate === profileType.id) return true;
    const tokens = candidate.split(/[-_]/).filter(Boolean);
    return tokens.every((token) => profileType.id.includes(token));
  });
  const typeAffinityBonus = preferredMatch ? 10 : 0;
  const overlapBonus = hasTraitOverlap ? 4 : 0;

  const totalScore = Math.min(
    100,
    traitCompatibility * 0.35 + complementScore * 0.2 + valueScore * 0.25 + commScore * 0.2 + typeAffinityBonus + overlapBonus,
  );

  const details: CompatibilityDetails = {
    personality: Math.round(traitCompatibility),
    valueAlignment: Math.round(valueScore),
    communication: Math.round(commScore),
    totalCompatibility: Math.round(totalScore),
  };

  return {
    ...details,
    compatibilityReason: generate24TypeCompatibilityReason(userType, profileType, details, userScores, profileScores),
  };
}

function calculateTraitSimilarity(
  userScores: BigFiveScores,
  profileScores: BigFiveScores,
): number {
  const similaritySum = TRAITS.reduce((sum, trait) => {
    const diff = Math.abs(userScores[trait] - profileScores[trait]);
    return sum + Math.max(0, 5 - diff);
  }, 0);

  const similarityScore = (similaritySum / (TRAITS.length * 5)) * 80;

  let complementBonus = 0;
  if (Math.abs(userScores.extraversion - profileScores.extraversion) >= 2) complementBonus += 8;
  if (userScores.openness >= 4 && profileScores.conscientiousness >= 4) complementBonus += 5;
  if (userScores.conscientiousness >= 4 && profileScores.openness >= 4) complementBonus += 5;
  if (userScores.agreeableness >= 4 && profileScores.agreeableness >= 4) complementBonus += 2;

  return Math.min(100, similarityScore + complementBonus);
}

function calculateComplementarityScores(
  userType: PersonalityTypeDefinition,
  profileType: PersonalityTypeDefinition,
): number {
  let score = 50;
  const userId = userType.id;
  const profileId = profileType.id;

  const isExtrovert = (id: string) => id.includes("social") || id.includes("networker") || id.includes("communicator") || id.includes("leader") || id.includes("builder");
  const isIntrovert = (id: string) => id.includes("introvert") || id.includes("quiet") || id.includes("sage") || id.includes("observer") || id.includes("intellectual");
  const isCreative = (id: string) => id.includes("creative") || id.includes("artist") || id.includes("poetic") || id.includes("dreamer");
  const isStructured = (id: string) => id.includes("specialist") || id.includes("organizer") || id.includes("guardian") || id.includes("thinker") || id.includes("methodical");

  if ((isExtrovert(userId) && isIntrovert(profileId)) || (isIntrovert(userId) && isExtrovert(profileId))) {
    score += 18;
  }
  if ((isCreative(userId) && isStructured(profileId)) || (isStructured(userId) && isCreative(profileId))) {
    score += 15;
  }
  if (userType.dominantTraits.includes("協調性") && profileType.dominantTraits.includes("実行力")) {
    score += 8;
  }
  if (userType.dominantTraits.includes("実行力") && profileType.dominantTraits.includes("協調性")) {
    score += 8;
  }

  return Math.min(100, score);
}

function calculateValueAlignment24Type(
  userType: PersonalityTypeDefinition,
  profileType: PersonalityTypeDefinition,
): number {
  let score = 50;
  const commonValues = getCommonValues(userType, profileType);
  score += commonValues.length * 8;
  if (hasValueConflict(userType, profileType)) score -= 15;
  return Math.max(20, Math.min(100, score));
}

function calculateCommunication24Type(
  userType: PersonalityTypeDefinition,
  profileType: PersonalityTypeDefinition,
): number {
  const userComm = userType.characteristics.communication;
  const profileComm = profileType.characteristics.communication;

  const includesAny = (text: string, keywords: string[]) => keywords.some((keyword) => text.includes(keyword));

  const userIsVerbal = includesAny(userComm, ["活発", "パワフル", "情熱", "明る"]);
  const userIsReflective = includesAny(userComm, ["静か", "深", "思慮", "落ち着"]);
  const userIsStructured = includesAny(userComm, ["明確", "構造", "的確", "論理"]);
  const userIsIntuitive = includesAny(userComm, ["詩的", "示唆", "直感", "感性"]);

  const profileIsVerbal = includesAny(profileComm, ["活発", "パワフル", "情熱", "明る"]);
  const profileIsReflective = includesAny(profileComm, ["静か", "深", "思慮", "落ち着"]);
  const profileIsStructured = includesAny(profileComm, ["明確", "構造", "的確", "論理"]);
  const profileIsIntuitive = includesAny(profileComm, ["詩的", "示唆", "直感", "感性"]);

  let score = 50;
  if (userIsVerbal && profileIsReflective) score += 12;
  if (userIsReflective && profileIsVerbal) score += 12;
  if (userIsStructured && profileIsIntuitive) score += 10;
  if (userIsIntuitive && profileIsStructured) score += 10;
  if ((userIsVerbal && profileIsVerbal) || (userIsReflective && profileIsReflective)) score += 6;

  return Math.min(100, score);
}

function getCommonValues(type1: PersonalityTypeDefinition, type2: PersonalityTypeDefinition): string[] {
  const common: string[] = [];
  if (type1.dominantTraits.some((trait) => ["誠実性", "責任感"].includes(trait)) && type2.dominantTraits.some((trait) => ["誠実性", "責任感"].includes(trait))) {
    common.push("誠実性");
  }
  if (type1.dominantTraits.some((trait) => ["協調性", "思いやり"].includes(trait)) && type2.dominantTraits.some((trait) => ["協調性", "思いやり"].includes(trait))) {
    common.push("協調性");
  }
  if (type1.dominantTraits.some((trait) => ["創造性", "革新性"].includes(trait)) && type2.dominantTraits.some((trait) => ["創造性", "革新性"].includes(trait))) {
    common.push("創造性");
  }
  if (type1.dominantTraits.some((trait) => ["探求心", "知性"].includes(trait)) && type2.dominantTraits.some((trait) => ["探求心", "知性"].includes(trait))) {
    common.push("知的好奇心");
  }
  return common;
}

function hasValueConflict(type1: PersonalityTypeDefinition, type2: PersonalityTypeDefinition): boolean {
  const isTraditional = (id: string) => id.includes("guardian") || id.includes("organizer") || id.includes("methodical") || id.includes("specialist");
  const isInnovative = (id: string) => id.includes("creative") || id.includes("innovator") || id.includes("exploratory") || id.includes("visionary");
  return (isTraditional(type1.id) && isInnovative(type2.id)) || (isInnovative(type1.id) && isTraditional(type2.id));
}

const formatScore = (value: number) => Number(value.toFixed(1)).toString();

function buildTraitAlignmentSentence(userScores: BigFiveScores, profileScores: BigFiveScores) {
  const traitDiffs = TRAITS.map((trait) => ({
    trait,
    label: TRAIT_LABELS[trait],
    user: userScores[trait],
    profile: profileScores[trait],
    diff: Math.abs(userScores[trait] - profileScores[trait]),
  }));

  const aligned = traitDiffs
    .filter((item) => item.diff <= 0.5)
    .sort((a, b) => a.diff - b.diff)[0];

  const complementary = traitDiffs
    .filter((item) => item.diff >= 1.3)
    .sort((a, b) => b.diff - a.diff)[0];

  const parts: string[] = [];
  if (aligned) {
    parts.push(
      `${aligned.label}がほぼ同じ感覚（あなた${formatScore(aligned.user)} / 相手${formatScore(aligned.profile)}）で、初対面でもペースを合わせやすいです。`,
    );
  }
  if (complementary) {
    parts.push(
      `${complementary.label}はあなた${formatScore(complementary.user)} vs 相手${formatScore(complementary.profile)}と差があり、役割分担が自然に決まりやすいギャップです。`,
    );
  }

  if (parts.length === 0) {
    return "特性のバランスが全体的に近く、安定した相性です。";
  }

  return parts.join(" ");
}

function generate24TypeCompatibilityReason(
  userType: PersonalityTypeDefinition,
  profileType: PersonalityTypeDefinition,
  details: CompatibilityDetails,
  userScores: BigFiveScores,
  profileScores: BigFiveScores,
): string {
  const userLabel = getTogelLabel(userType.id);
  const profileLabel = getTogelLabel(profileType.id);
  const commonValues = getCommonValues(userType, profileType);
  const score = details.totalCompatibility;
  let reason = "";
  if (score >= 85) {
    reason = `${userLabel}のあなたと${profileLabel}の組み合わせは非常に高いシナジー（${score}点）！`;
  } else if (score >= 70) {
    reason = `${userLabel}のあなたと${profileLabel}は相性バランスが良好（${score}点）`;
  } else if (score >= 55) {
    reason = `${userLabel}のあなたと${profileLabel}は伸びしろのある相性（${score}点）`;
  } else {
    reason = `${userLabel}のあなたと${profileLabel}はチャレンジングな相性（${score}点）`;
  }

  reason += ` ${buildTraitAlignmentSentence(userScores, profileScores)}`;

  if (commonValues.length >= 2) {
    reason += `。お互いの${commonValues.join("と")}を大切にする価値観が共通しており、深い理解関係が築けそう。`;
  } else if (commonValues.length === 1) {
    reason += `。${commonValues[0]}という価値観を共有しており、良い出会いになる可能性が高い。`;
  }

  if (details.personality >= 75) {
    reason += ` 性格面では${userType.dominantTraits[0]}と${profileType.dominantTraits[0]}が共鳴し、自然体でいられる組み合わせです。`;
  } else if (details.personality <= 55) {
    reason += ` 性格面では${userType.dominantTraits[0]}が${profileType.dominantTraits[0]}を補う構図で、新鮮な刺激を与え合えます。`;
  }

  if (details.communication >= 70) {
    reason += ` 会話テンポも近く、${userType.characteristics.communication}と${profileType.characteristics.communication}がストレスなく噛み合いそうです。`;
  }

  if (userType.compatibleTypes.includes(profileType.id)) {
    reason += " AIが推奨する好相性ペアに含まれており、互いの個性が新鮮な刺激を与え合う予感。";
  }

  return reason.trim();
}

function generateMatchHighlights(
  userType: PersonalityTypeDefinition,
  profileType: PersonalityTypeDefinition,
  details: CompatibilityDetails,
  userScores: BigFiveScores,
  profileScores: BigFiveScores,
): string[] {
  const highlights: string[] = [];
  const commonValues = getCommonValues(userType, profileType);
  const traitDiffs = TRAITS.map((trait) => ({
    trait,
    label: TRAIT_LABELS[trait],
    user: userScores[trait],
    profile: profileScores[trait],
    diff: Math.abs(userScores[trait] - profileScores[trait]),
  }));

  if (details.personality >= 70) {
    highlights.push(`性格バランス：${userType.dominantTraits[0]}と${profileType.dominantTraits[0]}が同じ方向を向いています。`);
  } else if (details.personality <= 55) {
    highlights.push(`性格コンビ：${userType.dominantTraits[0]}が${profileType.dominantTraits[0]}を補完する凸凹ペア。`);
  }

  if (details.valueAlignment >= 65 && commonValues.length > 0) {
    highlights.push(`価値観：${commonValues.join("・")}を大切にする点が一致。`);
  } else if (details.valueAlignment < 55) {
    highlights.push(`価値観の刺激：視野の広さや選択基準が違うため、新しい発見が得られそう。`);
  }

  if (details.communication >= 65) {
    highlights.push(`会話テンポ：${userType.characteristics.communication} × ${profileType.characteristics.communication}でストレス少なく話せます。`);
  } else {
    highlights.push(`会話スタイル：${userType.characteristics.communication}と${profileType.characteristics.communication}で互いのペースを学び合う関係。`);
  }

  const alignedTraits = traitDiffs
    .filter((item) => item.diff <= 0.6)
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 2);

  alignedTraits.forEach((item) => {
    highlights.push(`${item.label}：あなた${formatScore(item.user)} / 相手${formatScore(item.profile)}で同じ景色を見ています。`);
  });

  const complementary = traitDiffs
    .filter((item) => item.diff >= 1.4)
    .sort((a, b) => b.diff - a.diff)[0];

  if (complementary) {
    highlights.push(`${complementary.label}：あなた${formatScore(complementary.user)} vs 相手${formatScore(complementary.profile)}で補完し合える立ち位置。`);
  }

  highlights.push(`スコア内訳：性格${details.personality} / 価値観${details.valueAlignment} / コミュニケーション${details.communication}`);

  return highlights.slice(0, 5);
}

function generatePersonalizedInsights(
  userType: PersonalityTypeDefinition,
  profileType: PersonalityTypeDefinition,
  compatibility: ReturnType<typeof calculate24TypeCompatibility>,
) {
  const userLabel = getTogelLabel(userType.id);
  const profileLabel = getTogelLabel(profileType.id);
  const insights = {
    strengths: [] as string[],
    growthAreas: [] as string[],
    relationshipStyle: "",
    challenges: [] as string[],
  };

  if (compatibility.totalCompatibility >= 85) {
    insights.strengths.push(`${userLabel}の強みである${userType.characteristics.strengths[0]}と${profileLabel}の${profileType.characteristics.strengths[0]}がシンクロ`);
    insights.relationshipStyle = `互いの${userType.characteristics.relationships}と${profileType.characteristics.relationships}が補完し合う理想ペア`;
  } else if (compatibility.totalCompatibility >= 70) {
    insights.strengths.push(`${userType.characteristics.strengths[1]}と${profileType.characteristics.strengths[1]}がポジティブに作用`);
    insights.growthAreas.push(`${userType.characteristics.growthAreas[0]}と${profileType.characteristics.growthAreas[0]}を支え合える関係`);
    insights.relationshipStyle = `${userType.characteristics.relationships}と${profileType.characteristics.relationships}のバランスを探る関係`;
  } else {
    insights.growthAreas.push(`${userType.characteristics.growthAreas[0]}と${profileType.characteristics.growthAreas[0]}の違いをどう橋渡しするかが鍵`);
    insights.relationshipStyle = `互いの${userType.characteristics.workStyle}と${profileType.characteristics.workStyle}を尊重し合う関係`;
  }

  if (compatibility.totalCompatibility < 60) {
    insights.challenges.push(`${userLabel}と${profileLabel}の違いが刺激になる一方で調整も必要`);
  }

  if (insights.relationshipStyle === "") {
    insights.relationshipStyle = `${userType.characteristics.relationships}と${profileType.characteristics.relationships}を行き来する落ち着いた関係`;
  }

  return insights;
}

function buildPersonalityNarrative(
  scores: BigFiveScores,
  personalityType: PersonalityTypeDefinition,
): string {
  const label = getTogelLabel(personalityType.id);
  const fragments: string[] = [];

  TRAITS.forEach((trait) => {
    const score = scores[trait];
    if (score >= 4.2) {
      fragments.push(TRAIT_NARRATIVES[trait].high);
    } else if (score <= 2.3) {
      fragments.push(TRAIT_NARRATIVES[trait].low);
    }
  });

  if (fragments.length === 0) {
    fragments.push("バランスよく特性が整っており、状況に合わせた対応が得意です。");
  }

  const summary = fragments.slice(0, 3).join(" ");
  return `${label}のあなたは${personalityType.description} ${summary}`;
}

export const generateMatchingResults = async (
  payload: DiagnosisPayload,
): Promise<MatchingResult[]> => {
  const userScores = calculateBigFiveScores(payload.answers);
  const userType = determinePersonalityType(userScores);

  const oppositeGender = payload.userGender === "male" ? "female" : "male";
  const realProfiles = await loadRealProfiles(oppositeGender);
  const filteredMockProfiles = mockProfiles
    .filter((profile) => profile.gender === oppositeGender)
    .slice(0, MAX_MOCK_PROFILES_PER_GENDER);
  const mockQuota = Math.max(MAX_MOCK_PROFILES_PER_GENDER - realProfiles.length, 0);
  const trimmedMockProfiles = filteredMockProfiles.slice(0, mockQuota);
  const candidateProfiles = [...realProfiles, ...trimmedMockProfiles];
  const pool = candidateProfiles.length > 0 ? candidateProfiles : filteredMockProfiles;

  const computed = pool.map((profile) => {
    const profileScores = estimateProfileScores(profile);
    const profileType = determinePersonalityType(profileScores);
    const compatibility = calculate24TypeCompatibility(userType, userScores, profileScores, profileType);
    const personalizedInsights = generatePersonalizedInsights(userType, profileType, compatibility);
    const highlights = generateMatchHighlights(userType, profileType, compatibility, userScores, profileScores);

    return {
      ranking: 0,
      score: compatibility.totalCompatibility,
      profile,
      summary: compatibility.compatibilityReason,
      highlights,
      compatibility: {
        personality: compatibility.personality,
        valueAlignment: compatibility.valueAlignment,
        communication: compatibility.communication,
        total: compatibility.totalCompatibility,
      },
      compatibilityReason: compatibility.compatibilityReason,
      personalityTypes: {
        user: snapshotPersonalityType(userType),
        profile: snapshotPersonalityType(profileType),
      },
      insights: personalizedInsights,
    } satisfies MatchingResult;
  });

  return computed
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item, index) => ({
      ...item,
      ranking: index + 1,
    }));
};

export const generateDiagnosisResult = (
  payload: DiagnosisPayload,
): { bigFiveScores: BigFiveScores; personalityType: PersonalityTypeDefinition; narrative: string } => {
  const scores = calculateBigFiveScores(payload.answers);
  const type = determinePersonalityType(scores);
  const narrative = buildPersonalityNarrative(scores, type);
  return {
    bigFiveScores: scores,
    personalityType: snapshotPersonalityType(type),
    narrative,
  };
};
