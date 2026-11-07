import { personalityTypes } from "@/lib/personality";
import { typeApproachGuides } from "@/lib/coaching/translations";
import { ANGLE_BY_BROADCAST_KIND, cellKey } from "@/lib/coaching/board";

/**
 * メルマガ（週1通・全15通）のタイプ別の文面。LINE週次配信の文面をそのまま引き継いだ。
 *
 * 既存の静的コンテンツ（24タイプ定義 + 地雷回避ガイド）だけから組み立てる。
 * 実行時のAI生成は行わない（コストゼロ運用）。
 * トーンは「毒舌だが愛がある」。毒の対象はタイプであって個人ではない。
 * 語彙は地雷回避ガイドと共通（ラベル / タンク / 警報）。
 *
 * 5テンプレ × ワースト3タイプ = 全15通。
 *
 * 🔴 通目（issue）は**購読者単位**で数える（newsletter_subscribers.last_issue）。
 * 全体で一つの週番号から導出すると、登録した日によって最初の1通が「5通目」になる。
 * 15通を超えたら送らない。全通数を謳っている以上 16通目は存在してはいけない。
 *
 * 冒頭には「何通目か」を必ず置く。来た距離だけを書き、
 * 残り通数・連続記録・不在への言及はしない。
 */

/** 1通ぶん。text はメール本文（プレーンテキスト）。HTML は send 側で text から作る */
export type NewsletterIssue = {
  issue: number;
  subject: string;
  text: string;
};

const COACHING_URL = "https://to-gel.com/coaching";

/** 配信1通 = 盤の1マス。そのマスを直接開くリンク */
const cellUrl = (worstTypeId: string, kind: number) =>
  `${COACHING_URL}?cell=${encodeURIComponent(cellKey(worstTypeId, ANGLE_BY_BROADCAST_KIND[kind]))}`;

const findType = (typeId: string) => personalityTypes.find((t) => t.id === typeId) ?? null;

/** 全通数。これを超えたら送らない（巡回させない） */
export const BROADCAST_TOTAL_ISSUES = 15;

/**
 * 通目から 1通を組み立てる。issue は 1始まりで、
 * 範囲外（＜1 または ＞全通数）なら null（送信しない）。
 */
export const buildNewsletterIssue = (typeId: string, issue: number): NewsletterIssue | null => {
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
  let heading: string;
  switch (kind) {
    case 0:
      body = [
        `【${(heading = "今週の地雷注意報")}】`,
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
        `【${(heading = `中身の正体｜${worst.typeName}`)}】`,
        "",
        guide.core,
        "",
        "タイプは傾向、ラベルは個人。隣のあの人の本当のラベルは、本人にしかわかりません。",
      ].join("\n");
      break;
    case 2:
      // この通の角度は `why`。**`ng / ok` を混ぜない。**
      // 以前は ✕/◯ も載せていたため、1通目（translate）と同じ中身が2週後に
      // もう一度届いていた（15通中3通）。見出しも「言い方の翻訳講座」のままで、
      // 中身が why なのに見出しが嘘になっていた。
      body = [
        `【${(heading = `なぜ効くか｜対 ${worst.typeName}`)}】`,
        "",
        guide.why,
      ].join("\n");
      break;
    case 3:
      body = [
        `【${(heading = `今日からやること｜対 ${worst.typeName}`)}】`,
        "",
        ...guide.dos.map((d, i) => `${i + 1}. ${d}`),
        "",
        "全部やれとは言いません。1つでいいです。",
      ].join("\n");
      break;
    default:
      body = [
        `【${(heading = `距離の置き方｜対 ${worst.typeName}`)}】`,
        "",
        guide.distance,
        "",
        "逃げるのは負けじゃありません。保管距離という安全管理です。",
      ].join("\n");
      break;
  }

  return {
    issue,
    subject: `【Togel】${heading}（${issue}/${BROADCAST_TOTAL_ISSUES}）`,
    text: `${issue}通目です（全${BROADCAST_TOTAL_ISSUES}通）\n\n${body}\n\n▼ 続きはサイトで\n${cellUrl(worstId, kind)}`,
  };
};
