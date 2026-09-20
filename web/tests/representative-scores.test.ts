import { test } from "node:test";
import assert from "node:assert/strict";

import { personalityTypes, representativeScores } from "../src/lib/personality";
import { TOGEL_INDEX, togelIndexPercent } from "../src/lib/personality/togel-index";
import type { BigFiveScores } from "../src/types/diagnosis";

/**
 * タイプ代表値（診断していない人に見せる5指標）。
 * 判定エンジンからの逆算なので、エンジン側が変わると黙ってずれる。ここで留める。
 */

/** dominantTraits の語 → 軸。判定が割れる語は入れない */
const TRAIT_TO_AXIS: Record<string, keyof BigFiveScores> = {
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
  遠見: "openness",
  堅実性: "conscientiousness",
  秩序: "conscientiousness",
  秩序重視: "conscientiousness",
  整理整頓: "conscientiousness",
  組織力: "conscientiousness",
  体系的: "conscientiousness",
  実行力: "conscientiousness",
  専門性: "conscientiousness",
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
  良心: "agreeableness",
  守護者: "agreeableness",
  建設性: "agreeableness",
};

test("24タイプの代表値が同一に潰れていない", () => {
  const keys = personalityTypes.map((type) => {
    const scores = representativeScores(type.id);
    return TOGEL_INDEX.map(({ key }) => scores[key].toFixed(2)).join("/");
  });
  assert.equal(new Set(keys).size, personalityTypes.length);
});

test("どの軸にも十分なばらつきがある（バーが全タイプ同じ絵にならない）", () => {
  for (const { key, label } of TOGEL_INDEX) {
    const values = personalityTypes.map((type) => representativeScores(type.id)[key]);
    assert.ok(Math.max(...values) - Math.min(...values) >= 0.2, label);
  }
});

test("代表値が dominantTraits と矛盾しない", () => {
  const failures: string[] = [];
  for (const type of personalityTypes) {
    const scores = representativeScores(type.id);
    for (const trait of type.dominantTraits) {
      const axis = TRAIT_TO_AXIS[trait];
      if (!axis) continue;
      if (scores[axis] < 3.0) failures.push(`${type.id}: ${trait} → ${axis}=${scores[axis]}`);
    }
  }
  assert.deepEqual(failures, []);
});

test("耐圧限界の反転が1回だけ適用される", () => {
  const probe = (neuroticism: number): BigFiveScores => ({
    openness: 3,
    conscientiousness: 3,
    extraversion: 3,
    agreeableness: 3,
    neuroticism,
  });
  assert.equal(togelIndexPercent("neuroticism", probe(1)), 100);
  assert.equal(togelIndexPercent("neuroticism", probe(3)), 60);
  assert.equal(togelIndexPercent("neuroticism", probe(5)), 20);
  // 反転しない軸には適用されない
  assert.equal(togelIndexPercent("openness", probe(3)), 60);
});

/**
 * 反転する軸としない軸で、表示値の取りうる範囲が同じであること。
 *
 * これが無かったために、反転を `100 - pct` で実装していた時期は
 * 耐圧限界だけ 0〜80%、他の軸は 20〜100% と土俵が違っていた。
 * 結果、**24タイプのどれ一つとして耐圧限界が最長にならず**（最短は13タイプ）、
 * 「何が起きても動じない」はずのマッチャ型でも耐圧限界が緩衝性能に負けていた。
 *
 * 目視では出ない。バーの長さが「そのタイプらしいか」は24枚並べても分からず、
 * 5軸を数値で並べて最長・最短を数えて初めて出た欠陥なので、数で留める。
 */
test("5軸とも表示値の範囲が同じ（反転する軸だけ土俵が違わない）", () => {
  const uniform = (value: number): BigFiveScores => ({
    openness: value,
    conscientiousness: value,
    extraversion: value,
    agreeableness: value,
    neuroticism: value,
  });
  const ranges = TOGEL_INDEX.map(({ key, label }) => {
    const values = [1, 2, 3, 4, 5].map((v) => togelIndexPercent(key, uniform(v)));
    return { label, min: Math.min(...values), max: Math.max(...values) };
  });
  for (const range of ranges) {
    assert.equal(range.min, ranges[0].min, `${range.label} の下限が他の軸と違う`);
    assert.equal(range.max, ranges[0].max, `${range.label} の上限が他の軸と違う`);
  }
});

test("どの指標も、最長になれるタイプが1つ以上ある", () => {
  const longest = new Map<string, number>();
  for (const type of personalityTypes) {
    const scores = representativeScores(type.id);
    const bars = TOGEL_INDEX.map(({ key, label }) => ({
      label,
      pct: togelIndexPercent(key, scores),
    }));
    const max = Math.max(...bars.map((bar) => bar.pct));
    for (const bar of bars.filter((b) => b.pct === max)) {
      longest.set(bar.label, (longest.get(bar.label) ?? 0) + 1);
    }
  }
  const never = TOGEL_INDEX.filter(({ label }) => !longest.has(label)).map((a) => a.label);
  assert.deepEqual(never, [], "この指標が最長になるタイプが1つも無い");
});
