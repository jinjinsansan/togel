import { BigFiveScores, MatchingProfile, PersonalityTypeDefinition } from "@/types/diagnosis";

import { personalityTypes } from "./definitions";

const getTypeIndex = (id: string) => personalityTypes.findIndex((type) => type.id === id);

const getPersonalityTypeById = (id: string): PersonalityTypeDefinition => {
  return personalityTypes.find((type) => type.id === id) ?? personalityTypes[0];
};

export const clonePersonalityType = (type: PersonalityTypeDefinition): PersonalityTypeDefinition => ({
  ...type,
  dominantTraits: [...type.dominantTraits],
  characteristics: {
    strengths: [...type.characteristics.strengths],
    growthAreas: [...type.characteristics.growthAreas],
    communication: type.characteristics.communication,
    workStyle: type.characteristics.workStyle,
    relationships: type.characteristics.relationships,
  },
  compatibleTypes: [...type.compatibleTypes],
});

export const determinePersonalityType = (scores: BigFiveScores): PersonalityTypeDefinition => {
  const high: string[] = [];
  const low: string[] = [];

  if (scores.openness >= 4) high.push("O");
  if (scores.openness <= 2) low.push("O");
  if (scores.conscientiousness >= 4) high.push("C");
  if (scores.conscientiousness <= 2) low.push("C");
  if (scores.extraversion >= 4) high.push("E");
  if (scores.extraversion <= 2) low.push("E");
  if (scores.agreeableness >= 4) high.push("A");
  if (scores.agreeableness <= 2) low.push("A");
  if (scores.neuroticism >= 4) high.push("N");
  if (scores.neuroticism <= 2) low.push("N");

  if (high.includes("E") && high.includes("O")) {
    if (high.includes("A")) return getPersonalityTypeById("social-innovator");
    if (high.includes("C")) return getPersonalityTypeById("visionary-executor");
    if (low.includes("N")) return getPersonalityTypeById("exploratory-connector");
    if (high.includes("N")) return getPersonalityTypeById("charismatic-enthusiast");
    return getPersonalityTypeById("creative-leader");
  }

  if (low.includes("E") && high.includes("O")) {
    if (high.includes("A")) return getPersonalityTypeById("introverted-artist");
    if (high.includes("C")) return getPersonalityTypeById("philosophical-curator");
    if (high.includes("N")) return getPersonalityTypeById("poetic-dreamer");
    if (low.includes("N")) return getPersonalityTypeById("depth-explorer");
    return getPersonalityTypeById("solvent-intellectual");
  }

  if (high.includes("E") && high.includes("C") && !high.includes("O")) {
    if (high.includes("A")) return getPersonalityTypeById("social-organizer");
    if (low.includes("A")) return getPersonalityTypeById("active-communicator");
    return getPersonalityTypeById("practical-leader");
  }

  if (high.includes("E") && high.includes("A") && !high.includes("C") && !high.includes("O")) {
    if (low.includes("N")) return getPersonalityTypeById("enthusiastic-networker");
    return getPersonalityTypeById("community-builder");
  }

  if (low.includes("E") && high.includes("C") && !high.includes("O")) {
    if (high.includes("A")) return getPersonalityTypeById("reliable-organizer");
    if (low.includes("A")) return getPersonalityTypeById("steady-specialist");
    return getPersonalityTypeById("methodical-thinker");
  }

  if (low.includes("E")) {
    if (low.includes("N") && high.includes("O")) return getPersonalityTypeById("depth-explorer");
    if (high.includes("N")) return getPersonalityTypeById("contemplative-sage");
    return getPersonalityTypeById("quiet-observer");
  }

  if (high.includes("O")) {
    if (high.includes("C") && high.includes("N")) return getPersonalityTypeById("solvent-intellectual");
    if (high.includes("A") && high.includes("N")) return getPersonalityTypeById("poetic-dreamer");
    return getPersonalityTypeById("philosophical-curator");
  }

  if (high.includes("A")) {
    if (high.includes("C")) return getPersonalityTypeById("conscientious-guardian");
    return getPersonalityTypeById("dedicated-crafter");
  }

  return getPersonalityTypeById("contemplative-sage");
};

export const estimateProfileScores = (profile: MatchingProfile): BigFiveScores => {
  const scores: BigFiveScores = {
    openness: 3,
    conscientiousness: 3,
    extraversion: 3,
    agreeableness: 3,
    neuroticism: 3,
  };

  if (profile.hobbies?.includes("アート") || profile.hobbies?.includes("音楽") || profile.hobbies?.includes("旅行")) {
    scores.openness += 1;
  }
  if (profile.job?.includes("経営") || profile.job?.includes("エンジニア") || profile.specialSkills?.includes("計画")) {
    scores.conscientiousness += 1;
  }
  if (profile.interests?.includes("スポーツ") || profile.interests?.includes("パーティー") || profile.communication?.includes("積極的")) {
    scores.extraversion += 1;
  }
  if (profile.bio?.includes("優しい") || profile.bio?.includes("助ける") || profile.values?.includes("思いやり")) {
    scores.agreeableness += 1;
  }
  if (profile.specialSkills?.includes("ストレス管理") || profile.communication?.includes("穏やか")) {
    scores.neuroticism -= 1;
  }

  (Object.keys(scores) as Array<keyof BigFiveScores>).forEach((trait) => {
    scores[trait] = Math.max(1, Math.min(5, scores[trait]));
  });

  return scores;
};

export const snapshotPersonalityType = (type: PersonalityTypeDefinition): PersonalityTypeDefinition => {
  return clonePersonalityType(type);
};

export const getTogelLabel = (typeId: string): string => {
  const index = getTypeIndex(typeId);
  if (index === -1) {
    return "Togel?型";
  }
  return `Togel${index + 1}型`;
};

export const getTogelDescription = (typeId: string): string => {
  const type = personalityTypes.find((item) => item.id === typeId);
  if (!type) {
    return "このタイプの詳細データは準備中です。";
  }
  return type.description;
};
