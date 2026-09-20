/**
 * OG画像で使う絵文字を取ってきて、リポジトリに置く。
 *
 * satori（next/og）は既定で、絵文字を**描画のたびに外部CDNから取ってくる**。
 * OG画像はXに貼られたリンクのプレビューとして出るので、CDNが落ちれば
 * プレビューが静かに出なくなる。気づく手段も無い。往復の分だけ遅くもなる。
 * 使う絵文字は24タイプ＋4群＝28個で有限かつ固定なので、持っておく。
 *
 * 実行するのは絵文字を足したとき・変えたときだけ。普段は要らない。
 *
 *   npx tsx scripts/fetch-emoji.ts
 *
 * 出力先は src/assets/emoji/。取得元と再配布条件は同ディレクトリの NOTICE.md。
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { personalityTypes, TYPE_GROUP_ORDER } from "../src/lib/personality";
import { groupEmoji } from "../src/components/brand/group-badge";
import { emojiFileName } from "../src/lib/og/emoji";

/** next/og が既定で使っているものと同じ版。出力を変えないため */
const SOURCE = "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg";

const main = async () => {
  const outDir = join(process.cwd(), "src/assets/emoji");
  await mkdir(outDir, { recursive: true });

  const emojis = new Set<string>();
  for (const type of personalityTypes) emojis.add(type.emoji);
  for (const group of TYPE_GROUP_ORDER) emojis.add(groupEmoji(group));

  console.log(`取得: ${emojis.size} 個 → ${outDir}`);

  for (const emoji of emojis) {
    const name = emojiFileName(emoji);
    const response = await fetch(`${SOURCE}/${name}`);
    if (!response.ok) throw new Error(`${emoji} (${name}) が取れない: ${response.status}`);
    const svg = await response.text();
    await writeFile(join(outDir, name), svg, "utf8");
    console.log(`  ${emoji}  ${name}  ${svg.length}B`);
  }

  console.log("\n完了。NOTICE.md の記載（CC-BY 4.0 の帰属）を消さないこと。");
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
