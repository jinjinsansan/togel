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

export const reactionScores = (scores: BigFiveScores): Record<ReactionKey, number> => {
  const ignition = axisPercent("openness", scores); // 引火点
  const structure = axisPercent("conscientiousness", scores); // 構造強度
  const heat = axisPercent("extraversion", scores); // 放熱量
  const buffer = axisPercent("agreeableness", scores); // 緩衝性能

  const d = (v: number) => v - 50;

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

/** 耐圧限界（反転済み・低いほど脆い）から強度を出す。低いほど刺激が強く効く */
export const intensityOf = (pressureLimit: number): IntensityKey => {
  if (pressureLimit >= 67) return "low";
  if (pressureLimit >= 34) return "mid";
  return "high";
};

export const determineReaction = (scores: BigFiveScores): ReactionProfile => {
  const candidates = reactionScores(scores);
  return {
    reaction: pickReaction(candidates),
    intensity: intensityOf(axisPercent("neuroticism", scores)),
    heat: axisPercent("extraversion", scores) >= 50 ? "high" : "low",
    scores: candidates,
  };
};

/** 画面に出す軸名は TOGEL INDEX と一体。ここで別名を作らない */
export const reactionAxisLabel = (key: keyof BigFiveScores): string =>
  TOGEL_INDEX.find((axis) => axis.key === key)?.label ?? "";
