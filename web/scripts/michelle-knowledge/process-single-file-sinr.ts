/**
 * 単一ファイルSINR処理スクリプト（テスト用）
 * 
 * 1つのファイルのみをSINR形式で処理してデータベースに保存
 */

import fs from "node:fs/promises";
import path from "node:path";

import { config as loadEnv } from "dotenv";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

import type { MichelleDatabase } from "../../src/types/michelle-db";
import { chunkTextSinr, getChunkStats } from "./chunk-sinr";

const envLocalPath = path.resolve(process.cwd(), ".env.local");
loadEnv({ path: envLocalPath, override: true });
loadEnv();

const KNOWLEDGE_DIR = path.resolve(process.cwd(), "md", "michelle");
const EMBEDDING_MODEL = "text-embedding-3-small";

// SINRチャンキングオプション
const PARENT_SIZE = 800;
const PARENT_OVERLAP = 100;
const CHILD_SIZE = 200;
const CHILD_OVERLAP = 50;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Supabase credentials required.");
}

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY required.");
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

async function embedText(input: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input,
  });
  return response.data[0].embedding;
}

async function main() {
  // コマンドライン引数からファイル名を取得
  const targetFile = process.argv[2];
  
  if (!targetFile) {
    console.error("Usage: node --import tsx process-single-file-sinr.ts <filename.md>");
    process.exit(1);
  }

  const filePath = path.join(KNOWLEDGE_DIR, targetFile);
  
  try {
    await fs.access(filePath);
  } catch {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const relativeSource = sanitizeUnicode(targetFile);
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

  console.log(`  🔄 Generating embeddings and inserting to database...`);

  // 親→子を順次挿入
  for (const parent of parents) {
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
    console.log(`  ⏳ Parent ${parent.index}: Generating ${parent.children.length} child embeddings...`);
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

    console.log(`  ✅ Inserted parent ${parent.index} with ${parent.children.length} children`);
  }

  // 最終確認
  const { count: parentCount } = await supabase
    .from("michelle_knowledge_parents")
    .select("*", { count: "exact", head: true })
    .eq("source", relativeSource);

  const { data: childData } = await supabase
    .from("michelle_knowledge_children")
    .select("parent_id")
    .in("parent_id", 
      (await supabase.from("michelle_knowledge_parents").select("id").eq("source", relativeSource)).data?.map(p => p.id) ?? []
    );

  console.log("\n✨ Processing complete!");
  console.log(`   File: ${relativeSource}`);
  console.log(`   Inserted: ${parentCount ?? 0} parents, ${childData?.length ?? 0} children`);
}

main().catch((error) => {
  console.error("\n❌ Failed to process file");
  console.error(error);
  process.exit(1);
});
