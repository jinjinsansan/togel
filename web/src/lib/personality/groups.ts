import { personalityTypes } from "./definitions";
import type { ExtendedPersonalityTypeDefinition } from "./definitions";

/**
 * 24タイプの上位レイヤー「群」。
 *
 * 24タイプのままでは相性表が 24×24＝576マスになり1枚の画像に収まらない。
 * 群×群の 4×4＝16マスにすることで、1枚で読める・拡散できる形になる。
 *
 * 【重要】このファイルは群の「所属」だけを扱う。
 * 群名（引火群 等）と再定義の一行は `components/brand/group-badge.tsx` が
 * 一体で保持しており、名前だけを取り出す経路は用意していない。
 * 群名はユーザーが自分に貼るラベルなので、必ず再定義とセットで表示する。
 */

export type TypeGroupId = "ignition" | "settling" | "chain" | "inert";

/** 表示順（定義順＝この順序）。24タイプの定義順がそのまま 6件ずつ4群になっている */
export const TYPE_GROUP_ORDER: readonly TypeGroupId[] = [
  "ignition",
  "settling",
  "chain",
  "inert",
] as const;

/** 1群あたりのタイプ数 */
export const TYPES_PER_GROUP = 6;

export const groupOfType = (typeId: string): TypeGroupId | null =>
  personalityTypes.find((type) => type.id === typeId)?.group ?? null;

export const typesInGroup = (group: TypeGroupId): ExtendedPersonalityTypeDefinition[] =>
  personalityTypes.filter((type) => type.group === group);

/** 群の組み合わせキー（相性表の1マスを指す。例: "ignition:inert"） */
export type GroupPairKey = `${TypeGroupId}:${TypeGroupId}`;

export const groupPairKey = (row: TypeGroupId, column: TypeGroupId): GroupPairKey =>
  `${row}:${column}`;
