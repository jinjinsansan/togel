import type { BigFiveScores } from "@/types/diagnosis";

/**
 * 取扱注意ラベル（9:16）のURL。
 *
 * 実測スコアがある場合だけ `s=` を付ける。無い場合は画像側がタイプ代表値を使う。
 * 画像はスクリーンショットで流通する前提なので、URLが剥がれても画像内の
 * ドメインとハッシュタグで戻ってこられるようにしてある（api/og/route.tsx）。
 */
export const storyLabelHref = (typeId: string, scores?: BigFiveScores | null): string => {
  const base = `/api/og?type=${encodeURIComponent(typeId)}&format=story`;
  if (!scores) return base;
  const s = [
    scores.openness,
    scores.conscientiousness,
    scores.extraversion,
    scores.agreeableness,
    scores.neuroticism,
  ]
    .map((value) => value.toFixed(2))
    .join(",");
  return `${base}&s=${s}`;
};
