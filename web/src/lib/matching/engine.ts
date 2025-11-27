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
import { generatePersonalityNarrative } from "@/lib/personality/narrative";
import {
  generateProfilePersonality,
  generateMatchingReason,
  generateRelationshipPreview,
  generateFirstDate,
} from "@/lib/personality/matching-narrative";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

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
    "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1448932223592-d1fc686e76ea?auto=format&fit=crop&w=400&q=80",
  ],
  female: [
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1525130413817-d45c1d127c42?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1504208434309-cb69f4fe52b0?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1445633814773-c3ac65bdb48c?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1456916374081-9c945ccbbcab?auto=format&fit=crop&w=400&q=80",
  ],
};

const neutralFallbackAvatars = [
  "https://images.unsplash.com/photo-1507146426996-ef05306b995a?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1470123808288-1e59739ba8f2?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1469470379115-8b3e6690e708?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1508675801627-066ac4346a60?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1507149833265-60c372daea22?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=400&q=80",
];

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
  const pool = [...fallbackAvatars[gender], ...neutralFallbackAvatars];
  if (pool.length === 0) {
    return "https://images.unsplash.com/photo-1507146426996-ef05306b995a?auto=format&fit=crop&w=400&q=80";
  }
  return pool[index % pool.length];
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

const isValidHttpsUrl = (candidate: string): boolean => {
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const normalizeAvatarUrl = (url?: string | null): string | null => {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed.length === 0 || trimmed === "null" || trimmed === "undefined") return null;
  if (isValidHttpsUrl(trimmed)) return trimmed;
  const baseUrl = env.supabaseUrl?.replace(/\/$/, "");
  if (!baseUrl) return null;
  const normalizedPath = trimmed.replace(/^\/+/, "");
  const candidate = normalizedPath.startsWith("storage/v1")
    ? `${baseUrl}/${normalizedPath}`
    : `${baseUrl}/storage/v1/object/public/${normalizedPath}`;
  return isValidHttpsUrl(candidate) ? candidate : null;
};

const buildDicebearAvatar = (seed: string, gender: Gender): string => {
  const palette = gender === "male" ? "blue" : "pink";
  const encodedSeed = encodeURIComponent(seed);
  return `https://api.dicebear.com/8.x/adventurer/svg?seed=${encodedSeed}&backgroundColor=ffdfbf,bee3db&scale=90&accessoriesProbability=40&hairColor=4a312c,2f1b0f&skinColor=f2d3b1,eac9a1&shapeColor=${palette}`;
};

const mapUserRowToProfile = (row: UserRow, index: number): MatchingProfile => {
  const age = row.age ?? 29;
  const avatarCandidate = normalizeAvatarUrl(row.avatar_url);
  const fallbackAvatar = buildDicebearAvatar(`${row.id}-${index}`, row.gender);
  return {
    id: row.id,
    nickname: row.nickname,
    age: age < 18 ? 18 : age,
    gender: row.gender,
    avatarUrl: avatarCandidate ?? pickFallbackAvatar(row.gender, index) ?? fallbackAvatar,
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

const ensureProfileAvatar = (profile: MatchingProfile, index: number): MatchingProfile => {
  const trimmed = profile.avatarUrl?.trim();
  if (trimmed && isValidHttpsUrl(trimmed)) {
    return { ...profile, avatarUrl: trimmed };
  }
  const fallback = buildDicebearAvatar(`${profile.id}-${index}`, profile.gender);
  return {
    ...profile,
    avatarUrl: fallback,
  };
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
  
  if (score >= 90) {
    reason = `${userLabel}のあなたと${profileLabel}の組み合わせは極めて理想的（${score}点）！`;
  } else if (score >= 82) {
    reason = `${userLabel}のあなたと${profileLabel}は非常に高いシナジー（${score}点）`;
  } else if (score >= 75) {
    reason = `${userLabel}のあなたと${profileLabel}はバランスの取れた良好な相性（${score}点）`;
  } else if (score >= 68) {
    reason = `${userLabel}のあなたと${profileLabel}は互いに高め合える関係性（${score}点）`;
  } else if (score >= 61) {
    reason = `${userLabel}のあなたと${profileLabel}は成長し合える可能性を持つ相性（${score}点）`;
  } else if (score >= 54) {
    reason = `${userLabel}のあなたと${profileLabel}は刺激的な違いがある組み合わせ（${score}点）`;
  } else if (score >= 47) {
    reason = `${userLabel}のあなたと${profileLabel}は異なる視点で補い合う関係（${score}点）`;
  } else {
    reason = `${userLabel}のあなたと${profileLabel}は個性的な対比が際立つペア（${score}点）`;
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
    const userTrait = userType.dominantTraits[0];
    const profileTrait = profileType.dominantTraits[0];
    if (userTrait === profileTrait) {
      highlights.push(`性格バランス：お互いに${userTrait}を大切にする共通点があります。`);
    } else {
      highlights.push(`性格バランス：${userTrait}と${profileTrait}が調和する良い組み合わせ。`);
    }
  } else if (details.personality <= 55) {
    highlights.push(`性格コンビ：${userType.dominantTraits[0]}が${profileType.dominantTraits[0]}を補完する凸凹ペア。`);
  }

  if (details.valueAlignment >= 65 && commonValues.length > 0) {
    highlights.push(`価値観：${commonValues.join("・")}を大切にする点が一致。`);
  } else if (details.valueAlignment < 55) {
    highlights.push(`価値観の刺激：視野の広さや選択基準が違うため、新しい発見が得られそう。`);
  }

  if (details.communication >= 65) {
    const userComm = userType.characteristics.communication;
    const profileComm = profileType.characteristics.communication;
    if (userComm === profileComm) {
      highlights.push(`会話スタイル：お互いに${userComm}スタイルで意思疎通しやすい関係。`);
    } else {
      highlights.push(`会話テンポ：${userComm} × ${profileComm}でストレス少なく話せます。`);
    }
  } else {
    const userComm = userType.characteristics.communication;
    const profileComm = profileType.characteristics.communication;
    if (userComm === profileComm) {
      highlights.push(`会話スタイル：同じ${userComm}アプローチで安心感のある対話が期待できます。`);
    } else {
      highlights.push(`会話スタイル：${userComm}と${profileComm}、異なるペースを学び合う関係。`);
    }
  }

  const alignedTraits = traitDiffs
    .filter((item) => item.diff <= 0.6)
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 2);

  const alignmentPhrases = [
    "近い感覚で理解し合えます",
    "似た価値観を共有しています",
    "同じ目線で物事を見ています",
    "共通の土台があります",
  ];

  alignedTraits.forEach((item, index) => {
    const phrase = alignmentPhrases[index % alignmentPhrases.length];
    highlights.push(`${item.label}：あなた${formatScore(item.user)} / 相手${formatScore(item.profile)}と${phrase}。`);
  });

  const complementary = traitDiffs
    .filter((item) => item.diff >= 1.4)
    .sort((a, b) => b.diff - a.diff)[0];

  if (complementary) {
    highlights.push(`${complementary.label}：あなた${formatScore(complementary.user)} vs 相手${formatScore(complementary.profile)}で補完し合える立ち位置。`);
  }

  return highlights.slice(0, 5);
}

function generatePersonalizedInsights(
  userType: PersonalityTypeDefinition,
  profileType: PersonalityTypeDefinition,
  compatibility: ReturnType<typeof calculate24TypeCompatibility>,
) {
  const insights = {
    strengths: [] as string[],
    growthAreas: [] as string[],
    relationshipStyle: "",
    challenges: [] as string[],
  };

  const score = compatibility.totalCompatibility;

  // Strength
  if (score >= 85) {
    insights.strengths.push("お互いの個性を自然に認め合える信頼関係が築けます");
    insights.strengths.push("価値観の共通点が多く、長期的なパートナーシップが期待できます");
  } else if (score >= 70) {
    insights.strengths.push("違いを楽しみながら、互いを高め合える関係性");
    insights.strengths.push("コミュニケーションの相性が良く、ストレスの少ない対話ができます");
  } else if (score >= 55) {
    insights.strengths.push("異なる視点を持つことで、視野が広がる刺激的な関係");
    insights.strengths.push("お互いの得意分野で補い合える可能性があります");
  } else {
    insights.strengths.push("対照的な個性だからこそ学べることが多い組み合わせ");
  }

  // Growth
  if (score >= 85) {
    insights.growthAreas.push("定期的にお互いの目標や価値観を確認し合う時間を持つこと");
    insights.growthAreas.push("居心地の良さに甘えず、新しいチャレンジを一緒に楽しむ姿勢");
  } else if (score >= 70) {
    insights.growthAreas.push("相手のペースや考え方の違いを「面白い」と捉える余裕を持つこと");
    insights.growthAreas.push("意見が分かれた時こそ、じっくり話し合う時間を大切に");
  } else if (score >= 55) {
    insights.growthAreas.push("違和感を感じた時は早めに率直に伝え合う習慣づくり");
    insights.growthAreas.push("お互いの「当たり前」が違うことを前提に、丁寧な説明を心がける");
  } else {
    insights.growthAreas.push("価値観の違いを受け入れる柔軟性と、譲れない部分を明確にすること");
    insights.growthAreas.push("無理に合わせようとせず、適度な距離感を保つことも大切");
  }

  // Relationship Style
  if (score >= 85) {
    insights.relationshipStyle = "自然体でいられる、安心感と信頼で結ばれた関係";
  } else if (score >= 70) {
    insights.relationshipStyle = "お互いの違いを楽しみながら成長し合える関係";
  } else if (score >= 55) {
    insights.relationshipStyle = "刺激と学びを与え合う、ダイナミックな関係";
  } else {
    insights.relationshipStyle = "個性を尊重し合いながら、新しい発見を楽しむ関係";
  }

  // Challenge
  if (score < 70) {
    if (compatibility.personality < 60) {
      insights.challenges.push("性格の違いから誤解が生じやすいため、こまめな確認が必要");
    }
    if (compatibility.valueAlignment < 55) {
      insights.challenges.push("大事にしたい価値観が異なるため、妥協点を見つける努力が求められます");
    }
    if (compatibility.communication < 60) {
      insights.challenges.push("コミュニケーションスタイルの違いに注意。「伝わっている」前提を避けましょう");
    }
  }

  if (insights.challenges.length === 0 && score < 85) {
    insights.challenges.push("相性が良いからこそ、慢心せずお互いへの配慮を忘れずに");
  }

  return insights;
}

function generateCatchphrase(
  userType: PersonalityTypeDefinition,
  profileType: PersonalityTypeDefinition,
  userScores: BigFiveScores,
  profileScores: BigFiveScores,
  score: number,
  profile: MatchingProfile,
): string {
  const catchphrases: string[] = [];
  
  // プロフィール情報を活用
  if (profile.hobbies) {
    catchphrases.push(`${profile.hobbies}を一緒に楽しめそうな相性`);
  }
  
  // 外向性による分類
  const extraversionDiff = Math.abs(userScores.extraversion - profileScores.extraversion);
  if (extraversionDiff < 0.8) {
    if (userScores.extraversion >= 3.5) {
      catchphrases.push("エネルギッシュに盛り上がれる関係");
    } else {
      catchphrases.push("落ち着いた時間を共有できる関係");
    }
  } else {
    catchphrases.push("静と動のバランスが取れたペア");
  }
  
  // 開放性による分類
  if (userScores.openness >= 3.5 && profileScores.openness >= 3.5) {
    catchphrases.push("新しい体験を一緒に冒険できる相性");
  } else if (userScores.openness < 3.0 && profileScores.openness < 3.0) {
    catchphrases.push("安定した日常を大切にできる関係");
  }
  
  // 誠実性による分類
  if (userScores.conscientiousness >= 4.0 && profileScores.conscientiousness >= 4.0) {
    catchphrases.push("しっかり計画を立てて進める相性");
  } else if (Math.abs(userScores.conscientiousness - profileScores.conscientiousness) >= 1.5) {
    catchphrases.push("柔軟さと計画性を補い合える関係");
  }

  // 協調性
  if (userScores.agreeableness >= 4.0 && profileScores.agreeableness >= 4.0) {
    catchphrases.push("思いやりを大切にし合える優しい関係");
  }

  // ランダムに選択（毎回違う印象）
  if (catchphrases.length > 0) {
    const index = Math.floor(Math.random() * catchphrases.length);
    return catchphrases[index];
  }
  
  return `${profile.values}という価値観でつながる相性`;
}

function generateDateIdea(
  userScores: BigFiveScores,
  profileScores: BigFiveScores,
  profile: MatchingProfile,
): string {
  const ideas: string[] = [];
  
  // プロフィールの趣味から提案
  if (profile.hobbies) {
    const hobby = profile.hobbies;
    if (hobby.includes("カフェ") || hobby.includes("コーヒー")) {
      ideas.push("お互いのお気に入りカフェを紹介し合う");
    }
    if (hobby.includes("映画") || hobby.includes("シネマ")) {
      ideas.push("気になっている映画を観た後に感想を語り合う");
    }
    if (hobby.includes("アウトドア") || hobby.includes("キャンプ") || hobby.includes("登山")) {
      ideas.push("自然の中を散策しながらゆっくり会話する");
    }
    if (hobby.includes("アート") || hobby.includes("美術") || hobby.includes("ギャラリー")) {
      ideas.push("展覧会やギャラリー巡りで感性を共有");
    }
    if (hobby.includes("読書") || hobby.includes("本")) {
      ideas.push("おすすめの本を持ち寄ってブックカフェで語る");
    }
    if (hobby.includes("料理") || hobby.includes("グルメ")) {
      ideas.push("お互いの好きな料理を食べに行く");
    }
    if (hobby.includes("音楽") || hobby.includes("ライブ")) {
      ideas.push("好きなアーティストや音楽の話で盛り上がる");
    }
    if (hobby.includes("写真")) {
      ideas.push("カメラを持って街を歩きながら撮影を楽しむ");
    }
  }

  // 好きなものから提案
  if (profile.favoriteThings && ideas.length < 2) {
    const fav = profile.favoriteThings;
    if (fav.includes("コーヒー") || fav.includes("カフェ")) {
      ideas.push("コーヒーの美味しいお店でゆっくり話す");
    }
    if (fav.includes("ビール") || fav.includes("お酒") || fav.includes("ワイン")) {
      ideas.push("カジュアルなバルで飲みながら本音トーク");
    }
    if (fav.includes("自然") || fav.includes("植物") || fav.includes("花")) {
      ideas.push("植物園や公園を散策しながらリラックス");
    }
  }
  
  // 性格スコアからの提案（フォールバック）
  if (ideas.length === 0) {
    const avgExtraversion = (userScores.extraversion + profileScores.extraversion) / 2;
    const avgOpenness = (userScores.openness + profileScores.openness) / 2;
    
    if (avgExtraversion >= 3.8) {
      ideas.push("賑やかな場所で一緒にエネルギーを共有");
    } else if (avgOpenness >= 3.8) {
      ideas.push("二人とも初めての場所や体験を試してみる");
    } else {
      ideas.push("落ち着いた空間でじっくり対話を楽しむ");
    }
  }

  return ideas[Math.floor(Math.random() * ideas.length)];
}

function generateCommonalities(
  userScores: BigFiveScores,
  profileScores: BigFiveScores,
  profile: MatchingProfile,
  userType: PersonalityTypeDefinition,
): string[] {
  const commonalities: string[] = [];
  
  // 特性の類似度から具体的な共通点を生成
  const traitDiffs = TRAITS.map((trait) => ({
    trait,
    label: TRAIT_LABELS[trait],
    user: userScores[trait],
    profile: profileScores[trait],
    diff: Math.abs(userScores[trait] - profileScores[trait]),
  }));

  traitDiffs.sort((a, b) => a.diff - b.diff);
  const mostSimilar = traitDiffs.slice(0, 2);

  mostSimilar.forEach((item) => {
    if (item.diff <= 0.8) {
      if (item.trait === "extraversion") {
        if (item.user >= 3.5) {
          commonalities.push("どちらも人との交流でエネルギーを得るタイプ");
        } else {
          commonalities.push("どちらも一人の時間を大切にするタイプ");
        }
      } else if (item.trait === "openness") {
        if (item.user >= 3.5) {
          commonalities.push("新しいことに興味を持つ好奇心旺盛な点が共通");
        } else {
          commonalities.push("慣れ親しんだものを大切にする安定志向");
        }
      } else if (item.trait === "conscientiousness") {
        if (item.user >= 3.8) {
          commonalities.push("計画的に物事を進める几帳面さが似ている");
        } else {
          commonalities.push("柔軟に状況対応できる自由な感覚が近い");
        }
      } else if (item.trait === "agreeableness") {
        if (item.user >= 3.8) {
          commonalities.push("相手を思いやる優しさや協調性が共通");
        }
      } else if (item.trait === "neuroticism") {
        if (item.user >= 3.5 && item.profile >= 3.5) {
          commonalities.push("繊細で細かいことに気づける感受性が似ている");
        } else if (item.user < 3.0 && item.profile < 3.0) {
          commonalities.push("おおらかでストレスに強いメンタルが共通");
        }
      }
    }
  });

  // プロフィール情報からの共通点
  if (profile.interests && profile.interests.length > 0) {
    commonalities.push(`${profile.interests[0]}への関心が会話のきっかけに`);
  }

  if (commonalities.length === 0) {
    // 補完関係を強調
    const maxDiff = traitDiffs[traitDiffs.length - 1];
    if (maxDiff.trait === "extraversion") {
      commonalities.push("外向性の違いが互いの視野を広げる");
    } else {
      commonalities.push("異なる強みで補い合える関係");
    }
  }

  return commonalities.slice(0, 3);
}

function generateConversationStarters(
  userScores: BigFiveScores,
  profileScores: BigFiveScores,
  profile: MatchingProfile,
): string[] {
  const starters: string[] = [];
  
  if (userScores.openness >= 3.5 && profileScores.openness >= 3.5) {
    starters.push(`「${profile.hobbies}」について、最近ハマっていることは？`);
  }
  
  if (profile.favoriteThings) {
    starters.push(`「${profile.favoriteThings}」の魅力について教えて`);
  }
  
  if (profile.interests && profile.interests.length > 0) {
    starters.push(`「${profile.interests[0]}」に興味を持ったきっかけは？`);
  }

  if (starters.length === 0) {
    starters.push("休日はどんな風に過ごすことが多い？");
    starters.push("最近気になっていることは？");
  }

  return starters.slice(0, 3);
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
  const basePool = candidateProfiles.length > 0 ? candidateProfiles : filteredMockProfiles;
  const pool = basePool.map((profile, index) => ensureProfileAvatar(profile, index));

  const computed = pool.map((profile) => {
    const profileScores = estimateProfileScores(profile);
    const profileType = determinePersonalityType(profileScores);
    const compatibility = calculate24TypeCompatibility(userType, userScores, profileScores, profileType);
    const personalizedInsights = generatePersonalizedInsights(userType, profileType, compatibility);
    const highlights = generateMatchHighlights(userType, profileType, compatibility, userScores, profileScores);
    const catchphrase = generateCatchphrase(userType, profileType, userScores, profileScores, compatibility.totalCompatibility, profile);
    const dateIdea = generateDateIdea(userScores, profileScores, profile);
    const commonalities = generateCommonalities(userScores, profileScores, profile, userType);
    const conversationStarters = generateConversationStarters(userScores, profileScores, profile);

    const profileNarrative = generateProfilePersonality(profile, profileScores, profileType);
    const matchingReasonData = generateMatchingReason(userScores, profileScores, userType, profileType, profile);
    const relationshipPreview = generateRelationshipPreview(userScores, profileScores, profile);
    const firstDateSuggestion = generateFirstDate(userScores, profileScores, profile);

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
      bigFiveScores: {
        user: userScores,
        profile: profileScores,
      },
      insights: personalizedInsights,
      catchphrase,
      dateIdea,
      commonalities,
      conversationStarters,
      profileNarrative,
      matchingReasons: matchingReasonData.reasons,
      relationshipPreview,
      firstDateSuggestion,
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
): {
  bigFiveScores: BigFiveScores;
  personalityType: PersonalityTypeDefinition;
  narrative: string;
  detailedNarrative: ReturnType<typeof generatePersonalityNarrative>;
} => {
  const scores = calculateBigFiveScores(payload.answers);
  const type = determinePersonalityType(scores);
  const detailedNarrative = generatePersonalityNarrative(scores, type);
  const label = getTogelLabel(type.id);
  const simplifiedNarrative = `${label}のあなたは${type.description}`;
  return {
    bigFiveScores: scores,
    personalityType: snapshotPersonalityType(type),
    narrative: simplifiedNarrative,
    detailedNarrative,
  };
};
