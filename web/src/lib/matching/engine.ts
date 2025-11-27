import { mockProfiles } from "@/data/mock-profiles";
import {
  Answer,
  BigFiveScores,
  DiagnosisPayload,
  MatchingResult,
  PersonalityTypeDefinition,
} from "@/types/diagnosis";
import {
  determinePersonalityType,
  estimateProfileScores,
  getTogelLabel,
  snapshotPersonalityType,
} from "@/lib/personality";

type TraitKey = keyof BigFiveScores;

const TRAITS: TraitKey[] = ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"];

const traitKeyMap: Record<string, TraitKey> = {
  o: "openness",
  c: "conscientiousness",
  e: "extraversion",
  a: "agreeableness",
  n: "neuroticism",
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

  return {
    personality: Math.round(traitCompatibility),
    valueAlignment: Math.round(valueScore),
    communication: Math.round(commScore),
    totalCompatibility: Math.round(totalScore),
    compatibilityReason: generate24TypeCompatibilityReason(userType, profileType, Math.round(totalScore)),
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

function generate24TypeCompatibilityReason(
  userType: PersonalityTypeDefinition,
  profileType: PersonalityTypeDefinition,
  score: number,
): string {
  const userLabel = getTogelLabel(userType.id);
  const profileLabel = getTogelLabel(profileType.id);
  const commonValues = getCommonValues(userType, profileType);
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

  if (commonValues.length >= 2) {
    reason += `。お互いの${commonValues.join("と")}を大切にする価値観が共通しており、深い理解関係が築けそう。`;
  } else if (commonValues.length === 1) {
    reason += `。${commonValues[0]}という価値観を共有しており、良い出会いになる可能性が高い。`;
  }

  if (userType.compatibleTypes.includes(profileType.id)) {
    reason += " AIが推奨する好相性ペアに含まれており、互いの個性が新鮮な刺激を与え合う予感。";
  }

  return reason.trim();
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

export const generateMatchingResults = async (
  payload: DiagnosisPayload,
): Promise<MatchingResult[]> => {
  const userScores = calculateBigFiveScores(payload.answers);
  const userType = determinePersonalityType(userScores);

  const oppositeGender = payload.userGender === "male" ? "female" : "male";
  const filteredProfiles = mockProfiles.filter((profile) => profile.gender === oppositeGender);

  const computed = filteredProfiles.map((profile) => {
    const profileScores = estimateProfileScores(profile);
    const profileType = determinePersonalityType(profileScores);
    const compatibility = calculate24TypeCompatibility(userType, userScores, profileScores, profileType);
    const personalizedInsights = generatePersonalizedInsights(userType, profileType, compatibility);

    return {
      ranking: 0,
      score: compatibility.totalCompatibility,
      profile,
      summary: compatibility.compatibilityReason,
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
): { bigFiveScores: BigFiveScores; personalityType: PersonalityTypeDefinition } => {
  const scores = calculateBigFiveScores(payload.answers);
  const type = determinePersonalityType(scores);
  return {
    bigFiveScores: scores,
    personalityType: snapshotPersonalityType(type),
  };
};
