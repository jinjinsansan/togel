import { test } from "node:test";
import assert from "node:assert/strict";

import { personalityTypes } from "../src/lib/personality";
import { typeCards } from "../src/lib/personality/copy/cards-types";
import { reactionCards } from "../src/lib/personality/copy/cards-reactions";
import { deepNarrativeBridge } from "../src/lib/personality/copy/reaction-bridge";
import {
  EmphasisSyntaxError,
  parseEmphasis,
  plainText,
} from "../src/lib/personality/story/emphasis";
import {
  buildStoryFromKeys,
  STORY_LENGTH,
  type StoryCard,
} from "../src/lib/personality/story/cards";
import { HEAT_KEYS, INTENSITY_KEYS, REACTION_KEYS } from "../src/lib/personality/reaction";

/**
 * 結果ページのストーリーズ（全15枚）を検査する。
 *
 * 本文は監修側の納品物。ここで見るのは、**組み合わせたときに空にならないか**、
 * 強調記法が崩れていないか、書いてはいけない語が無いか。
 */

/* ===== 1枚のカードに含まれる文字列を全部取り出す ===== */

const stringsOf = (card: StoryCard): string[] => {
  switch (card.kind) {
    case "text":
    case "close":
      return [card.card.lead, card.card.big, card.card.mid, card.card.sub].filter(
        (s): s is string => typeof s === "string",
      );
    case "toc":
      return [card.big, card.sub, card.closing];
    case "diagram":
      return [card.diagram.event, card.diagram.meaning, ...card.diagram.rejected, card.diagram.closing];
    case "chips":
      return [card.chips.intro, ...card.chips.chips, card.chips.big, card.chips.sub].filter(
        (s): s is string => typeof s === "string",
      );
    default:
      return [];
  }
};

/** 全カードの全文字列（本文ファイル側から直接。組み合わせに出ない文字列も拾う） */
const allCopyStrings = (): string[] => {
  const out: string[] = [];
  const walk = (value: unknown) => {
    if (typeof value === "string") out.push(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") Object.values(value).forEach(walk);
  };
  walk(typeCards);
  walk(reactionCards);
  walk(deepNarrativeBridge);
  return out;
};

/* ===== 全組合せで15枚が埋まる ===== */

/**
 * 24タイプ × 5反応 × 3強度 × 2放熱 = **720通り**。1枚でも空なら落とす。
 *
 * 監修側の検査は文字列単位なので、**組み合わせたときに空になる経路**
 * （あるタイプだけキーが無い、ある放熱だけ枝が無い、など）はここでしか見えない。
 */
test("720通りすべてで15枚が埋まる", () => {
  const failures: string[] = [];
  let combos = 0;
  for (const type of personalityTypes) {
    for (const reaction of REACTION_KEYS) {
      for (const intensity of INTENSITY_KEYS) {
        for (const heat of HEAT_KEYS) {
          combos += 1;
          const key = `${type.id}/${reaction}/${intensity}/${heat}`;
          const story = buildStoryFromKeys({ typeId: type.id, reaction, intensity, heat });
          if (!story) {
            failures.push(`${key}: 組み立てられない`);
            continue;
          }
          if (story.length !== STORY_LENGTH) failures.push(`${key}: ${story.length}枚`);
          story.forEach((card, i) => {
            const strings = stringsOf(card);
            // 表紙・INDEX・「違います。」は本文を持たない（既存データと固定文で描く）
            if (["cover", "index", "chigau"].includes(card.kind)) return;
            if (strings.length === 0 || strings.some((s) => plainText(s).trim() === "")) {
              failures.push(`${key}: ${i + 1}枚目（${card.kind}）が空`);
            }
          });
        }
      }
    }
  }
  assert.equal(combos, 720, "組合せの数が 24×5×3×2 になっていない");
  assert.deepEqual(failures.slice(0, 10), [], `${failures.length}件`);
});

test("タイプ本文のキーが、定義にあるタイプIDとちょうど一致する", () => {
  const known = new Set(personalityTypes.map((type) => type.id));
  const keys = Object.keys(typeCards);
  assert.deepEqual(keys.filter((id) => !known.has(id)), [], "定義に無いタイプID（綴り間違い？）");
  assert.deepEqual([...known].filter((id) => !keys.includes(id)), [], "本文の無いタイプがある");
});

test("面の順番: 1〜9 暗、10〜12 明、13 ピンク、14〜15 明", () => {
  const story = buildStoryFromKeys({
    typeId: personalityTypes[0].id,
    reaction: "evaluation",
    intensity: "mid",
    heat: "high",
  })!;
  const faces = story.map((card) => card.face);
  assert.deepEqual(faces, [
    "dark", "dark", "dark", "dark", "dark", "dark", "dark", "dark", "dark",
    "light", "light", "light", "pink", "light", "light",
  ]);
  assert.equal(story[0].kind, "cover");
  assert.equal(story[12].kind, "chigau");
  assert.equal(story[14].kind, "close");
});

/* ===== 強調記法 〔 〕 ===== */

test("〔〕 の対応が全文字列で取れている", () => {
  const broken: string[] = [];
  for (const s of allCopyStrings()) {
    try {
      parseEmphasis(s);
    } catch (error) {
      if (error instanceof EmphasisSyntaxError) broken.push(s.slice(0, 40));
      else throw error;
    }
  }
  assert.deepEqual(broken, []);
});

test("解析後の文字列に 〔 〕 が残らない", () => {
  const leaked = allCopyStrings()
    .flatMap((s) => parseEmphasis(s).map((seg) => seg.text))
    .filter((text) => /[〔〕]/.test(text));
  assert.deepEqual(leaked, []);
});

test("〔〕 は改行をまたいでよく、崩れた記法は落ちる", () => {
  assert.deepEqual(parseEmphasis("前〔強調\nの続き〕後"), [
    { text: "前", emphasis: false },
    { text: "強調\nの続き", emphasis: true },
    { text: "後", emphasis: false },
  ]);
  assert.throws(() => parseEmphasis("〔閉じていない"), EmphasisSyntaxError);
  assert.throws(() => parseEmphasis("開いていない〕"), EmphasisSyntaxError);
  assert.throws(() => parseEmphasis("〔入れ〔子〕〕"), EmphasisSyntaxError);
});

/* ===== 書いてはいけない語（深掘りと同じ基準） ===== */

const FORBIDDEN = [
  "ガムテープ", "意味付け", "無価値観", "無価値ポジション", "絶対的有価値", "もたれ中",
  "共依存", "反依存", "境界線", "スパゲティ状態", "思考ちゃん", "マインド様", "ピールダウン",
  "インナーチャイルド", "即席有価値", "0-100思考", "二重のメッセージ", "テープ式",
  "毒親", "機能不全家庭", "治療", "治癒",
];
const FORBIDDEN_PATTERNS = [
  /幼少期(に|の|から)/,
  /子ども?の頃に[^。]*(親|母|父)/,
  /あなたの(親|母親|父親|家庭)(は|が)/,
  /育っ(た|て)(ため|から|ので)/,
  /障害(が|の)ある/,
];

test("カード本文に理論側の用語が出ない", () => {
  const text = allCopyStrings().map(plainText).join("\n");
  assert.deepEqual(FORBIDDEN.filter((word) => text.includes(word)), []);
});

test("カード本文が生育歴や親を断定しない", () => {
  const text = allCopyStrings().map(plainText).join("\n");
  assert.deepEqual(FORBIDDEN_PATTERNS.filter((p) => p.test(text)).map(String), []);
});

/**
 * 強度で分岐しているのは S1（7枚目）だけ。それ以外のカードは全強度の人が読むので、
 * 頻度を断定できない（S1 で「まれに刺さる」と書いた人に「何千回も」と続けると矛盾する）。
 */
test("強度で分岐しないカードに、反応の頻度を断定する語が無い", () => {
  const offenders: string[] = [];
  for (const reaction of REACTION_KEYS) {
    const r = reactionCards[reaction];
    const shared = [r.s2, r.s3a, r.s3b, r.s4.heatHigh.payoff, r.s4.heatLow.payoff];
    for (const card of shared) {
      const text = [card.lead, card.big, card.mid, card.sub].filter(Boolean).map((s) => plainText(s!)).join("");
      for (const word of ["何千回", "何度も"]) {
        if (text.includes(word)) offenders.push(`${reaction}: 「${word}」`);
      }
    }
  }
  assert.deepEqual(offenders, []);
});

/* ===== 旧い検査からの移植（深掘り・タイプ本文 → カード） ===== */

const story = (reaction: (typeof REACTION_KEYS)[number], intensity: (typeof INTENSITY_KEYS)[number], heat: (typeof HEAT_KEYS)[number], typeId = personalityTypes[0].id) =>
  buildStoryFromKeys({ typeId, reaction, intensity, heat })!;

const textOf = (card: StoryCard) => stringsOf(card).map(plainText).join("");

/**
 * 強度と放熱の**向き**。取り違えても日本語としては成立するので、目視では気づけない。
 * 耐圧限界が低い（よく効く）人に「そこまで引きずらないほうです」が出ても、誰も落ちない。
 * 両端を実物の本文で留める。（移植元: deep-narrative「耐圧限界が低い人に…」）
 */
test("強度 high によく効く側、low に効きにくい側の7枚目が出る", () => {
  const high = textOf(story("evaluation", "high", "high")[6]);
  const low = textOf(story("evaluation", "low", "high")[6]);
  assert.notEqual(high, low, "強度で7枚目が変わっていない");
  assert.ok(high.includes("お風呂"), "強度 high（よく効く）の本文になっていない");
  assert.ok(low.includes("引きずらない"), "強度 low（効きにくい）の本文になっていない");
});

/** （移植元: deep-narrative「放熱量の高低で、守り方の本文が入れ替わる」） */
test("放熱量の高低で、12枚目（守り方）が入れ替わる", () => {
  const hot = textOf(story("evaluation", "mid", "high")[11]);
  const cold = textOf(story("evaluation", "mid", "low")[11]);
  assert.notEqual(hot, cold, "放熱量で守り方が変わっていない");
});

/**
 * 中身（長さ）はオーナー承認済みで、**削って短くする方向の変更はしない**。
 * 実測 1,134〜1,327字。大きく割り込んだら、カードが抜けたか本文が削られている。
 * （移植元: deep-narrative「1人が受け取る地の文が 800字を超える」）
 */
test("1人が15枚で受け取る地の文が 1,000字を下回らない", () => {
  const short: string[] = [];
  for (const type of personalityTypes)
    for (const r of REACTION_KEYS)
      for (const i of INTENSITY_KEYS)
        for (const h of HEAT_KEYS) {
          const total = story(r, i, h, type.id).reduce((n, c) => n + [...textOf(c)].length, 0);
          if (total < 1000) short.push(`${type.id}/${r}/${i}/${h}: ${total}字`);
        }
  assert.deepEqual(short.slice(0, 5), [], `${short.length}件`);
});

/**
 * タイプ本文（2〜4枚目）は**型で固定**。スコアで変わると、人に見せる部分が人によって
 * 変わり、型が指すものがぼやける。（移植元: type-profile「スコアで分岐しない」）
 */
test("2〜4枚目（タイプ本文）は、反応・強度・放熱によらず同じ", () => {
  for (const type of personalityTypes) {
    const base = story("evaluation", "mid", "high", type.id).slice(1, 4).map(textOf).join("|");
    for (const r of REACTION_KEYS)
      for (const i of INTENSITY_KEYS)
        for (const h of HEAT_KEYS) {
          const other = story(r, i, h, type.id).slice(1, 4).map(textOf).join("|");
          assert.equal(other, base, `${type.id}: ${r}/${i}/${h} でタイプ本文が変わる`);
        }
  }
});

/**
 * タイプ本文の3枚目は「本当のことを1つ返す」回収の1枚。救いの色（relief）で出す。
 * 落とすと「ボロクソに言ったあとは必ず救う」が崩れる。
 * （移植元: type-profile「本文が3段落あり、最後の段落が空でない」）
 */
test("タイプ本文の3枚目は、救いの色の回収になっている", () => {
  for (const [id, cards] of Object.entries(typeCards)) {
    assert.equal(cards.length, 3, `${id} が3枚でない`);
    assert.equal(cards[2].tone, "relief", `${id} の3枚目が救いの色でない`);
    assert.ok(plainText(cards[2].big).length >= 10, `${id} の3枚目が短すぎる`);
  }
});

/** 刺しっぱなしで終わらせない。守り方（12・14・15枚目）がそろっていること */
test("守り方の3枚（12・14・15枚目）が欠けない", () => {
  for (const r of REACTION_KEYS)
    for (const h of HEAT_KEYS) {
      const st = story(r, "mid", h);
      assert.equal(st[11].kind, "chips", `${r}/${h}: 12枚目`);
      assert.equal(st[13].kind, "text", `${r}/${h}: 14枚目`);
      assert.equal(st[14].kind, "close", `${r}/${h}: 15枚目`);
    }
});

/** 禁止語の検査そのものが効くか（移植元: 両方の「禁止語を混ぜると、この検査は落ちる」） */
test("禁止語を混ぜると、この検査は落ちる", () => {
  assert.ok(FORBIDDEN.some((w) => "〔ガムテープ〕の話".includes(w)));
  assert.ok(FORBIDDEN_PATTERNS.some((p) => p.test("幼少期に決まった型です")));
});

/**
 * タイプ本文（2〜4枚目の3枚）の字数の下限。
 *
 * 地の文の版では230字を下限にしていたが、カードに分けるときに監修側が
 * つなぎの語を削っていて、**カード版の実測は 218〜285字**（最小は charismatic-enthusiast）。
 * 230字をそのまま移すと落ちる。実物に合わせて 200字にした。
 * （移植元: type-profile「納品済みのタイプが230字を超える」）
 */
test("タイプ本文（3枚）が 200字を下回らない", () => {
  const short = Object.entries(typeCards)
    .map(([id, cards]) => ({
      id,
      n: cards.reduce(
        (sum, c) => sum + [c.lead, c.big, c.mid, c.sub].filter(Boolean).reduce((m, x) => m + [...plainText(x!)].length, 0),
        0,
      ),
    }))
    .filter((t) => t.n < 200)
    .map((t) => `${t.id}: ${t.n}字`);
  assert.deepEqual(short, []);
});

/**
 * ページ番号が本文に重ならないこと。
 *
 * 以前は本文のスクロール領域が画面の下端まで伸びていて、はみ出した本文が
 * 下端に固定した「7 / 15」の下を流れていた。**はみ出しの量とは別の不具合**で、
 * 本文を削って収まっても、はみ出す画面がある限り起きる。
 * 本文の領域は番号の帯（48px）の上で終わる。
 *
 * 実寸（375×667・390×844）では、本文の下端は番号の文字より10px上で終わることを
 * ブラウザで測ってある。ここでは書き方が戻らないことを縛る。
 */
test("本文のスクロール領域が、ページ番号の帯の下まで伸びない", async () => {
  const { readFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const src = readFileSync(join(process.cwd(), "src/components/result/story-viewer.tsx"), "utf8");
  assert.ok(!src.includes("absolute inset-0 overflow-y-auto"), "本文の領域が画面の下端まで伸びている");
  assert.ok(/tappable \? "bottom-12" : "bottom-0"/.test(src), "番号が出る面で、本文の領域が帯の上で終わっていない");
  // タップ用ボタンが領域より高いと、それだけで偽のスクロール量が生まれる
  assert.ok(src.includes("h-[calc(var(--story-h)-84px)]"), "タップ用ボタンの高さが本文の領域と合っていない");
});
