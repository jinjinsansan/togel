import type { BigFiveScores } from "@/types/diagnosis";

/**
 * トゥゲル診断の5つの取扱指標（TOGEL INDEX）。
 *
 * 内部的には5因子スコア（BigFiveScores）をそのまま使うが、
 * ユーザーに見せる語彙は「危険物データシート」の世界観で統一する。
 * 「耐圧限界」は元スコア（神経症傾向: 高いほどストレスに弱い）と意味が
 * 逆になるため、表示時に反転する（inverted）。
 */
export type TogelIndexAxis = {
  key: keyof BigFiveScores;
  label: string;
  description: string;
  /** true の場合、表示値 = 100 - スコア% */
  inverted?: boolean;
};

export const TOGEL_INDEX: TogelIndexAxis[] = [
  { key: "openness", label: "引火点", description: "新しいものへの燃えやすさ" },
  { key: "conscientiousness", label: "構造強度", description: "計画と約束の頑丈さ" },
  { key: "extraversion", label: "放熱量", description: "人といるとき出るエネルギー" },
  { key: "agreeableness", label: "緩衝性能", description: "衝突を吸収する力" },
  {
    key: "neuroticism",
    label: "耐圧限界",
    description: "プレッシャーに耐えられる上限",
    inverted: true,
  },
];

export const togelIndexLabel = (key: keyof BigFiveScores): string =>
  TOGEL_INDEX.find((axis) => axis.key === key)?.label ?? "";

/**
 * 1-5スケールのスコアを表示用の0-100に変換する（反転指標は反転済みの値を返す）。
 *
 * 反転は `100 - pct` ではなく **スコアの側を 6 - v にしてから**割る。
 * 前者だと反転指標だけ 0〜80%、他の軸は 20〜100% になり、**土俵が違ってしまう**。
 * 実際そのせいで、24タイプのどれ一つとして耐圧限界が最長にならず
 * （最短は13タイプ）、「何が起きても動じない」はずのマッチャ型でも
 * 耐圧限界が緩衝性能に負けていた。
 */
export const togelIndexPercent = (key: keyof BigFiveScores, scores: BigFiveScores): number => {
  const axis = TOGEL_INDEX.find((a) => a.key === key);
  const value = axis?.inverted ? 6 - scores[key] : scores[key];
  return Math.round((value / 5) * 100);
};
