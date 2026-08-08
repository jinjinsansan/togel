import type { LineTextMessage } from "./client";
import { personalityTypes } from "@/lib/personality";
import { typeApproachGuides } from "@/lib/coaching/translations";

/**
 * LINE定期配信のタイプ別テンプレ文面。
 *
 * 既存の静的コンテンツ（24タイプ定義 + 地雷回避ガイド）だけから組み立てる。
 * 実行時のAI生成は行わない（コストゼロ運用）。
 * トーンは「毒舌だが愛がある」。毒の対象はタイプであって個人ではない。
 *
 * weekIndex（エポック起点の週番号）で 4テンプレ × ワースト3タイプ = 12週分を巡回する。
 */

const COACHING_URL = "https://to-gel.com/coaching";

const findType = (typeId: string) => personalityTypes.find((t) => t.id === typeId) ?? null;

export const buildTypeBroadcast = (typeId: string, weekIndex: number): LineTextMessage | null => {
  const self = findType(typeId);
  if (!self || self.badCompatibleTypes.length === 0) return null;

  const kind = weekIndex % 4;
  const worstId =
    self.badCompatibleTypes[Math.floor(weekIndex / 4) % self.badCompatibleTypes.length];
  const worst = findType(worstId);
  const guide = typeApproachGuides[worstId];
  if (!worst || !guide) return null;

  let body: string;
  switch (kind) {
    case 0:
      body = [
        "【今週の地雷注意報】",
        "",
        `あなた（${self.typeName}）が取り扱い注意なのは…`,
        `${worst.emoji} ${worst.typeName}（${worst.catchphrase}）`,
        "",
        `✕ 言いがち「${guide.ng}」`,
        `◯ 言い換え「${guide.ok}」`,
      ].join("\n");
      break;
    case 1:
      body = [
        `【言い方の翻訳講座｜対 ${worst.typeName}】`,
        "",
        `✕ ${guide.ng}`,
        `◯ ${guide.ok}`,
        "",
        `なぜ効くか: ${guide.why}`,
      ].join("\n");
      break;
    case 2:
      body = [
        `【今日からやること｜対 ${worst.typeName}】`,
        "",
        ...guide.dos.map((d, i) => `${i + 1}. ${d}`),
        "",
        "全部やれとは言いません。1つでいいです。",
      ].join("\n");
      break;
    default:
      body = [
        `【距離の置き方｜対 ${worst.typeName}】`,
        "",
        guide.distance,
        "",
        "逃げるのは負けじゃありません。戦略です。",
      ].join("\n");
      break;
  }

  return {
    type: "text",
    text: `${body}\n\n▼ 地雷回避ガイド全文\n${COACHING_URL}`,
  };
};
