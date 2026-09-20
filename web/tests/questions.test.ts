import { test } from "node:test";
import assert from "node:assert/strict";

import { getQuestionsByType } from "../src/data/questions";
import { calculateBigFiveScores } from "../src/lib/personality/score";
import { TOGEL_INDEX } from "../src/lib/personality/togel-index";
import type { DiagnosisQuestion } from "../src/types/diagnosis";

/**
 * 設問と採点。
 *
 * ここが壊れていたとき、**性格ではなく回答スタイルでタイプが決まっていた**。
 * 全問が正方向だったため、「はい」と答えがちな人は全員タイシ型、
 * 「いいえ」寄りの人は全員レーダ型に落ちていた（実測）。
 * その壊れ方そのものを検査にする。
 */

const TRAITS = [
  "openness",
  "conscientiousness",
  "extraversion",
  "agreeableness",
  "neuroticism",
] as const;

const diagnose = (plan: "light" | "full", value: (q: DiagnosisQuestion, i: number) => number) => ({
  bigFiveScores: calculateBigFiveScores(
    getQuestionsByType(plan).map((question, index) => ({
      questionId: question.id,
      value: value(question, index),
    })),
  ),
});

/* ===== 🔴 番人: 回答スタイルがタイプを決めないこと ===== */

/**
 * 一律に同じ値で答えた人は、**どの値でも同じ結果**になる。
 *
 * 一見すると「収束している」ので危なく見えるが、向きが逆である。
 * 一律回答は情報を持たないので、**どの軸も立たない**のが正しい。
 * 壊れていたときは値ごとに別々の「性格タイプ」が出ていて、
 * それは測定ではなく答え方を読んでいた。
 *
 * ここで見るのは「値ごとに違うタイプが出ないこと」。
 * もし違うタイプが出るなら、回答スタイルがタイプを決めている。
 */
test("一律回答は、どの値でも軸が1つも立たない（回答スタイルを性格として読まない）", () => {
  for (const plan of ["light", "full"] as const) {
    const scores = [1, 2, 3, 4, 5].map((value) => diagnose(plan, () => value).bigFiveScores);

    for (const [index, score] of scores.entries()) {
      for (const trait of TRAITS) {
        assert.ok(
          score[trait] > 2 && score[trait] < 4,
          `${plan} 全部${index + 1}: ${trait} が ${score[trait]} で、高低の判定が立っている`,
        );
      }
    }
  }
});

test("一律回答の素点は、5段階のどれでも中央の近くに収まる", () => {
  for (const plan of ["light", "full"] as const) {
    const highest = diagnose(plan, () => 5).bigFiveScores;
    const lowest = diagnose(plan, () => 1).bigFiveScores;
    for (const trait of TRAITS) {
      assert.ok(
        Math.abs(highest[trait] - 3) <= 0.5 && Math.abs(lowest[trait] - 3) <= 0.5,
        `${plan} ${trait}: 全部5→${highest[trait]} 全部1→${lowest[trait]}`,
      );
    }
  }
});

/**
 * 一方、**一貫して答えた人**は端まで届く。
 * 逆転項目を入れたことで極端な人まで中央に寄ってしまっては、測定にならない。
 */
test("一貫して答えた人は、素点が端まで届く", () => {
  for (const plan of ["light", "full"] as const) {
    // その軸が高い人 = 正方向に5、逆転項目に1
    const high = diagnose(plan, (q) => (q.reverse ? 1 : 5)).bigFiveScores;
    const low = diagnose(plan, (q) => (q.reverse ? 5 : 1)).bigFiveScores;
    for (const trait of TRAITS) {
      assert.equal(high[trait], 5, `${plan} ${trait} の上限`);
      assert.equal(low[trait], 1, `${plan} ${trait} の下限`);
    }
  }
});

/* ===== 逆転項目の構成 ===== */

test("逆転項目が各軸にある（full 3問 / light 1問）", () => {
  const expected = { full: 3, light: 1 } as const;
  for (const plan of ["light", "full"] as const) {
    for (const trait of TRAITS) {
      const items = getQuestionsByType(plan).filter((q) => q.trait === trait);
      const reversed = items.filter((q) => q.reverse).length;
      assert.equal(reversed, expected[plan], `${plan} ${trait}: 逆転 ${reversed}問`);
    }
  }
});

test("設問数は増えていない（light 10 / full 40）", () => {
  assert.equal(getQuestionsByType("light").length, 10);
  assert.equal(getQuestionsByType("full").length, 40);
});

test("light の設問は full にそのまま含まれる（逆転の印も含めて）", () => {
  const full = new Map(getQuestionsByType("full").map((q) => [q.id, q]));
  for (const question of getQuestionsByType("light")) {
    const counterpart = full.get(question.id);
    assert.ok(counterpart, `${question.id} が full に無い`);
    assert.equal(counterpart.text, question.text, question.id);
    assert.equal(counterpart.trait, question.trait, question.id);
    assert.equal(Boolean(counterpart.reverse), Boolean(question.reverse), question.id);
  }
});

/* ===== 採点の作り ===== */

/**
 * 以前は設問IDの1文字目で軸を引いていて、設問オブジェクトを見ていなかった。
 * そのため `reverse` を定義しても採点側から見えなかった。
 * IDの命名規則に依存していないことを、逆転項目の効き方で確かめる。
 */
test("逆転項目は 6 - value として数えられる", () => {
  const plan = "full";
  const items = getQuestionsByType(plan);
  const reversed = items.find((q) => q.reverse && q.trait === "openness");
  assert.ok(reversed, "開放性の逆転項目が無い");

  // 逆転項目にだけ 5、他は 3
  const a = diagnose(plan, (q) => (q.id === reversed.id ? 5 : 3)).bigFiveScores.openness;
  // 逆転項目にだけ 1、他は 3
  const b = diagnose(plan, (q) => (q.id === reversed.id ? 1 : 3)).bigFiveScores.openness;

  assert.ok(a < 3, `逆転項目に5と答えて素点が上がっている（${a}）`);
  assert.ok(b > 3, `逆転項目に1と答えて素点が下がっている（${b}）`);
  assert.equal(Number((a + b).toFixed(2)), 6, "6 - value の対称になっていない");
});

test("現行の設問に無いIDは数えない", () => {
  const base = diagnose("full", () => 3).bigFiveScores;
  const withGhost = calculateBigFiveScores([
    ...getQuestionsByType("full").map((q) => ({ questionId: q.id, value: 3 })),
    { questionId: "o1", value: 5 }, // 差し替え前のID
    { questionId: "zzz", value: 5 },
  ]);
  assert.deepEqual(withGhost, base);
});

/* ===== 尺度のラベル ===== */

test("5段階のラベルが「当てはまるか」で揃っている", () => {
  const labels = getQuestionsByType("full")[0].options.map((option) => option.label);
  assert.deepEqual(labels, [
    "まったく当てはまらない",
    "あまり当てはまらない",
    "どちらでもない",
    "少し当てはまる",
    "よく当てはまる",
  ]);
  // 「違う」と「当てはまる」の混在に戻さない。2が肯定寄りに読める状態を許さない
  assert.ok(!labels.some((label) => label.includes("違")), "「違う」系の語が混ざっている");
});

test("すべての設問が同じ5段階を使う", () => {
  for (const plan of ["light", "full"] as const) {
    for (const question of getQuestionsByType(plan)) {
      assert.deepEqual(
        question.options.map((option) => option.value),
        [1, 2, 3, 4, 5],
        question.id,
      );
    }
  }
});

/* ===== 表示の反転と、設問の逆転を混同しない ===== */

test("表示の反転は神経症傾向だけで、設問の逆転とは別物", () => {
  const inverted = TOGEL_INDEX.filter((axis) => axis.inverted).map((axis) => axis.key);
  assert.deepEqual(inverted, ["neuroticism"]);

  // 神経症傾向にも逆転項目はあるが、それは採点側の話。表示の反転と二重にかからない
  const reversedTraits = new Set(
    getQuestionsByType("full").filter((q) => q.reverse).map((q) => q.trait),
  );
  assert.equal(reversedTraits.size, TRAITS.length, "逆転項目が一部の軸にしかない");
});
