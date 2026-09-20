import { groupBadgeLine, groupEmoji } from "@/components/brand/group-badge";
import { typeApproachGuides } from "@/lib/coaching/translations";
import { typeToken } from "@/lib/personality";
import type { ExtendedPersonalityTypeDefinition } from "@/lib/personality";

/**
 * 共有される文面の組成。
 *
 * 既存の静的コンテンツ（24タイプ定義・地雷回避ガイド）から組み立てるだけで、
 * 実行時のAI生成はしない。ガイド本文は変更しない（読むだけ）。
 *
 * 原則:
 * - 愛称（`〜型`）を先頭に置く。bioと口頭に乗るのはこのトークン
 * - 毒は「組み合わせ」に向け、「型」には向けない
 * - 他人にラベルを貼って送る形は作らない。渡すのは**自分の**取扱説明書
 * - ハッシュタグは主（#トゥゲル診断）＋型別の2つまで
 */

export const MAIN_HASHTAG = "#トゥゲル診断";

/** 型別ハッシュタグ（例: #ライオ型） */
export const typeHashtag = (type: ExtendedPersonalityTypeDefinition): string =>
  `#${typeToken(type)}`;

/**
 * 地雷の一文。引用符の外側に付いている末尾の注記（例:「…？」（詮索））は
 * 読み手向けのメモなので落とす。引用符の内側は触らない。
 */
export const landmineQuote = (typeId: string): string =>
  (typeApproachGuides[typeId]?.ng ?? "").replace(/(?<=」)\s*（[^（）]*）\s*$/, "");

/**
 * 地雷が「言われること」か「されること」か。
 *
 * ガイドの ng は2つの役割を兼ねている。ガイドでは「NG行動」なのでト書き
 * （例:（考えているので6秒黙る））も有効だが、共有する文面では「私に言われたく
 * ない一言」として扱うので、発話でないと文が成立しない。
 * タイプ名で分岐せず、データの形で判別する。
 */
export const isSpokenLandmine = (typeId: string): boolean =>
  landmineQuote(typeId).startsWith("「");

/** 取扱注意ラベルの見出し */
export const landmineHeading = (typeId: string): string =>
  isSpokenLandmine(typeId) ? "私に言うと、警報が鳴ります" : "私にされると、警報が鳴ります";

/** ラベルの一文（中身の正体の冒頭に置かれた「…」）。見つからなければ null */
export const labelQuote = (typeId: string): string | null => {
  const core = typeApproachGuides[typeId]?.core ?? "";
  const matched = core.match(/「([^」]+)」/);
  return matched ? matched[1] : null;
};

/**
 * 名乗り（診断直後）。
 * 「合う」より「合わない」のほうが引用されるので、ミスマッチを併記する。
 */
export const mismatchPostText = (
  self: ExtendedPersonalityTypeDefinition | null,
  worst: ExtendedPersonalityTypeDefinition | null,
): string => {
  if (!self) return `トゥゲル診断をやりました\n\n${MAIN_HASHTAG}`;
  const head = `${typeToken(self)}でした。`;
  const tags = `${MAIN_HASHTAG} ${typeHashtag(self)}`;
  if (!worst) return `${head}\n\n${tags}`;
  return [
    head,
    `絶対に合わないのは ${worst.emoji} ${typeToken(worst)}らしい…心当たりしかない`,
    "",
    tags,
  ].join("\n");
};

/**
 * 取扱説明書（個人に渡す主役）。
 *
 * 他者に貼るのではなく、自分の扱われ方を自分の言葉で申告する形。
 * 地雷の一文を一人称の禁止事項に変換したものが中身になる。
 *
 * 群は名前だけを出さず、再定義の一行とセットで書く（`groupBadgeLine`）。
 */
export const handbookPostText = (type: ExtendedPersonalityTypeDefinition): string => {
  const label = labelQuote(type.id);
  const landmine = landmineQuote(type.id);
  const lines = [
    "私の取扱説明書です。",
    "",
    `${type.emoji} ${typeToken(type)} ／ ${groupEmoji(type.group)} ${groupBadgeLine(type.group)}`,
  ];
  if (label) lines.push(`「${label}」`);
  if (landmine) {
    // ト書き（沈黙など）は「言う」ものではないので、動詞を変える
    const request = isSpokenLandmine(type.id)
      ? `私に${landmine}は言わないでください。`
      : `私の前で${landmine}はしないでください。`;
    lines.push("", request, "警報が鳴ります。");
  }
  lines.push("", `${MAIN_HASHTAG} ${typeHashtag(type)}`);
  return lines.join("\n");
};

/** Xの投稿URL */
export const xIntentUrl = (text: string, url: string): string =>
  `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;

/** LINEで送るURL */
export const lineShareUrl = (text: string, url: string): string =>
  `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
