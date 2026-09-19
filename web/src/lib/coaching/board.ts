import type { TypeApproachGuide } from "./translations";

/**
 * 攻略盤の構造。
 *
 * 盤は「あなたの分」だけで組む。24タイプ全部ではない。
 * 噛み合わないのは3〜5タイプであり、残りを読む動機は本来ないため。
 *
 *   light(10問) … ミスマッチ3タイプ × 5つの角度 = 15マス
 *   full(40問)  … ミスマッチ5タイプ × 5つの角度 = 25マス
 *
 * 5つの角度は既存の TypeApproachGuide の5フィールドをそのまま使う（新規執筆はしない）。
 * これは LINE週次配信の5テンプレと同一構造で、盤はその可視化にあたる。
 *
 * マスの意味は「歩き方を1つ覚えた」。「攻略した」「クリア」「マスター」は使わない
 * （攻略対象は関係と自分の取り扱い方であって、人ではない）。
 */

export type BoardAngle = "core" | "translate" | "why" | "dos" | "distance";

export const BOARD_ANGLES: { key: BoardAngle; label: string }[] = [
  { key: "core", label: "中身の正体" },
  { key: "translate", label: "言い方の翻訳" },
  { key: "why", label: "なぜ効くか" },
  { key: "dos", label: "今日からやること" },
  { key: "distance", label: "距離の置き方" },
];

/** 1タイプあたりのマス数 */
export const ANGLES_PER_TYPE = BOARD_ANGLES.length;

/**
 * 盤に載せる相手の数。**診断の種別によらず常に3**（3×5＝15マス）。
 *
 * 理由は2つ。
 * - LINE週次配信は15通で統一している。盤はその可視化なので、
 *   盤が25マスだと「登録すると週1マス進む」が盤の一部しか埋めない
 * - 人によって盤の全長が違うと、それ自体が達成度の差として読まれる
 *
 * full 診断の4・5番目の相手はマスにしない。読めるガイドとして出す
 * （full の価値は「進む距離が伸びる」ではなく「読めるものが増える」）。
 */
export const BOARD_TYPE_COUNT = 3;

export const boardTypeCount = (): number => BOARD_TYPE_COUNT;

/** マスの識別子。型と角度の組で1マス */
export const cellKey = (typeId: string, angle: BoardAngle): string => `${typeId}:${angle}`;

/** LINE配信のリンク等から渡されるマス指定（`<typeId>:<angle>`）を読む */
export const parseCellKey = (raw: string | null): { typeId: string; angle: BoardAngle } | null => {
  if (!raw) return null;
  const separator = raw.lastIndexOf(":");
  if (separator <= 0) return null;
  const typeId = raw.slice(0, separator);
  const angle = raw.slice(separator + 1) as BoardAngle;
  if (!BOARD_ANGLES.some((item) => item.key === angle)) return null;
  return { typeId, angle };
};

/**
 * 週次配信のテンプレ種別（broadcast.ts の kind）と盤のマスの対応。
 * 配信1通 = 1マス。Webで先に読んでも同じマスが埋まる。
 */
export const ANGLE_BY_BROADCAST_KIND: BoardAngle[] = [
  "translate", // 今週の地雷注意報（✕/◯）
  "core", // 中身の正体
  "why", // 言い方の翻訳講座（なぜ効くか）
  "dos", // 今日からやること
  "distance", // 距離の置き方
];

/** そのマスで読む本文（既存ガイドの該当フィールドを返すだけ） */
export const cellContent = (
  guide: TypeApproachGuide,
  angle: BoardAngle,
): { ng?: string; ok?: string; dos?: readonly string[]; body?: string } => {
  switch (angle) {
    case "core":
      return { body: guide.core };
    case "translate":
      return { ng: guide.ng, ok: guide.ok };
    case "why":
      return { body: guide.why };
    case "dos":
      return { dos: guide.dos };
    default:
      return { body: guide.distance };
  }
};
