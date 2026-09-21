import type { TypeApproachGuide } from "./translations";

/**
 * 地雷回避ガイドの「5つの角度」と、そのマスの住所。
 *
 * 【2026-09-21】**ここは図のモジュールではない。** 15マスのグリッドを描いていた
 * 攻略盤（数える図）は撤去したが、このファイルは残す。
 * `lib/line/broadcast.ts` が `ANGLE_BY_BROADCAST_KIND` と `cellKey` を使っていて、
 * 週1通のLINEが `/coaching?cell=<typeId>:<angle>` へリンクするための住所がここにある。
 * 消すと**配信のリンクに着地先が無くなる**。
 *
 * `BOARD_TYPE_COUNT` も残す。3タイプ × 5角度 = 15 が、そのまま
 * 週次配信の全15通と一致している必要がある（invariants で固定）。
 * 図の長さではなく、**配信の構造**としてここにある。
 *
 * 撤去したのは「何マス歩いたか」を数える部分だけ。数えていたのは
 * 「ガイドを何ページ開いたか」で、増えても読む人に意味が無かった。
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
