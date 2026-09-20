import { TOGEL_INDEX, togelIndexPercent } from "./togel-index";
import type { BigFiveScores } from "@/types/diagnosis";

/**
 * 主反応の判定。
 *
 * 「何をする人か」（5因子の言い換え）ではなく、**何に一番強く反応するか**を出す。
 * 判定に使うのは表示用の TOGEL INDEX（0-100）で、耐圧限界は反転済みの値。
 * 素のスコアを使うと、画面に出ている数字と判定の根拠がずれる。
 *
 * タイプ（24種）ではなくスコアから決める。タイプ別に書くと、書き終わるまで
 * 大半の利用者に何も届かない。5種 × 強度3 × 放熱量2 = 30通りなら、
 * 埋めた時点で全員に届く。
 */

export const REACTION_KEYS = ["evaluation", "loss", "isolation", "pressure", "shock"] as const;
export type ReactionKey = (typeof REACTION_KEYS)[number];

/** 強度。耐圧限界が**低いほど強く効く**ので、表示値とは向きが逆になる */
export const INTENSITY_KEYS = ["low", "mid", "high"] as const;
export type IntensityKey = (typeof INTENSITY_KEYS)[number];

/** 放熱量の高低。S4 の分岐に使う */
export const HEAT_KEYS = ["high", "low"] as const;
export type HeatKey = (typeof HEAT_KEYS)[number];

export type ReactionProfile = {
  reaction: ReactionKey;
  intensity: IntensityKey;
  heat: HeatKey;
  /** 判定の内訳。表には出さないが、検証と調査のために残す */
  scores: Record<ReactionKey, number>;
};

/**
 * 同点のときの優先順。**この配列の順がそのまま優先順**で、
 * `REACTION_KEYS` の並びと一致させてある。
 *
 * 明示的に書いているのは、`Math.max` や `sort` の暗黙の挙動に任せると、
 * 同点が黙ってどちらかに倒れて誰も気づかないため。実際この案件では
 * 同点が黙って落ちて件数を取り違えた事故が起きている。
 */
const TIE_BREAK_ORDER: readonly ReactionKey[] = REACTION_KEYS;

/** 浮動小数の誤差で同点が同点にならないのを防ぐ。0.1点未満の差は差と見なさない */
const TIE_EPSILON = 1e-9;

const axisPercent = (key: keyof BigFiveScores, scores: BigFiveScores) =>
  togelIndexPercent(key, scores);

/**
 * 判定の中立点。**尺度から導く。定数を直に書かない。**
 *
 * 表示値は `score/5*100` で、スコアは1〜5。つまり範囲は **20〜100 で、中心は 60**。
 * ここを 50 にすると、まん中の回答者が全軸で +10 から始まり、係数の非対称と
 * 合わさって一方向に倒れる。実際そうなっていて、中心に寄った回答の 64.8% が
 * evaluation に落ち、pressure と shock は合わせて 5% 未満だった
 * （24タイプの原型スコアでは 0 タイプ）。
 *
 * `togelIndexPercent` の写し方が変われば中心も動くので、**そこから計算する**。
 */
const SCALE_MID_SCORE = 3; // 1〜5 のまん中
export const NEUTRAL = togelIndexPercent("openness", {
  openness: SCALE_MID_SCORE,
  conscientiousness: SCALE_MID_SCORE,
  extraversion: SCALE_MID_SCORE,
  agreeableness: SCALE_MID_SCORE,
  neuroticism: SCALE_MID_SCORE,
});

export const reactionScores = (scores: BigFiveScores): Record<ReactionKey, number> => {
  const ignition = axisPercent("openness", scores); // 引火点
  const structure = axisPercent("conscientiousness", scores); // 構造強度
  const heat = axisPercent("extraversion", scores); // 放熱量
  const buffer = axisPercent("agreeableness", scores); // 緩衝性能

  const d = (v: number) => v - NEUTRAL;

  return {
    evaluation: d(structure) + d(buffer) * 0.5,
    loss: d(buffer) * 0.5 + d(heat) * 0.5,
    isolation: -d(heat),
    pressure: -d(buffer),
    shock: -d(ignition) * 0.7 + d(structure) * 0.3,
  };
};

/**
 * 最大値を取る。同点なら TIE_BREAK_ORDER の先にあるほうを採る。
 * `reduce` で「より大きければ置き換える」だけにしてあるので、
 * 同点では**先に見たほう**（＝優先順の上）が残る。
 */
const pickReaction = (candidates: Record<ReactionKey, number>): ReactionKey => {
  let best: ReactionKey = TIE_BREAK_ORDER[0];
  for (const key of TIE_BREAK_ORDER) {
    if (candidates[key] - candidates[best] > TIE_EPSILON) best = key;
  }
  return best;
};

/**
 * バンドの振れ幅。**中立点からの相対で切る。数値を直書きしない。**
 *
 * 66 や 54 と書くと、尺度が変われば中立点だけが追随して、しきい値が取り残される。
 * 実際それが起きていて、中立点50・しきい値67/33の組で `high` が 0.1% まで潰れた。
 * 中立点・強度・放熱の3つとも `NEUTRAL` という同じ一点から出す。
 *
 * 🔴 **6 という幅に理論的な根拠はない。** 「中心に寄った回答」という
 * **仮定した分布**に対して人数がおおむね3等分になる値で、**暫定値**。
 * 実際の回答が溜まったら測り直すこと（`scripts/probe-splits.ts`）。
 *
 * 人数で割ることそのものは、性格検査として正しい。この種の指標は
 * 絶対量ではなく**回答者の中での位置**を返すもので、本文も
 * 「〜のほうです」と相対で書いてある。
 */
const BAND = 6;

/**
 * 耐圧限界（反転済み・低いほど脆い）から強度を出す。
 * 耐圧限界が**低いほど刺激が強く効く**ので、表示値とは向きが逆になる。
 */
export const intensityOf = (pressureLimit: number): IntensityKey => {
  if (pressureLimit >= NEUTRAL + BAND) return "low";
  if (pressureLimit > NEUTRAL - BAND) return "mid";
  return "high";
};

export const determineReaction = (scores: BigFiveScores): ReactionProfile => {
  const candidates = reactionScores(scores);
  return {
    reaction: pickReaction(candidates),
    intensity: intensityOf(axisPercent("neuroticism", scores)),
    heat: axisPercent("extraversion", scores) >= NEUTRAL ? "high" : "low",
    scores: candidates,
  };
};

/** 画面に出す軸名は TOGEL INDEX と一体。ここで別名を作らない */
export const reactionAxisLabel = (key: keyof BigFiveScores): string =>
  TOGEL_INDEX.find((axis) => axis.key === key)?.label ?? "";
