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
  badCompatibleTypes: [...type.badCompatibleTypes],
  tags: [...type.tags],
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

// プロフィールIDからシードベースの疑似ランダムスコアを生成
// 同じIDなら常に同じスコアだが、ID間では大きくバラける
function generateSeededScore(seed: string, trait: string): number {
  // シードとトレイト名を組み合わせてハッシュ生成
  let hash = 0;
  const combined = seed + trait;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash << 5) - hash + combined.charCodeAt(i);
    hash = hash & hash;
  }
  
  // 0〜1の範囲に正規化
  const normalized = Math.abs(hash % 10000) / 10000;
  
  // 1.0〜5.0の範囲に変換（極端な値も含む）
  // 正規分布ではなく均等分布にして、極端な値も出やすくする
  return 1.0 + normalized * 4.0;
}

export const estimateProfileScores = (profile: MatchingProfile): BigFiveScores => {
  // IDベースでランダムだが一貫性のあるスコアを生成
  const baseScores: BigFiveScores = {
    openness: generateSeededScore(profile.id, "openness"),
    conscientiousness: generateSeededScore(profile.id, "conscientiousness"),
    extraversion: generateSeededScore(profile.id, "extraversion"),
    agreeableness: generateSeededScore(profile.id, "agreeableness"),
    neuroticism: generateSeededScore(profile.id, "neuroticism"),
  };

  // プロフィール情報から微調整（±0.3程度）
  const adjustments: BigFiveScores = { ...baseScores };

  // 趣味から開放性を調整
  if (profile.hobbies?.includes("アート") || profile.hobbies?.includes("音楽") || profile.hobbies?.includes("旅行")) {
    adjustments.openness += 0.3;
  }
  if (profile.hobbies?.includes("読書") || profile.hobbies?.includes("ゲーム")) {
    adjustments.openness -= 0.2;
  }

  // 仕事から誠実性を調整
  if (profile.job?.includes("経営") || profile.job?.includes("エンジニア") || profile.specialSkills?.includes("計画")) {
    adjustments.conscientiousness += 0.3;
  }
  if (profile.job?.includes("アーティスト") || profile.job?.includes("フリーランス")) {
    adjustments.conscientiousness -= 0.2;
  }

  // 趣味や性格から外向性を調整
  if (profile.interests?.includes("スポーツ") || profile.interests?.includes("パーティー") || profile.communication?.includes("積極的")) {
    adjustments.extraversion += 0.3;
  }
  if (profile.hobbies?.includes("読書") || profile.hobbies?.includes("映画鑑賞") || profile.communication?.includes("穏やか")) {
    adjustments.extraversion -= 0.2;
  }

  // bioから協調性を調整
  if (profile.bio?.includes("優しい") || profile.bio?.includes("助ける") || profile.values?.includes("思いやり")) {
    adjustments.agreeableness += 0.3;
  }
  if (profile.bio?.includes("率直") || profile.bio?.includes("はっきり")) {
    adjustments.agreeableness -= 0.2;
  }

  // ストレス管理から神経症傾向を調整
  if (profile.specialSkills?.includes("ストレス管理") || profile.communication?.includes("穏やか") || profile.hobbies?.includes("ヨガ") || profile.hobbies?.includes("瞑想")) {
    adjustments.neuroticism -= 0.3;
  }
  if (profile.bio?.includes("心配") || profile.bio?.includes("不安")) {
    adjustments.neuroticism += 0.3;
  }

  // 最終的に0.5〜5.0の範囲に収める（極端な値も許容）
  (Object.keys(adjustments) as Array<keyof BigFiveScores>).forEach((trait) => {
    adjustments[trait] = Math.max(0.5, Math.min(5.0, adjustments[trait]));
    // 小数点第1位まで
    adjustments[trait] = Math.round(adjustments[trait] * 10) / 10;
  });

  return adjustments;
};

export const snapshotPersonalityType = (type: PersonalityTypeDefinition): PersonalityTypeDefinition => {
  return clonePersonalityType(type);
};

export const getTogelLabel = (typeId: string): string => {
  const index = getTypeIndex(typeId);
  if (index === -1) {
    return "Togel 00型";
  }
  const typeNumber = index + 1;
  const paddedNumber = String(typeNumber).padStart(2, "0");
  return `Togel ${paddedNumber}型`;
};

export const getTogelDescription = (typeId: string): string => {
  const type = personalityTypes.find((item) => item.id === typeId);
  if (!type) {
    return "このタイプの詳細データは準備中です。";
  }
  return type.description;
};
