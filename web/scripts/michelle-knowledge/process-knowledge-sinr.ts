/**
 * SINR知識ベース処理スクリプト
 * 
 * md/michelle/ 内のMarkdownファイルを読み込み、
 * SINR形式（親子チャンク）でデータベースに保存
 */

import fs from "node:fs/promises";
import path from "node:path";
import { setDefaultResultOrder } from "node:dns";

import { config as loadEnv } from "dotenv";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

import type { MichelleDatabase } from "../../src/types/michelle-db";
import { chunkTextSinr, getChunkStats } from "./chunk-sinr";

setDefaultResultOrder("ipv4first");

const envLocalPath = path.resolve(process.cwd(), ".env.local");
loadEnv({ path: envLocalPath, override: true });
loadEnv();

const KNOWLEDGE_DIR = path.resolve(process.cwd(), "md", "michelle");
const BATCH_SIZE = 10;
const EMBEDDING_MODEL = "text-embedding-3-small";

// SINRチャンキングオプション
const PARENT_SIZE = 800;
const PARENT_OVERLAP = 100;
const CHILD_SIZE = 200;
const CHILD_OVERLAP = 50;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Supabase credentials (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are required.");
}

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is required to generate embeddings.");
}

type ParentInsert = MichelleDatabase["public"]["Tables"]["michelle_knowledge_parents"]["Insert"];
type ChildInsert = MichelleDatabase["public"]["Tables"]["michelle_knowledge_children"]["Insert"];

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function sanitizeUnicode(value: string): string {
  return Array.from(value)
    .filter((char) => {
      const codePoint = char.codePointAt(0);
      return typeof codePoint === "number" && (codePoint < 0xd800 || codePoint > 0xdfff);
    })
    .join("");
}

async function listMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return listMarkdownFiles(fullPath);
      }
      if (entry.isFile() && entry.name.endsWith(".md")) {
        return [fullPath];
      }
      return [];
    }),
  );
  return files.flat();
}

async function embedText(input: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input,
  });
  return response.data[0].embedding;
}

async function processFile(filePath: string) {
  const relativeSource = sanitizeUnicode(path.relative(KNOWLEDGE_DIR, filePath) || path.basename(filePath));
  console.log(`\n📄 Processing ${relativeSource}`);

  const content = await fs.readFile(filePath, "utf-8");
  const parents = chunkTextSinr(content, {
    parentSize: PARENT_SIZE,
    parentOverlap: PARENT_OVERLAP,
    childSize: CHILD_SIZE,
    childOverlap: CHILD_OVERLAP,
  });

  if (parents.length === 0) {
    console.log("  ⚠️  No content found, skipping.");
    return;
  }

  const stats = getChunkStats(parents);
  console.log(`  📊 Stats: ${stats.totalParents} parents, ${stats.totalChildren} children (avg ${stats.avgChildrenPerParent}/parent)`);

  // 既存データを削除
  const { error: deleteError } = await supabase
    .from("michelle_knowledge_parents")
    .delete()
    .eq("source", relativeSource);
  if (deleteError) {
    throw deleteError;
  }

  // バッチ処理で親→子を挿入
  for (let i = 0; i < parents.length; i += BATCH_SIZE) {
    const parentBatch = parents.slice(i, i + BATCH_SIZE);

    for (const parent of parentBatch) {
      // 1. 親チャンクを挿入
      const parentRow: ParentInsert = {
        content: sanitizeUnicode(parent.content),
        source: relativeSource,
        parent_index: parent.index,
        metadata: {
          child_count: parent.children.length,
        },
      };

      const { data: insertedParent, error: parentError } = await supabase
        .from("michelle_knowledge_parents")
        .insert(parentRow)
        .select("id")
        .single();

      if (parentError || !insertedParent) {
        throw parentError || new Error("Failed to insert parent");
      }

      // 2. 子チャンクのembeddingを生成
      const childEmbeddings: number[][] = [];
      for (const child of parent.children) {
        const embedding = await embedText(child.content);
        childEmbeddings.push(embedding);
      }

      // 3. 子チャンクを挿入
      const childRows: ChildInsert[] = parent.children.map((child, idx) => ({
        parent_id: insertedParent.id,
        content: sanitizeUnicode(child.content),
        embedding: childEmbeddings[idx],
        child_index: child.index,
        metadata: {},
      }));

      const { error: childError } = await supabase
        .from("michelle_knowledge_children")
        .insert(childRows);

      if (childError) {
        throw childError;
      }

      console.log(
        `  ✅ Inserted parent ${parent.index} with ${parent.children.length} children (${Math.min(i + BATCH_SIZE, parents.length)}/${parents.length})`,
      );
    }
  }
}

async function main() {
  try {
    await fs.access(KNOWLEDGE_DIR);
  } catch {
    throw new Error(`Knowledge directory not found: ${KNOWLEDGE_DIR}`);
  }

  const files = await listMarkdownFiles(KNOWLEDGE_DIR);
  if (files.length === 0) {
    console.log("No markdown files found in md/michelle directory.");
    return;
  }

  console.log(`\n🚀 Starting SINR knowledge base processing...`);
  console.log(`   Parent chunks: ${PARENT_SIZE} chars (overlap ${PARENT_OVERLAP})`);
  console.log(`   Child chunks: ${CHILD_SIZE} chars (overlap ${CHILD_OVERLAP})`);
  console.log(`   Total files: ${files.length}\n`);

  for (const file of files) {
    await processFile(file);
  }

  // 最終確認
  const { count: parentCount } = await supabase
    .from("michelle_knowledge_parents")
    .select("*", { count: "exact", head: true });

  const { count: childCount } = await supabase
    .from("michelle_knowledge_children")
    .select("*", { count: "exact", head: true });

  console.log("\n✨ SINR knowledge base processing complete.");
  console.log(`   Total: ${parentCount ?? 0} parents, ${childCount ?? 0} children`);
}

main().catch((error) => {
  console.error("\n❌ Failed to process SINR knowledge base");
  console.error(error);
  process.exit(1);
});
