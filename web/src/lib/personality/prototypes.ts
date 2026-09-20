import type { BigFiveScores } from "@/types/diagnosis";

/**
 * 24タイプの原型（5軸の代表点）。**このファイルが唯一の出典**。
 *
 * 診断はこの原型との距離で決まり（`determinePersonalityType`）、
 * 診断していない人に見せる5指標もこの値をそのまま使う（`representativeScores`）。
 * 判定と表示で別々の数字を持たない。片方だけ更新される事故を作らないため。
 *
 * 【値の出どころ】
 * 現行の判定結果から逆算したものではない。逆算すると、いまの偏りを
 * そのまま作り直すことになる。各タイプの定義——4群の骨格・タグ・人物像・
 * 地雷の一文——から独立に置き、24,000人のシミュレーションで
 * 分布を測りながら6版かけて調整した（`scripts/evaluate-prototypes.ts`）。
 *
 * 【値を動かすときの注意】
 * - **0.125の格子（.00/.125/.25/…）を避ける。** 素点は8問平均なので0.125刻みで、
 *   原型を格子上に置くと「距離が完全に等しい人」が大量に出る（実測で6.77%、
 *   格子を外すと0.088%）
 * - **群の骨格を壊さない。** 引火群と連鎖群は外向性が両方高いので、
 *   O と A の範囲が重ならないことで分離している
 *   （O: 引火 >= 4.06 > 連鎖 <= 3.34 ／ A: 連鎖 >= 3.63 > 引火 <= 3.37）
 * - **間隔の都合だけで動かさない。** 定義から出た値だけが効いた。
 *   間隔のためだけに動かした版は、正味 +0.19pt で1タイプを悪化させた
 * - 動かしたら `npx tsx scripts/evaluate-prototypes.ts <表.json>` で測り直す
 */
export const TYPE_PROTOTYPES: Record<string, BigFiveScores> = {
  // ライオ型（創造的リーダー／ignition）
  "creative-leader": {
    openness: 4.38,
    conscientiousness: 1.87,
    extraversion: 4.51,
    agreeableness: 3.06,
    neuroticism: 2.94,
  },
  // ウニコ型（社交的革新者／ignition）
  "social-innovator": {
    openness: 4.61,
    conscientiousness: 3.11,
    extraversion: 4.21,
    agreeableness: 3.37,
    neuroticism: 2.63,
  },
  // フレア型（カリスマ的熱狂家／ignition）
  "charismatic-enthusiast": {
    openness: 4.06,
    conscientiousness: 1.94,
    extraversion: 4.58,
    agreeableness: 2.36,
    neuroticism: 3.87,
  },
  // ジェット型（探求的コネクター／ignition）
  "exploratory-connector": {
    openness: 4.71,
    conscientiousness: 2.11,
    extraversion: 3.87,
    agreeableness: 3.37,
    neuroticism: 1.62,
  },
  // シロ型（ビジョナリー実行者／ignition）
  "visionary-executor": {
    openness: 4.21,
    conscientiousness: 4.43,
    extraversion: 4.13,
    agreeableness: 1.94,
    neuroticism: 2.06,
  },
  // フェス型（エンターテイニングクリエイター／ignition）
  "entertaining-creator": {
    openness: 4.11,
    conscientiousness: 2.87,
    extraversion: 4.71,
    agreeableness: 3.24,
    neuroticism: 3.34,
  },
  // アトリ型（内省的芸術家／settling）
  "introverted-artist": {
    openness: 4.38,
    conscientiousness: 2.87,
    extraversion: 1.74,
    agreeableness: 3.06,
    neuroticism: 3.63,
  },
  // ビブリ型（哲学的キュレーター／settling）
  "philosophical-curator": {
    openness: 4.46,
    conscientiousness: 3.92,
    extraversion: 1.93,
    agreeableness: 2.84,
    neuroticism: 2.97,
  },
  // ノクタ型（深淵探求者／settling）
  "depth-explorer": {
    openness: 4.61,
    conscientiousness: 2.69,
    extraversion: 1.67,
    agreeableness: 2.43,
    neuroticism: 4.36,
  },
  // ルナ型（詩的夢想家／settling）
  "poetic-dreamer": {
    openness: 4.39,
    conscientiousness: 1.86,
    extraversion: 1.91,
    agreeableness: 3.61,
    neuroticism: 4.12,
  },
  // ソロ型（孤独な知識人／settling）
  "solvent-intellectual": {
    openness: 4.07,
    conscientiousness: 4.06,
    extraversion: 1.58,
    agreeableness: 2.13,
    neuroticism: 2.34,
  },
  // マッチャ型（静観的賢者／settling）
  "contemplative-sage": {
    openness: 3.71,
    conscientiousness: 3.63,
    extraversion: 1.97,
    agreeableness: 4.06,
    neuroticism: 1.74,
  },
  // ゲンバ型（実践的リーダー／chain）
  "practical-leader": {
    openness: 2.13,
    conscientiousness: 4.41,
    extraversion: 4.07,
    agreeableness: 3.63,
    neuroticism: 2.26,
  },
  // カンジ型（社交的組織者／chain）
  "social-organizer": {
    openness: 2.91,
    conscientiousness: 4.47,
    extraversion: 4.21,
    agreeableness: 3.94,
    neuroticism: 2.63,
  },
  // メガホ型（能動的コミュニケーター／chain）
  "active-communicator": {
    openness: 2.94,
    conscientiousness: 2.94,
    extraversion: 4.57,
    agreeableness: 3.71,
    neuroticism: 3.61,
  },
  // ムラオ型（コミュニティ・ビルダー／chain）
  "community-builder": {
    openness: 2.86,
    conscientiousness: 3.34,
    extraversion: 4.11,
    agreeableness: 4.62,
    neuroticism: 3.24,
  },
  // スニカ型（熱心なネットワーカー／chain）
  "enthusiastic-networker": {
    openness: 3.34,
    conscientiousness: 2.19,
    extraversion: 4.43,
    agreeableness: 4.06,
    neuroticism: 2.41,
  },
  // タイシ型（関係性大使／chain）
  "relational-ambassador": {
    openness: 3.06,
    conscientiousness: 3.61,
    extraversion: 4.19,
    agreeableness: 4.41,
    neuroticism: 1.94,
  },
  // バリア型（堅実な専門家／inert）
  "steady-specialist": {
    openness: 2.07,
    conscientiousness: 4.51,
    extraversion: 2.13,
    agreeableness: 3.24,
    neuroticism: 3.87,
  },
  // フォルダ型（信頼できる整理者／inert）
  "reliable-organizer": {
    openness: 2.34,
    conscientiousness: 4.71,
    extraversion: 2.26,
    agreeableness: 2.41,
    neuroticism: 2.91,
  },
  // レーダ型（静かな観察者／inert）
  "quiet-observer": {
    openness: 3.43,
    conscientiousness: 3.86,
    extraversion: 1.61,
    agreeableness: 3.12,
    neuroticism: 3.06,
  },
  // タクミ型（専心した職人／inert）
  "dedicated-crafter": {
    openness: 2.61,
    conscientiousness: 4.37,
    extraversion: 1.79,
    agreeableness: 1.87,
    neuroticism: 2.34,
  },
  // テンビン型（良心的守護者／inert）
  "conscientious-guardian": {
    openness: 1.58,
    conscientiousness: 4.58,
    extraversion: 2.34,
    agreeableness: 3.07,
    neuroticism: 2.86,
  },
  // ジョーギ型（方法的思考家／inert）
  "methodical-thinker": {
    openness: 2.87,
    conscientiousness: 4.44,
    extraversion: 1.96,
    agreeableness: 2.94,
    neuroticism: 3.63,
  },
};
