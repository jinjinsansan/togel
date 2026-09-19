import type { BigFiveScores } from "@/types/diagnosis";

import { determinePersonalityType } from "./utils";

/**
 * タイプ代表値（5指標の目安）。
 *
 * シェア画像は「診断していない人のタイプページ」でも生成されるため、
 * 個人の回答がない場合に出すバーの値が要る。判定エンジン
 * （determinePersonalityType）の入力空間を走査し、そのタイプになる
 * スコアの平均をそのタイプの代表値とする。
 *
 * 数値を新しく作るのではなく、既存の判定ロジックから逆算しているだけである点が重要。
 * 個人の結果がある場合は必ずそちら（実測値）を使い、これは使わない。
 */

const AXIS_VALUES = [1, 2, 3, 4, 5] as const;
const NEUTRAL: BigFiveScores = {
  openness: 3,
  conscientiousness: 3,
  extraversion: 3,
  agreeableness: 3,
  neuroticism: 3,
};

let cache: Map<string, BigFiveScores> | null = null;

const buildCache = (): Map<string, BigFiveScores> => {
  const sums = new Map<string, { total: BigFiveScores; count: number }>();

  for (const openness of AXIS_VALUES) {
    for (const conscientiousness of AXIS_VALUES) {
      for (const extraversion of AXIS_VALUES) {
        for (const agreeableness of AXIS_VALUES) {
          for (const neuroticism of AXIS_VALUES) {
            const scores: BigFiveScores = {
              openness,
              conscientiousness,
              extraversion,
              agreeableness,
              neuroticism,
            };
            const type = determinePersonalityType(scores);
            const entry = sums.get(type.id) ?? {
              total: {
                openness: 0,
                conscientiousness: 0,
                extraversion: 0,
                agreeableness: 0,
                neuroticism: 0,
              },
              count: 0,
            };
            entry.total.openness += openness;
            entry.total.conscientiousness += conscientiousness;
            entry.total.extraversion += extraversion;
            entry.total.agreeableness += agreeableness;
            entry.total.neuroticism += neuroticism;
            entry.count += 1;
            sums.set(type.id, entry);
          }
        }
      }
    }
  }

  const result = new Map<string, BigFiveScores>();
  for (const [typeId, { total, count }] of sums) {
    result.set(typeId, {
      openness: total.openness / count,
      conscientiousness: total.conscientiousness / count,
      extraversion: total.extraversion / count,
      agreeableness: total.agreeableness / count,
      neuroticism: total.neuroticism / count,
    });
  }
  return result;
};

/** タイプIDから5指標の代表値を返す（判定エンジンから逆算。到達不能なタイプは中央値） */
export const representativeScores = (typeId: string): BigFiveScores => {
  if (!cache) cache = buildCache();
  return cache.get(typeId) ?? NEUTRAL;
};
