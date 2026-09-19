import type { LineTextMessage } from "./client";
import { personalityTypes } from "@/lib/personality";
import { typeApproachGuides } from "@/lib/coaching/translations";
import { ANGLE_BY_BROADCAST_KIND, cellKey } from "@/lib/coaching/board";

/**
 * LINE定期配信のタイプ別テンプレ文面。
 *
 * 既存の静的コンテンツ（24タイプ定義 + 地雷回避ガイド）だけから組み立てる。
 * 実行時のAI生成は行わない（コストゼロ運用）。
 * トーンは「毒舌だが愛がある」。毒の対象はタイプであって個人ではない。
 * 語彙は地雷回避ガイドと共通（ラベル / タンク / 警報）。
 *
 * 5テンプレ × ワースト3タイプ = 全15通。
 *
 * 🔴 通目（issue）は**ユーザー単位**で数える。全体で一つの週番号から導出すると、
 * 登録した日によって最初の1通が「5通目」になり、「1通目を受け取る」という約束が破れる。
 * また全体巡回だと 15通を超えて 1 に巻き戻る。全通数を謳っている以上 16通目は存在してはいけない。
 *
 * 冒頭には「何通目か」を必ず置く。来た距離だけを書き、
 * 残り通数・連続記録・不在への言及はしない。
 */

const COACHING_URL = "https://to-gel.com/coaching";

/** 配信1通 = 盤の1マス。そのマスを直接開くリンク */
const cellUrl = (worstTypeId: string, kind: number) =>
  `${COACHING_URL}?cell=${encodeURIComponent(cellKey(worstTypeId, ANGLE_BY_BROADCAST_KIND[kind]))}`;

const findType = (typeId: string) => personalityTypes.find((t) => t.id === typeId) ?? null;

/** 全通数。これを超えたら送らない（巡回させない） */
export const BROADCAST_TOTAL_ISSUES = 15;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * そのユーザーにとって今回が何通目か（1始まり）。
 *
 * 起点は max(友だち登録日, 配信有効化日)。登録日を起点にすると、
 * 有効化以前からの友だちが「1通も受け取らないまま終了」になるため。
 */
export const issueForUser = (createdAt: string, startAt: Date, now: Date): number => {
  const created = new Date(createdAt).getTime();
  const base = Math.max(Number.isFinite(created) ? created : startAt.getTime(), startAt.getTime());
  return Math.floor((now.getTime() - base) / WEEK_MS) + 1;
};

/**
 * 通目から 1通を組み立てる。issue は 1始まりで、
 * 範囲外（＜1 または ＞全通数）なら null（送信しない）。
 */
export const buildTypeBroadcast = (typeId: string, issue: number): LineTextMessage | null => {
  const self = findType(typeId);
  if (!self || self.badCompatibleTypes.length === 0) return null;
  if (!Number.isInteger(issue) || issue < 1 || issue > BROADCAST_TOTAL_ISSUES) return null;

  const step = issue - 1;
  const kind = step % 5;
  const worstId = self.badCompatibleTypes[Math.floor(step / 5) % self.badCompatibleTypes.length];
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
        `✕ 言いがち ${guide.ng}`,
        `◯ 言い換え ${guide.ok}`,
        "",
        "踏むと警報が鳴ります。踏む前にどうぞ。",
      ].join("\n");
      break;
    case 1:
      body = [
        `【中身の正体｜${worst.typeName}】`,
        "",
        guide.core,
        "",
        "タイプは傾向、ラベルは個人。隣のあの人の本当のラベルは、本人にしかわかりません。",
      ].join("\n");
      break;
    case 2:
      body = [
        `【言い方の翻訳講座｜対 ${worst.typeName}】`,
        "",
        `✕ ${guide.ng}`,
        `◯ ${guide.ok}`,
        "",
        `なぜ効くか: ${guide.why}`,
      ].join("\n");
      break;
    case 3:
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
        "逃げるのは負けじゃありません。保管距離という安全管理です。",
      ].join("\n");
      break;
  }

  return {
    type: "text",
    text: `${issue}通目です（全${BROADCAST_TOTAL_ISSUES}通）\n\n${body}\n\n▼ このマスを開く\n${cellUrl(worstId, kind)}`,
  };
};
