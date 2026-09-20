import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  determineReaction,
  intensityOf,
  NEUTRAL,
  reactionScores,
  REACTION_KEYS,
  INTENSITY_KEYS,
  HEAT_KEYS,
  type ReactionKey,
} from "../src/lib/personality/reaction";
import {
  DEEP_BRIDGE,
  DEEP_COPY,
  DEEP_HEADINGS,
  allDeepCombinations,
  generateDeepNarrative,
  isDeepCopyComplete,
} from "../src/lib/personality/narrative";
import { togelIndexPercent } from "../src/lib/personality/togel-index";
import type { BigFiveScores } from "../src/types/diagnosis";

/**
 * 診断直後に読む「深い自己説明」の配管を検査する。
 *
 * 本文は監修側が納品するので、ここで見るのは**本文が正しいか**ではなく、
 * 「抜けたまま公開されないか」「書いてはいけない語が混ざっていないか」。
 */

const scoresOf = (o: number, c: number, e: number, a: number, n: number): BigFiveScores => ({
  openness: o,
  conscientiousness: c,
  extraversion: e,
  agreeableness: a,
  neuroticism: n,
});

/* ===== 主反応の判定 ===== */

test("同点のときは、決めた優先順どおりに決まる", () => {
  // 中立点は尺度の中心（60）なので、同点になるのは**全軸スコア3.0**。
  // 表示値で 50% にあたるスコア2.5 ではない（表示は score/5*100 で 20〜100）
  const flat = scoresOf(3, 3, 3, 3, 3);
  const candidates = reactionScores(flat);
  // `-d(heat)` などは -0 を返すので deepEqual では 0 と一致しない。
  // ここで見たいのは符号付きゼロではなく「差が無いこと」
  assert.deepEqual(
    Object.values(candidates).map((v) => v + 0 === 0),
    [true, true, true, true, true],
    "この入力は5候補が同点になる前提で書いてある",
  );

  // 優先順は evaluation > loss > isolation > pressure > shock
  assert.equal(determineReaction(flat).reaction, "evaluation");
  assert.deepEqual(REACTION_KEYS.slice(), ["evaluation", "loss", "isolation", "pressure", "shock"]);
});

test("2つだけが同点のときも、優先順の上が残る", () => {
  // isolation = -d(heat)、pressure = -d(buffer)。放熱量と緩衝性能を同じにすると並ぶ
  const scores = scoresOf(3, 3, 2, 2, 3);
  const candidates = reactionScores(scores);
  assert.equal(candidates.isolation, candidates.pressure, "この入力は同点になる前提");
  assert.ok(
    candidates.isolation >= Math.max(...Object.values(candidates)) - 1e-9,
    "同点の2つが最大である前提",
  );
  assert.equal(determineReaction(scores).reaction, "isolation", "isolation が pressure より先");
});

test("強度は耐圧限界が低いほど強い", () => {
  // しきい値の数値は固定しない（実回答で測り直したときに検査が邪魔になる）。
  // 固定するのは**向き**と、中立点がまん中の帯に入ること
  assert.equal(intensityOf(100), "low", "耐圧限界が最大なら効きにくい");
  assert.equal(intensityOf(NEUTRAL), "mid", "尺度のまん中はまん中の帯");
  assert.equal(intensityOf(20), "high", "耐圧限界が最小ならよく効く");

  // 下げていく途中で帯が逆戻りしないこと
  const order: Record<string, number> = { low: 0, mid: 1, high: 2 };
  let previous = -1;
  for (let v = 100; v >= 20; v--) {
    const rank = order[intensityOf(v)];
    assert.ok(rank >= previous, `耐圧限界 ${v} で帯が逆戻りしている`);
    previous = rank;
  }
});

test("耐圧限界は反転した値で判定する（画面の数字と判定の根拠をそろえる）", () => {
  // 神経症傾向が高い＝耐圧限界の表示は低い＝刺激が強く効く
  assert.equal(determineReaction(scoresOf(3, 3, 3, 3, 5)).intensity, "high");
  assert.equal(determineReaction(scoresOf(3, 3, 3, 3, 1)).intensity, "low");
});

test("どんな入力でも、5種のどれかに必ず決まる", () => {
  let rng = 7;
  const rand = () => ((rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const seen = new Set<ReactionKey>();
  for (let i = 0; i < 20000; i++) {
    const s = scoresOf(...(Array.from({ length: 5 }, () => 1 + rand() * 4) as [
      number,
      number,
      number,
      number,
      number,
    ]));
    const { reaction } = determineReaction(s);
    assert.ok(REACTION_KEYS.includes(reaction), `未知の反応 ${reaction}`);
    seen.add(reaction);
  }
  // 誰にも当たらない反応があるなら、その本文は書き損になる
  assert.deepEqual(
    REACTION_KEYS.filter((key) => !seen.has(key)),
    [],
    "無作為2万件で一度も選ばれない反応がある",
  );
});

/* ===== 本文の抜け ===== */

/**
 * 「1つでも空なら落とす」を検査にする。本文が未納品のあいだは
 * `DEEP_COPY` が空で、節ごと画面に出ない（＝空の器は公開されない）。
 * 納品が始まった時点から、半端な反応があれば下の検査が落ちる。
 */
test("納品済みの反応は、30通りぶんが埋まっている", () => {
  const delivered = REACTION_KEYS.filter((key) => Boolean(DEEP_COPY[key]));

  for (const combo of allDeepCombinations()) {
    if (!delivered.includes(combo.reaction)) continue;
    assert.ok(combo.texts, `${combo.reaction}/${combo.intensity}/${combo.heat} が空`);
    for (const [slot, text] of Object.entries(combo.texts)) {
      assert.ok(
        typeof text === "string" && text.trim().length >= 80,
        `${combo.reaction}/${combo.intensity}/${combo.heat} の ${slot} が短すぎる（${text?.length ?? 0}字）`,
      );
    }
  }

  assert.equal(
    allDeepCombinations().length,
    REACTION_KEYS.length * INTENSITY_KEYS.length * HEAT_KEYS.length,
    "組合せの数が 5×3×2 になっていない",
  );
});

test("5種そろうまでは、画面に何も出さない", () => {
  const complete = isDeepCopyComplete();
  const result = generateDeepNarrative(scoresOf(3, 4, 2, 4, 3));
  if (complete) {
    assert.ok(result, "そろっているのに出ない");
    for (const key of Object.keys(DEEP_HEADINGS) as (keyof typeof DEEP_HEADINGS)[]) {
      assert.ok(result![key]?.trim(), `${key} が空のまま出ている`);
    }
  } else {
    assert.equal(result, null, "そろっていないのに出ている（空の器が公開される）");
  }
});

test("S4（守り方）を欠いた状態で公開できない", () => {
  // 刺しっぱなしで終わらせないための構造。見出しの4つ目が消えたら落ちる
  assert.ok(DEEP_HEADINGS.s4, "S4 の見出しが無い");
  for (const key of REACTION_KEYS) {
    const copy = DEEP_COPY[key];
    if (!copy) continue;
    assert.ok(copy.s4.heatHigh?.trim(), `${key} の守り方（放熱high）が空`);
    assert.ok(copy.s4.heatLow?.trim(), `${key} の守り方（放熱low）が空`);
  }
});

/**
 * 強度と放熱の**向き**を固定する。
 *
 * ここは取り違えても文章としては成立してしまう（どの本文も日本語として読める）ので、
 * 目視では気づけない。耐圧限界が低い人に「そこまで引きずらないほうです」が出ても、
 * 誰も落ちないまま公開される。両端を実物の本文で留める。
 */
test("耐圧限界が低い人に、よく効く側の本文が出る", () => {
  const delivered = allDeepCombinations().filter((c) => c.reaction === "evaluation" && c.texts);
  const high = delivered.find((c) => c.intensity === "high")!.texts!;
  const low = delivered.find((c) => c.intensity === "low")!.texts!;

  assert.notEqual(high.s1, low.s1, "強度で本文が変わっていない");
  assert.ok(high.s1.includes("その日の夜"), "強度 high（よく効く）の本文になっていない");
  assert.ok(low.s1.includes("引きずらない"), "強度 low（効きにくい）の本文になっていない");

  // 判定側の向きも一緒に留める。耐圧限界は反転表示なので間違えやすい
  assert.equal(determineReaction(scoresOf(3, 4, 3, 4, 5)).intensity, "high", "神経症傾向が高い＝耐圧限界が低い＝よく効く");
});

test("放熱量の高低で、守り方の本文が入れ替わる", () => {
  const delivered = allDeepCombinations().filter((c) => c.reaction === "evaluation" && c.texts);
  const hot = delivered.find((c) => c.heat === "high")!.texts!;
  const cold = delivered.find((c) => c.heat === "low")!.texts!;

  assert.notEqual(hot.s4, cold.s4, "放熱量で本文が変わっていない");
  assert.ok(hot.s4.includes("誰かに連絡する"), "放熱 high 側の本文になっていない");
  assert.ok(cold.s4.includes("スマホを開いて"), "放熱 low 側の本文になっていない");
});

test("1人が受け取る地の文が 800字を超える", () => {
  // 現状は未開封138字。ここを下回ったら深化の意味が無い
  for (const combo of allDeepCombinations()) {
    if (!combo.texts) continue;
    const chars = [...Object.values(combo.texts).join("")].length;
    assert.ok(
      chars >= 800,
      `${combo.reaction}/${combo.intensity}/${combo.heat} が ${chars}字（800字未満）`,
    );
  }
});

/**
 * 判定の中立点が、尺度の中心とそろっていること。
 *
 * 表示値は 20〜100（スコア1〜5 を score/5*100 で写す）なので中心は 60。
 * ここが 50 だと、まん中の回答者が全軸 +10 から始まって一方向に倒れる。
 * 実際そうなっていて、中心に寄った回答の 64.8% が evaluation に落ち、
 * pressure と shock は合わせて 5% 未満だった。
 *
 * 尺度の写し方を変えたらここも落ちる。定数の直書きに戻さないための検査。
 */
test("判定の中立点が、尺度の中心と一致している", () => {
  const lowest = togelIndexPercent("openness", scoresOf(1, 1, 1, 1, 1));
  const highest = togelIndexPercent("openness", scoresOf(5, 5, 5, 5, 5));
  assert.equal(NEUTRAL, (lowest + highest) / 2, `尺度は ${lowest}〜${highest} なので中心は ${(lowest + highest) / 2}`);

  // まん中の回答者が、どれか1つに偏って落ちないこと
  const middle = reactionScores(scoresOf(3, 3, 3, 3, 3));
  assert.deepEqual(
    Object.values(middle).map((v) => v + 0 === 0),
    [true, true, true, true, true],
    "尺度のまん中の人で候補値が 0 にならない（中立点がずれている）",
  );
});

/**
 * 強度と放熱量のバンドが潰れていないこと。
 *
 * 見るのは**しきい値そのものではなく、どのバンドにも人が入るか**。
 * 数値を固定すると、実回答で測り直したときに検査のほうが邪魔になる。
 *
 * 捕まえたいのは潰れ方。中立点50・しきい値67/33 の組では強度 high が
 * **0.1%** で、S1の5ブロックが誰にも届いていなかった。放熱も 85.9/14.1 で、
 * S4の5ブロックが14%にしか届かなかった。
 */
test("強度と放熱量のバンドが潰れていない", () => {
  let rng = 5150;
  const rand = () => ((rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const gauss = () => { let s = 0; for (let i = 0; i < 6; i++) s += rand(); return s / 6; };

  const intensity = new Map<string, number>(INTENSITY_KEYS.map((k) => [k, 0]));
  const heat = new Map<string, number>(HEAT_KEYS.map((k) => [k, 0]));
  const N = 50000;
  for (let i = 0; i < N; i++) {
    const s = scoresOf(...(Array.from({ length: 5 }, () => 1 + gauss() * 4) as [number, number, number, number, number]));
    const p = determineReaction(s);
    intensity.set(p.intensity, intensity.get(p.intensity)! + 1);
    heat.set(p.heat, heat.get(p.heat)! + 1);
  }

  for (const [label, counts] of [["強度", intensity], ["放熱量", heat]] as const) {
    for (const [key, n] of counts) {
      const share = n / N;
      assert.ok(
        share >= 0.1,
        `${label} ${key} が ${(share * 100).toFixed(1)}%（この分岐の本文がほぼ誰にも届かない）`,
      );
    }
  }
});

test("しきい値が中立点からの相対で書かれている", () => {
  const source = readFileSync("src/lib/personality/reaction.ts", "utf8");
  // 数値を直書きすると、尺度が変わったとき中立点だけが追随して取り残される
  assert.ok(!/>=\s*(66|67|50|33|54)/.test(source), "しきい値に数値が直書きされている");
  assert.ok(source.includes("NEUTRAL + BAND") && source.includes("NEUTRAL - BAND"), "強度が相対で切られていない");
  assert.ok(/>=\s*NEUTRAL\s*\?/.test(source), "放熱量が中立点で切られていない");
});

test("主反応が、どれか1つに偏っていない", () => {
  // 実際の回答は中心に寄るので、一様乱数ではなく正規寄りで見る
  let rng = 5150;
  const rand = () => ((rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const gauss = () => { let s = 0; for (let i = 0; i < 6; i++) s += rand(); return s / 6; };

  const counts = new Map<ReactionKey, number>(REACTION_KEYS.map((k) => [k, 0]));
  const N = 50000;
  for (let i = 0; i < N; i++) {
    const s = scoresOf(...(Array.from({ length: 5 }, () => 1 + gauss() * 4) as [number, number, number, number, number]));
    const { reaction } = determineReaction(s);
    counts.set(reaction, counts.get(reaction)! + 1);
  }
  const shares = [...counts].map(([k, v]) => [k, v / N] as const);

  // 1種に半分以上が落ちるなら、残りの本文は書き損になる
  for (const [key, share] of shares) {
    assert.ok(share < 0.5, `${key} に ${(share * 100).toFixed(1)}% が集中している`);
    assert.ok(share > 0.03, `${key} が ${(share * 100).toFixed(1)}% にしか届かない`);
  }
});

/* ===== 書いてはいけない語 ===== */

/**
 * 理論側の用語は、コードにもAPIの応答にも画面にも出さない。
 * 世界観（危険物・取扱説明書）の一般語に翻訳して使う。
 *
 * 「治る」「治療」は、そもそも扱いが違うので書かない。
 * 「毒親」「普通は」も同じ理由で禁止している。
 */
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

/** 生育歴・親の断定。理論上の起源であっても、40問から個人の過去は断定しない */
const FORBIDDEN_PATTERNS = [
  /幼少期(に|の|から)/,
  /子ども?の頃に[^。]*(親|母|父)/,
  /あなたの(親|母親|父親|家庭)(は|が)/,
  /育っ(た|て)(ため|から|ので)/,
  /〜?症\b/,
  /障害(が|の)ある/,
];

/** 検査にかける文字列。**分岐しない橋渡し文も含める**（全員が読むので取りこぼせない） */
const deepCopyText = (): string =>
  [
    DEEP_BRIDGE,
    ...Object.values(DEEP_COPY).flatMap((copy) => [
      ...Object.values(copy.s1),
      copy.s2,
      copy.s3,
      ...Object.values(copy.s4),
    ]),
  ].join("\n");

test("本文に理論側の用語が出ない", () => {
  const text = deepCopyText() + "\n" + Object.values(DEEP_HEADINGS).join("\n");
  const found = FORBIDDEN.filter((word) => text.includes(word));
  assert.deepEqual(found, [], "世界観の一般語に翻訳して書く");
});

test("本文が生育歴や親を断定しない", () => {
  const text = deepCopyText();
  const hit = FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(text)).map(String);
  assert.deepEqual(hit, [], "起源はぼかす（「いつ決まったのかは、たぶん覚えていません」の形）");
});

/**
 * 検査が本当に効くかを、検査自身で確かめる。
 * 禁止語を1つ混ぜた文字列を同じ判定にかけ、落ちることを見る。
 * （本物の定数に混ぜると他の検査を巻き込むので、判定だけを取り出して当てる）
 */
test("禁止語を混ぜると、この検査は落ちる", () => {
  const poisoned = "あなたに一番効く刺激は、ガムテープのような思い込みです。";
  assert.ok(
    FORBIDDEN.some((word) => poisoned.includes(word)),
    "禁止語を含む文を素通りさせている",
  );

  const dated = "幼少期に親から言われたことが原因です。";
  assert.ok(
    FORBIDDEN_PATTERNS.some((pattern) => pattern.test(dated)),
    "生育歴の断定を素通りさせている",
  );
});

/* ===== 判定の根拠がコードに残っていること ===== */

test("同点処理が暗黙の挙動に任されていない", () => {
  const source = readFileSync("src/lib/personality/reaction.ts", "utf8");
  assert.ok(
    source.includes("TIE_BREAK_ORDER"),
    "同点の優先順が名前を持っていない（sort や Math.max に任せると黙って倒れる）",
  );
  assert.ok(
    !/\.sort\(|Math\.max\(/.test(source.replace(/\/\*[\s\S]*?\*\//g, "")),
    "sort / Math.max で最大値を取っている（同点がどちらに倒れるか読めない）",
  );
});
