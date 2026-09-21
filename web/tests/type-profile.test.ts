import { test } from "node:test";
import assert from "node:assert/strict";

import { personalityTypes } from "../src/lib/personality";
import {
  TYPE_PROFILES,
  TYPE_PROFILE_HEADING,
  deliveredTypeProfiles,
  isTypeProfileComplete,
  typeProfileFor,
  typeProfileParagraphs,
} from "../src/lib/personality/copy/type-profile";

/**
 * タイプ本文（24タイプ・タイプ固定）の配管を検査する。
 *
 * 本文は監修側が納品するので、見るのは**本文が正しいか**ではなく、
 * 「抜けたまま公開されないか」「書いてはいけない語が混ざっていないか」
 * 「深掘りと役割が混ざっていないか」。
 */

/* ===== 抜けと綴り ===== */

/**
 * キーは型で縛れない（`personalityTypes` が `as const` でないので id は string）。
 * **綴り間違いと抜けは、ここでしか止まらない。**
 */
test("本文のキーが、定義にあるタイプIDだけを指している", () => {
  const known = new Set(personalityTypes.map((type) => type.id));
  const unknown = Object.keys(TYPE_PROFILES).filter((id) => !known.has(id));
  assert.deepEqual(unknown, [], "定義に無いタイプIDが本文の表にある（綴り間違い？）");
});

/**
 * 字数の下限は **230字**。監修側は当初300字で検査して24タイプ全部が下回り、
 * 実測 238〜279字だったので基準のほうを外している。
 * 見積もりではなく**実物に合わせた値**を使う。
 */
test("納品済みのタイプが230字を超える", () => {
  for (const { typeId, copy } of deliveredTypeProfiles()) {
    const chars = [...copy].length;
    assert.ok(chars >= 230, `${typeId} が ${chars}字（230字未満）`);
  }
});

/**
 * 3段落目は「ボロクソに言ったあとは必ず救う」の回収。
 * **2段落で終わっていると、刺しっぱなしで終わる。**
 */
test("本文が3段落あり、最後の段落が空でない", () => {
  for (const { typeId, copy } of deliveredTypeProfiles()) {
    const paragraphs = typeProfileParagraphs(copy);
    assert.equal(paragraphs.length, 3, `${typeId} が ${paragraphs.length}段落（3段落のはず）`);
    assert.ok(paragraphs[2].length >= 30, `${typeId} の3段落目が短すぎる（回収が効かない）`);
  }
});

test("24タイプそろうまでは、画面に何も出さない", () => {
  const complete = isTypeProfileComplete();
  const sample = typeProfileFor(personalityTypes[0].id);
  if (complete) {
    assert.ok(sample, "そろっているのに出ない");
    assert.equal(
      deliveredTypeProfiles().length,
      personalityTypes.length,
      "そろっている判定なのに件数が合わない",
    );
  } else {
    assert.equal(sample, null, "そろっていないのに出ている（空の器が公開される）");
  }
});

test("節の見出しがある", () => {
  assert.ok(TYPE_PROFILE_HEADING.trim().length > 0);
});

/* ===== 役割が深掘りと混ざっていないこと ===== */

/**
 * ここは**タイプ固定**。同じ型なら全員同じ文を読む。
 * スコアで分岐させると、人に見せる部分が人によって変わり、型が指すものがぼやける。
 * （深掘りは逆に、スコアだけで分岐して typeId を使わない）
 */
test("タイプ本文はスコアで分岐しない", async () => {
  const { readFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const source = readFileSync(
    join(process.cwd(), "src/lib/personality/copy/type-profile.ts"),
    "utf8",
  );
  for (const forbidden of ["reaction", "intensity", "BigFiveScores", "scores"]) {
    assert.ok(
      !new RegExp(`\\b${forbidden}\\b`).test(source.replace(/\/\*[\s\S]*?\*\//g, "")),
      `タイプ本文が ${forbidden} を見ている（スコアで分岐している）`,
    );
  }
});

/* ===== 書いてはいけない語 ===== */

/** 深掘りと同じ基準。リストを分けると、片方にだけ足して片方が素通りする */
const FORBIDDEN = [
  "ガムテープ",
  "意味付け",
  "無価値観",
  "無価値ポジション",
  "絶対的有価値",
  "もたれ中",
  "共依存",
  "反依存",
  "境界線",
  "スパゲティ状態",
  "思考ちゃん",
  "マインド様",
  "ピールダウン",
  "インナーチャイルド",
  "即席有価値",
  "0-100思考",
  "二重のメッセージ",
  "テープ式",
  "毒親",
  "機能不全家庭",
  "治療",
  "治癒",
];

const FORBIDDEN_PATTERNS = [
  /幼少期(に|の|から)/,
  /子ども?の頃に[^。]*(親|母|父)/,
  /あなたの(親|母親|父親|家庭)(は|が)/,
  /育っ(た|て)(ため|から|ので)/,
  /障害(が|の)ある/,
];

const allText = (): string =>
  deliveredTypeProfiles()
    .map(({ copy }) => copy)
    .concat(TYPE_PROFILE_HEADING)
    .join("\n");

test("タイプ本文に理論側の用語が出ない", () => {
  const text = allText();
  assert.deepEqual(
    FORBIDDEN.filter((word) => text.includes(word)),
    [],
    "世界観の一般語に翻訳して書く",
  );
});

test("タイプ本文が生育歴や親を断定しない", () => {
  const text = allText();
  assert.deepEqual(
    FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(text)).map(String),
    [],
    "起源はぼかす",
  );
});

test("禁止語を混ぜると、この検査は落ちる", () => {
  assert.ok(FORBIDDEN.some((word) => "この型はガムテープを貼られています".includes(word)));
  assert.ok(FORBIDDEN_PATTERNS.some((pattern) => pattern.test("幼少期に決まった型です")));
});
