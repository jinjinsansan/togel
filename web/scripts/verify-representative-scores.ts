/**
 * タイプ代表値（lib/personality/representative-scores.ts）の検算スクリプト。
 *
 *   npx tsx scripts/verify-representative-scores.ts
 *
 * 代表値は判定エンジン（determinePersonalityType）の入力空間 5軸×5段階＝3125通りを
 * 走査し、そのタイプに落ちる入力の平均を取ったもの。新しい数値を作っていないことを
 * 再現可能な形で示すためのスクリプトであり、以下3点を機械検証する。
 *
 *   1. 24タイプの5指標が全タイプ同一値に潰れていないこと
 *   2. 各タイプの高い軸が dominantTraits と矛盾していないこと
 *   3. 耐圧限界（neuroticism）の反転が二重適用されていないこと
 */

import { personalityTypes } from "../src/lib/personality/definitions";
import { representativeScores } from "../src/lib/personality/representative-scores";
import { TOGEL_INDEX, togelIndexPercent } from "../src/lib/personality/togel-index";
import type { BigFiveScores } from "../src/types/diagnosis";

type AxisKey = keyof BigFiveScores;

/** dominantTraits の語 → 対応する軸。判定が割れる語（内省・感受性など）は意図的に入れない */
const TRAIT_TO_AXIS: Record<string, AxisKey> = {
  開放性: "openness",
  オープンマインド: "openness",
  創造性: "openness",
  想像力: "openness",
  芸術性: "openness",
  詩的感覚: "openness",
  探求心: "openness",
  知的探求: "openness",
  知性探求: "openness",
  文化的理解: "openness",
  哲学性: "openness",
  超越性: "openness",
  遠見: "openness",
  堅実性: "conscientiousness",
  秩序: "conscientiousness",
  秩序重視: "conscientiousness",
  整理整頓: "conscientiousness",
  組織力: "conscientiousness",
  体系的: "conscientiousness",
  実行力: "conscientiousness",
  専門性: "conscientiousness",
  職人気質: "conscientiousness",
  信頼性: "conscientiousness",
  安定性: "conscientiousness",
  外向性: "extraversion",
  外交性: "extraversion",
  社交性: "extraversion",
  社交的エネルギー: "extraversion",
  能動性: "extraversion",
  カリスマ: "extraversion",
  伝達力: "extraversion",
  ネットワーク: "extraversion",
  コミュニティ: "extraversion",
  協調性: "agreeableness",
  調整力: "agreeableness",
  社会的気配り: "agreeableness",
  社会的柔軟性: "agreeableness",
  良心: "agreeableness",
  守護者: "agreeableness",
  建設性: "agreeableness",
};

const fmt = (value: number) => value.toFixed(2);
const failures: string[] = [];

// ---- 1. 全タイプ同一値に潰れていないか -------------------------------------
const vectors = personalityTypes.map((type) => {
  const scores = representativeScores(type.id);
  return { type, scores, key: TOGEL_INDEX.map(({ key }) => fmt(scores[key])).join("/") };
});
const distinct = new Set(vectors.map((entry) => entry.key));
console.log(`[1] 相異なる代表値ベクトル: ${distinct.size} / ${personalityTypes.length}`);
if (distinct.size < personalityTypes.length) {
  const counts = new Map<string, string[]>();
  vectors.forEach(({ type, key }) => counts.set(key, [...(counts.get(key) ?? []), type.id]));
  for (const [key, ids] of counts) {
    if (ids.length > 1) console.log(`    重複: ${key} ← ${ids.join(", ")}`);
  }
}
if (distinct.size === 1) failures.push("[1] 全タイプが同一の代表値に潰れている");

// 軸ごとのばらつき（レンジがゼロだとバーが全タイプ同じ絵になる）
for (const { key, label } of TOGEL_INDEX) {
  const values = vectors.map((entry) => entry.scores[key]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  console.log(`    ${label}: min ${fmt(min)} / max ${fmt(max)} / range ${fmt(max - min)}`);
  if (max - min < 0.2) failures.push(`[1] ${label} のレンジが狭すぎる（${fmt(max - min)}）`);
}

// ---- 2. dominantTraits と矛盾していないか ----------------------------------
let checked = 0;
console.log("[2] dominantTraits との整合");
for (const { type, scores } of vectors) {
  for (const trait of type.dominantTraits) {
    const axis = TRAIT_TO_AXIS[trait];
    if (!axis) continue;
    checked += 1;
    // 中央値3.0を下回っていたら「その特性が強い」という定義と矛盾する
    if (scores[axis] < 3.0) {
      failures.push(
        `[2] ${type.id}: dominantTraits「${trait}」に対し ${axis}=${fmt(scores[axis])}（<3.0）`,
      );
    }
  }
}
console.log(`    判定できた語: ${checked} 件 / 矛盾: ${failures.filter((f) => f.startsWith("[2]")).length} 件`);

// ---- 3. 耐圧限界の反転が二重適用されていないか ------------------------------
console.log("[3] 耐圧限界の反転");
const probe = (neuroticism: number): BigFiveScores => ({
  openness: 3,
  conscientiousness: 3,
  extraversion: 3,
  agreeableness: 3,
  neuroticism,
});
const low = togelIndexPercent("neuroticism", probe(1));
const high = togelIndexPercent("neuroticism", probe(5));
const mid = togelIndexPercent("neuroticism", probe(3));
console.log(`    neuroticism 1 → ${low} / 3 → ${mid} / 5 → ${high}（期待: 80 / 40 / 0）`);
if (low !== 80 || mid !== 40 || high !== 0) {
  failures.push(`[3] 反転の適用が期待とずれている（${low}/${mid}/${high}）`);
}
// 反転しない軸が素通しであることも確認（反転ロジックの誤爆検知）
const openLow = togelIndexPercent("openness", probe(3));
console.log(`    openness 3 → ${openLow}（期待: 60・反転なし）`);
if (openLow !== 60) failures.push(`[3] 非反転軸に反転が適用されている（${openLow}）`);

// ---- 結果 -------------------------------------------------------------------
console.log("");
if (failures.length === 0) {
  console.log("PASS: 3点すべて問題なし");
} else {
  console.log(`FAIL: ${failures.length} 件`);
  failures.forEach((failure) => console.log(`  - ${failure}`));
  process.exitCode = 1;
}
