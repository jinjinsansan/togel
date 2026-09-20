import { BigFiveScores, MatchingProfile, PersonalityTypeDefinition } from "@/types/diagnosis";

import { personalityTypes } from "./definitions";
import { TYPE_PROTOTYPES } from "./prototypes";

/** 距離を測る5軸。BigFiveScores の全キー */
const TRAIT_KEYS = [
  "openness",
  "conscientiousness",
  "extraversion",
  "agreeableness",
  "neuroticism",
] as const satisfies readonly (keyof BigFiveScores)[];

const getTypeIndex = (id: string) => personalityTypes.findIndex((type) => type.id === id);

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

/**
 * 5軸のスコアから24タイプを決める。**最も近い原型のタイプ**を返す。
 *
 * 以前は if を積んだ判定木だった。入口が外向性の高低でしか開いておらず、
 * 外向性が中くらいの人には行き先が無い。その受け皿が末尾の
 * 「どれにも当てはまらない場合」で、**26.94% がそこに落ちていた**
 * （docs/ANALYSIS_2026-09-20_判定木の地図.md）。
 *
 * 距離は常に定義されるので、**行き先が無い人は原理的に生じない。**
 * フォールバックという分岐を持たないのが、この実装の要点である。
 * 割合を減らすのではなく、概念ごと消している。
 *
 * 原型は `prototypes.ts`。判定と表示で同じ値を使う（二重管理を作らない）。
 */
export const determinePersonalityType = (scores: BigFiveScores): PersonalityTypeDefinition => {
  let best = personalityTypes[0];
  let bestDistance = Infinity;

  // 距離が完全に等しいときは personalityTypes の並びで先に来るほうを採る。
  // 例外処理ではなく規則。比較を「より近いときだけ更新」にすることで、
  // 同点なら先に見たものが残る＝結果が入力順に依存しない
  for (const type of personalityTypes) {
    const prototype = TYPE_PROTOTYPES[type.id];
    const distance = TRAIT_KEYS.reduce(
      (sum, key) => sum + (scores[key] - prototype[key]) ** 2,
      0,
    );
    if (distance < bestDistance) {
      bestDistance = distance;
      best = type;
    }
  }

  return clonePersonalityType(best);
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
