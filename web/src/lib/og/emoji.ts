import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * OG画像の絵文字。
 *
 * satori は絵文字の文字をそのまま渡すと、描画のたびに外部CDNから画像を
 * 取ってくる。OG画像はXに貼られたリンクのプレビューとして出るものなので、
 * CDNが落ちればプレビューが静かに出なくなり、気づく手段も無い。
 * そこで絵文字は文字ではなく `<img>` として渡し、中身はリポジトリから読む。
 *
 * 素材は src/assets/emoji/（取得は scripts/fetch-emoji.ts、帰属は NOTICE.md）。
 */

const ASSET_DIR = join(process.cwd(), "src/assets/emoji");

/**
 * 絵文字からファイル名を作る。
 *
 * 異体字セレクタ（U+FE0F）は素材側のファイル名に含まれないので落とす
 * （例: ✈️ = 2708-fe0f → 2708.svg）。
 */
export const emojiFileName = (emoji: string): string =>
  `${[...emoji]
    .map((char) => char.codePointAt(0)!)
    .filter((code) => code !== 0xfe0f)
    .map((code) => code.toString(16))
    .join("-")}.svg`;

const cache = new Map<string, string>();

/**
 * `<img src>` に渡せる data URI を返す。
 * 素材が無ければ投げる（黙って空の画像を描かない。欠けたことが分かるように）。
 */
export const emojiDataUri = async (emoji: string): Promise<string> => {
  const cached = cache.get(emoji);
  if (cached) return cached;

  const name = emojiFileName(emoji);
  let svg: string;
  try {
    svg = await readFile(join(ASSET_DIR, name), "utf8");
  } catch {
    throw new Error(
      `絵文字の素材がない: ${emoji} (${name})。npx tsx scripts/fetch-emoji.ts を実行する`,
    );
  }

  const uri = `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
  cache.set(emoji, uri);
  return uri;
};
