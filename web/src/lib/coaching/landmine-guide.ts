import { personalityTypes } from "@/lib/personality";
import type { ExtendedPersonalityTypeDefinition } from "@/lib/personality/definitions";

/**
 * 地雷回避ガイド（コーチングコンテンツのデータ層）
 *
 * 「合わないタイプとどう付き合うか」を、既存の24タイプ定義から決定的に組成する。
 * AI API は使わない（コストゼロ運用）。UIはデザイン納品後に実装する。
 */

export type LandmineTarget = {
  typeId: string;
  typeName: string;
  emoji: string;
  catchphrase: string;
  tags: string[];
  /** なぜあなたにとって地雷なのか */
  whyDangerous: string[];
  /** それでも付き合うためのルール */
  survivalRules: string[];
  /** 絶対にやってはいけないこと */
  ngActions: string[];
};

export type LandmineGuide = {
  self: {
    typeId: string;
    typeName: string;
    emoji: string;
    catchphrase: string;
  };
  /** あなたの側の「地雷を踏みやすい癖」 */
  selfWarnings: string[];
  targets: LandmineTarget[];
};

const findType = (id: string): ExtendedPersonalityTypeDefinition | null =>
  personalityTypes.find((t) => t.id === id) ?? null;

/** 同じ組み合わせなら常に同じ結果を返すための決定的ハッシュ */
const hashPick = <T,>(items: T[], seedKey: string, count: number): T[] => {
  if (items.length <= count) return items;
  let hash = 0;
  for (let i = 0; i < seedKey.length; i++) {
    hash = (hash << 5) - hash + seedKey.charCodeAt(i);
    hash = hash & hash;
  }
  const start = Math.abs(hash) % items.length;
  const picked: T[] = [];
  for (let i = 0; i < count; i++) {
    picked.push(items[(start + i) % items.length]);
  }
  return picked;
};

const buildWhyDangerous = (
  self: ExtendedPersonalityTypeDefinition,
  target: ExtendedPersonalityTypeDefinition,
): string[] => {
  const reasons: string[] = [];
  reasons.push(
    `あなたは「${self.characteristics.communication}」。一方相手は「${target.characteristics.communication}」。会話のテンポが根本的に噛み合いません。`,
  );
  reasons.push(
    `相手の行動原理は「${target.characteristics.workStyle}」。あなたの「${self.characteristics.workStyle}」とは進み方が真逆です。`,
  );
  if (target.characteristics.growthAreas[0]) {
    reasons.push(
      `相手の弱点「${target.characteristics.growthAreas[0]}」は、あなたが一番イライラするポイントを正確に突いてきます。`,
    );
  }
  return reasons;
};

const buildSurvivalRules = (
  self: ExtendedPersonalityTypeDefinition,
  target: ExtendedPersonalityTypeDefinition,
): string[] => {
  const rules: string[] = [];
  if (target.characteristics.strengths[0]) {
    rules.push(
      `相手の「${target.characteristics.strengths[0]}」だけを見る。他の面を直そうとした瞬間に戦争が始まります。`,
    );
  }
  rules.push(
    `相手の対人スタンスは「${target.characteristics.relationships}」。あなたのやり方に引き込もうとせず、これを仕様として受け入れること。`,
  );
  if (self.characteristics.growthAreas[0]) {
    rules.push(
      `あなたの「${self.characteristics.growthAreas[0]}」は、この相手の前では特に発動しやすい。自覚するだけで衝突は半分に減ります。`,
    );
  }
  rules.push("距離感がすべて。「仲良くなる」より「揉めない距離を保つ」が正解の相手です。");
  return rules;
};

const buildNgActions = (
  self: ExtendedPersonalityTypeDefinition,
  target: ExtendedPersonalityTypeDefinition,
): string[] => {
  const pool: string[] = [
    `相手を変えようとしない。「${target.catchphrase}」は生まれつきです。`,
    "正論で追い詰めない。勝っても得るものはありません。",
    `2人きりの長時間イベントを企画しない。${target.emoji}×${self.emoji}の密室は事故現場になります。`,
    "SNSで相手のタイプの悪口を書かない。100%本人に届きます。",
    "「なんで分かってくれないの」と言わない。分からないから地雷なのです。",
  ];
  return hashPick(pool, `${self.id}:${target.id}`, 3);
};

const buildSelfWarnings = (self: ExtendedPersonalityTypeDefinition): string[] => {
  const warnings: string[] = [];
  for (const area of self.characteristics.growthAreas.slice(0, 2)) {
    warnings.push(`「${area}」— あなたが地雷を踏むときは、大抵これが原因です。`);
  }
  warnings.push(
    `あなたのコミュニケーションは「${self.characteristics.communication}」。これを心地よく感じない人が一定数いる、という自覚が最大の防具になります。`,
  );
  return warnings;
};

/** 指定タイプの地雷回避ガイドを組成する。不明なタイプは null。 */
export const getLandmineGuide = (typeId: string): LandmineGuide | null => {
  const self = findType(typeId);
  if (!self) return null;

  const targets = self.badCompatibleTypes
    .map((id) => findType(id))
    .filter((t): t is ExtendedPersonalityTypeDefinition => Boolean(t))
    .map((target) => ({
      typeId: target.id,
      typeName: target.typeName,
      emoji: target.emoji,
      catchphrase: target.catchphrase,
      tags: target.tags,
      whyDangerous: buildWhyDangerous(self, target),
      survivalRules: buildSurvivalRules(self, target),
      ngActions: buildNgActions(self, target),
    }));

  return {
    self: {
      typeId: self.id,
      typeName: self.typeName,
      emoji: self.emoji,
      catchphrase: self.catchphrase,
    },
    selfWarnings: buildSelfWarnings(self),
    targets,
  };
};

/** 全24タイプ分のガイド（静的生成・sitemap用） */
export const getAllLandmineGuides = (): LandmineGuide[] =>
  personalityTypes
    .map((t) => getLandmineGuide(t.id))
    .filter((g): g is LandmineGuide => Boolean(g));
