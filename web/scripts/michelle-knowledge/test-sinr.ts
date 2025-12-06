/**
 * SINR テストスクリプト
 * 1つのファイルのみを処理して結果を確認
 */

import fs from "node:fs/promises";
import path from "node:path";

import { chunkTextSinr, getChunkStats } from "./chunk-sinr";

const KNOWLEDGE_DIR = path.resolve(process.cwd(), "md", "michelle");

async function main() {
  console.log("🧪 SINR Chunking Test\n");

  // テストファイルを探す
  const files = await fs.readdir(KNOWLEDGE_DIR);
  const testFile = files.find((f) => f.endsWith(".md"));

  if (!testFile) {
    console.error("No markdown files found in md/michelle");
    return;
  }

  const filePath = path.join(KNOWLEDGE_DIR, testFile);
  console.log(`📄 Test file: ${testFile}\n`);

  const content = await fs.readFile(filePath, "utf-8");
  console.log(`📏 Original content: ${content.length} characters\n`);

  // SINRチャンキング
  const parents = chunkTextSinr(content, {
    parentSize: 800,
    parentOverlap: 100,
    childSize: 200,
    childOverlap: 50,
  });

  const stats = getChunkStats(parents);

  console.log("📊 Chunking Results:");
  console.log(`   Parents: ${stats.totalParents}`);
  console.log(`   Children: ${stats.totalChildren}`);
  console.log(`   Avg children per parent: ${stats.avgChildrenPerParent}`);
  console.log(`   Parent length: min=${stats.parentLength.min}, max=${stats.parentLength.max}, avg=${stats.parentLength.avg}`);
  console.log(`   Child length: min=${stats.childLength.min}, max=${stats.childLength.max}, avg=${stats.childLength.avg}`);

  // サンプル表示
  console.log("\n📝 Sample (first parent):");
  if (parents.length > 0) {
    const first = parents[0];
    console.log(`   Parent [${first.index}]: "${first.content.slice(0, 100)}..."`);
    console.log(`   Children: ${first.children.length}`);
    first.children.forEach((child, idx) => {
      console.log(`     Child [${child.index}]: "${child.content.slice(0, 60)}..."`);
    });
  }

  console.log("\n✅ Test complete!");
}

main().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
});
