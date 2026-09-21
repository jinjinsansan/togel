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
import { togelIndexPercent } from "../src/lib/personality/togel-index";
import type { BigFiveScores } from "../src/types/diagnosis";

/**
 * 主反応・強度・放熱の判定。
 *
 * もとは tests/deep-narrative.test.ts にあった。本文（深掘りの地の文）はストーリーズの
 * カードに置き換わったので本文の検査は tests/story.test.ts へ移し、**判定の検査だけ**
 * ここに残した。ストーリーズも同じ determineReaction で7〜15枚目を選ぶ。
 */

const scoresOf = (o: number, c: number, e: number, a: number, n: number): BigFiveScores => ({
  openness: o,
  conscientiousness: c,
  extraversion: e,
  agreeableness: a,
  neuroticism: n,
});

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
