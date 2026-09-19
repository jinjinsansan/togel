import { TYPE_GROUP_ORDER } from "./groups";
import type { TypeGroupId } from "./groups";

/**
 * 群×群の相性表（4群×4群＝16マス）。
 *
 * 24×24＝576マスは1枚の画像に収まらないため、群の層で1枚にする。
 * 相性は対称（引火×沈降 ＝ 沈降×引火）なので、データは10通りで持ち、
 * 参照時に対称展開する。
 *
 * 記号が評価するのは「組み合わせ」であって「人」ではない。
 * どの群も、どこかの組み合わせで ◎ を持つ配分になっている（⚡＝悪い群の印ではない）。
 * 文言は監修が確定させたもの。開発側で書き換えない。
 */

export type GroupMatchSymbol = "◎" | "○" | "△" | "⚡";

export type GroupMatchCell = {
  symbol: GroupMatchSymbol;
  /** 断定回避形（「〜が多い」「〜がち」「〜やすい」）で統一されている */
  text: string;
};

/** 実体10通り。キーは TYPE_GROUP_ORDER の並び順で若い方を先に置く */
const GROUP_MATRIX: Record<string, GroupMatchCell> = {
  "ignition:ignition": {
    symbol: "⚡",
    text: "燃料同士。火力は出ますが、消火役が誰もいないことが多いようです",
  },
  "ignition:settling": {
    symbol: "⚡",
    text: "速度差が事故になりやすい組み合わせ。急かすほど沈んでいきます",
  },
  "ignition:chain": {
    symbol: "◎",
    text: "よく回ります。ただし後始末は、たいてい回す側が全部持ちます",
  },
  "ignition:inert": {
    symbol: "⚡",
    text: "最大の温度差。噛み合えば最強、こじれると一番長引きます",
  },
  "settling:settling": {
    symbol: "○",
    text: "静かで楽な関係になりやすい。ただし沈むときは一緒に沈みます",
  },
  "settling:chain": {
    symbol: "△",
    text: "片方の善意が、もう片方には侵入に見えることがあります",
  },
  "settling:inert": {
    symbol: "◎",
    text: "距離の取り方が似ています。気づいたら何年も続いていることが多い組み合わせ",
  },
  "chain:chain": {
    symbol: "△",
    text: "全員が気を遣い、誰も本音を言わない場になりがちです",
  },
  "chain:inert": {
    symbol: "◎",
    text: "守る側と回す側で、分業が成立しやすい組み合わせです",
  },
  "inert:inert": {
    symbol: "○",
    text: "安定します。壊れませんが、そのぶん変わりません",
  },
};

const canonicalKey = (a: TypeGroupId, b: TypeGroupId): string => {
  const [first, second] =
    TYPE_GROUP_ORDER.indexOf(a) <= TYPE_GROUP_ORDER.indexOf(b) ? [a, b] : [b, a];
  return `${first}:${second}`;
};

/** 行（自分の群）× 列（相手の群）。対称なので順序は問わない */
export const groupMatrixCell = (row: TypeGroupId, column: TypeGroupId): GroupMatchCell =>
  GROUP_MATRIX[canonicalKey(row, column)];

/** 10通りを定義順で列挙する（表の外に本文を並べる用） */
export const groupMatrixPairs = (): { a: TypeGroupId; b: TypeGroupId; cell: GroupMatchCell }[] => {
  const pairs: { a: TypeGroupId; b: TypeGroupId; cell: GroupMatchCell }[] = [];
  TYPE_GROUP_ORDER.forEach((a, index) => {
    TYPE_GROUP_ORDER.slice(index).forEach((b) => {
      pairs.push({ a, b, cell: groupMatrixCell(a, b) });
    });
  });
  return pairs;
};
