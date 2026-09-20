import type { BigFiveScores } from "@/types/diagnosis";

import { TYPE_PROTOTYPES } from "./prototypes";

/**
 * タイプ代表値（5指標の目安）。
 *
 * シェア画像は「診断していない人のタイプページ」でも生成されるため、
 * 個人の回答がない場合に出すバーの値が要る。**原型をそのまま返す。**
 *
 * 以前は判定エンジンの入力空間を走査して平均を取っていた（逆算）。
 * 判定が最近傍になった今、原型がそのままタイプの中心なので、逆算する意味が無い。
 * 逆算を残すと、判定に使う数字と表示に使う数字が別々になり、
 * 片方だけ更新される。**出典は prototypes.ts の1つだけにする。**
 *
 * 個人の結果がある場合は必ずそちら（実測値）を使い、これは使わない。
 */

const NEUTRAL: BigFiveScores = {
  openness: 3,
  conscientiousness: 3,
  extraversion: 3,
  agreeableness: 3,
  neuroticism: 3,
};

/** タイプIDから5指標の代表値を返す（＝そのタイプの原型）。知らないIDは中央値 */
export const representativeScores = (typeId: string): BigFiveScores =>
  TYPE_PROTOTYPES[typeId] ?? NEUTRAL;
