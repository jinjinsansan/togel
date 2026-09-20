/**
 * OG画像のコンタクトシート。
 *
 * tests/og-images.test.ts は「生成が落ちない・実寸が正しい・PNGである」までを見る。
 * 見ていないのは中身で、文字が枠からはみ出す・長い愛称で行が崩れる・読めない、は
 * 機械では捕まらない。全部を1枚に並べて、人が一度に見られるようにする。
 *
 * 各タイルにタイプIDを振ってあるので、崩れている枚を名前で指せる。
 *
 * sharp は Next の依存として既に入っているものを使う（新規追加ではない）。
 * 無くなっていればここで落ちる。テストからは呼ばない（開発時に人が走らせる道具）。
 *
 *   npx tsx scripts/contact-sheet.ts [出力先ディレクトリ]
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import sharp from "sharp";

import { GET as ogRoute } from "../src/app/api/og/route";
import { GET as groupsRoute } from "../src/app/api/og/groups/route";
import { personalityTypes, typeToken } from "../src/lib/personality";

const COLUMNS = 6;
const GAP = 12;
const CAPTION_HEIGHT = 30;
const BACKGROUND = { r: 7, g: 9, b: 15, alpha: 1 }; // ink

const render = async (url: string, route: typeof ogRoute): Promise<Buffer> => {
  const response = await route(new Request(`https://www.to-gel.com${url}`));
  if (response.status !== 200) throw new Error(`${url} が ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
};

/** タイルの下に敷く見出し。崩れている枚を名前で指せるようにする */
const caption = (text: string, width: number): Buffer =>
  Buffer.from(
    `<svg width="${width}" height="${CAPTION_HEIGHT}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect width="100%" height="100%" fill="#0B0F1A"/>` +
      `<text x="${width / 2}" y="20" fill="#9aa5ba" font-size="16" font-family="sans-serif"` +
      ` text-anchor="middle">${text.replace(/[<>&]/g, "")}</text>` +
      `</svg>`,
  );

type Tile = { label: string; image: Buffer };

/** タイルを格子に並べて1枚にする */
const buildSheet = async (tiles: Tile[], tileWidth: number, tileHeight: number) => {
  const rows = Math.ceil(tiles.length / COLUMNS);
  const cellHeight = tileHeight + CAPTION_HEIGHT;
  const width = COLUMNS * tileWidth + (COLUMNS + 1) * GAP;
  const height = rows * cellHeight + (rows + 1) * GAP;

  const composites = [];
  for (const [index, tile] of tiles.entries()) {
    const column = index % COLUMNS;
    const row = Math.floor(index / COLUMNS);
    const left = GAP + column * (tileWidth + GAP);
    const top = GAP + row * (cellHeight + GAP);

    composites.push({
      input: await sharp(tile.image).resize(tileWidth, tileHeight, { fit: "fill" }).png().toBuffer(),
      left,
      top,
    });
    composites.push({ input: caption(tile.label, tileWidth), left, top: top + tileHeight });
  }

  return sharp({ create: { width, height, channels: 4, background: BACKGROUND } })
    .composite(composites)
    .png()
    .toBuffer();
};

const main = async () => {
  const outDir = resolve(process.argv[2] ?? join(process.cwd(), ".artifacts", "contact-sheets"));
  await mkdir(outDir, { recursive: true });

  console.log(`出力先: ${outDir}`);
  console.log(`タイプ数: ${personalityTypes.length}`);

  // 1. 取扱注意ラベル（1080×1920 → 9:16のまま縮小）
  console.log("\n取扱注意ラベルを生成中…");
  const storyTiles: Tile[] = [];
  for (const type of personalityTypes) {
    storyTiles.push({
      label: `${typeToken(type)} / ${type.id}`,
      image: await render(`/api/og?type=${type.id}&format=story`, ogRoute),
    });
    process.stdout.write(".");
  }
  const storySheet = await buildSheet(storyTiles, 288, 512);
  await writeFile(join(outDir, "story-sheet.png"), storySheet);

  // 2. 横型カード（1200×630）
  console.log("\n横型カードを生成中…");
  const cardTiles: Tile[] = [];
  for (const type of personalityTypes) {
    cardTiles.push({
      label: `${typeToken(type)} / ${type.id}`,
      image: await render(`/api/og?type=${type.id}`, ogRoute),
    });
    process.stdout.write(".");
  }
  const cardSheet = await buildSheet(cardTiles, 400, 210);
  await writeFile(join(outDir, "card-sheet.png"), cardSheet);

  // 3. 相性表（1080×1350）。1枚しかないので等倍のまま出す
  console.log("\n相性表を生成中…");
  await writeFile(join(outDir, "groups.png"), await render("/api/og/groups", groupsRoute));

  const sizes = [
    ["story-sheet.png", storySheet],
    ["card-sheet.png", cardSheet],
  ] as const;
  console.log("\n\n生成しました:");
  for (const [name, buffer] of sizes) {
    const meta = await sharp(buffer).metadata();
    console.log(`  ${join(outDir, name)}  ${meta.width}x${meta.height}  ${Math.round(buffer.byteLength / 1024)}KB`);
  }
  console.log(`  ${join(outDir, "groups.png")}  1080x1350`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
