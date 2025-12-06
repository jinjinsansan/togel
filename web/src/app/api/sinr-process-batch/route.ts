import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { getMichelleOpenAIClient } from "@/lib/michelle/openai";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { chunkTextSinr, getChunkStats } from "@/lib/michelle/chunk-sinr";

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5分

const KNOWLEDGE_DIR = path.resolve(process.cwd(), "md", "michelle");
const EMBEDDING_MODEL = "text-embedding-3-small";

const PARENT_SIZE = 800;
const PARENT_OVERLAP = 100;
const CHILD_SIZE = 200;
const CHILD_OVERLAP = 50;

function sanitizeUnicode(value: string): string {
  return Array.from(value)
    .filter((char) => {
      const codePoint = char.codePointAt(0);
      return typeof codePoint === "number" && (codePoint < 0xd800 || codePoint > 0xdfff);
    })
    .join("");
}

async function embedText(input: string): Promise<number[]> {
  const openai = getMichelleOpenAIClient();
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input,
  });
  return response.data[0].embedding;
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
        return [path.relative(KNOWLEDGE_DIR, fullPath)];
      }
      return [];
    }),
  );
  return files.flat();
}

type ProcessResult = 
  | { filename: string; parents: number; children: number; skipped: boolean; error?: never }
  | { filename: string; error: string; parents?: never; children?: never; skipped?: never };

async function processFile(filename: string): Promise<ProcessResult> {
  const filePath = path.join(KNOWLEDGE_DIR, filename);
  const relativeSource = sanitizeUnicode(filename);
  
  console.log(`[SINR Batch] Processing ${relativeSource}`);

  const content = await fs.readFile(filePath, "utf-8");
  const parents = chunkTextSinr(content, {
    parentSize: PARENT_SIZE,
    parentOverlap: PARENT_OVERLAP,
    childSize: CHILD_SIZE,
    childOverlap: CHILD_OVERLAP,
  });

  if (parents.length === 0) {
    console.log(`[SINR Batch] No content in ${relativeSource}, skipping`);
    return { filename: relativeSource, parents: 0, children: 0, skipped: true };
  }

  const stats = getChunkStats(parents);
  const supabase = createSupabaseAdminClient();

  // 既存データを削除
  await supabase
    .from("michelle_knowledge_parents")
    .delete()
    .eq("source", relativeSource);

  // 親→子を順次挿入
  for (const parent of parents) {
    const { data: insertedParent, error: parentError } = await supabase
      .from("michelle_knowledge_parents")
      .insert({
        content: sanitizeUnicode(parent.content),
        source: relativeSource,
        parent_index: parent.index,
        metadata: { child_count: parent.children.length },
      })
      .select("id")
      .single();

    if (parentError || !insertedParent) {
      throw parentError || new Error("Failed to insert parent");
    }

    // 子チャンクのembedding生成
    const childEmbeddings: number[][] = [];
    for (const child of parent.children) {
      const embedding = await embedText(child.content);
      childEmbeddings.push(embedding);
    }

    // 子チャンクを挿入
    const childRows = parent.children.map((child, idx) => ({
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
  }

  console.log(`[SINR Batch] Completed ${relativeSource}: ${stats.totalParents}p, ${stats.totalChildren}c`);
  
  return {
    filename: relativeSource,
    parents: stats.totalParents,
    children: stats.totalChildren,
    skipped: false,
  };
}

export async function POST(request: Request) {
  try {
    const { startIndex = 0, batchSize = 10 } = await request.json().catch(() => ({}));

    console.log(`[SINR Batch] Starting batch: startIndex=${startIndex}, batchSize=${batchSize}`);

    // 全ファイルリストを取得
    const allFiles = await listMarkdownFiles(KNOWLEDGE_DIR);
    const totalFiles = allFiles.length;
    
    // バッチ範囲を計算
    const endIndex = Math.min(startIndex + batchSize, totalFiles);
    const batch = allFiles.slice(startIndex, endIndex);

    console.log(`[SINR Batch] Processing ${batch.length} files (${startIndex}-${endIndex}/${totalFiles})`);

    const results: ProcessResult[] = [];
    
    for (const filename of batch) {
      try {
        const result = await processFile(filename);
        results.push(result);
      } catch (error) {
        console.error(`[SINR Batch] Error processing ${filename}:`, error);
        results.push({
          filename,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // 集計
    const successful = results.filter(r => !r.error && !r.skipped);
    const totalParents = successful.reduce((sum, r) => sum + (r.parents || 0), 0);
    const totalChildren = successful.reduce((sum, r) => sum + (r.children || 0), 0);

    // 次のバッチ情報
    const hasMore = endIndex < totalFiles;
    const nextStartIndex = endIndex;

    return NextResponse.json({
      success: true,
      batch: {
        startIndex,
        endIndex,
        processed: batch.length,
        totalFiles,
        progress: `${endIndex}/${totalFiles}`,
        progressPercent: Math.round((endIndex / totalFiles) * 100),
      },
      results,
      summary: {
        successful: successful.length,
        errors: results.filter(r => r.error).length,
        skipped: results.filter(r => r.skipped).length,
        totalParents,
        totalChildren,
      },
      next: hasMore ? {
        hasMore: true,
        nextStartIndex,
        nextBatchSize: batchSize,
      } : {
        hasMore: false,
        message: "All files processed!",
      },
    });

  } catch (error) {
    console.error("[SINR Batch] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
