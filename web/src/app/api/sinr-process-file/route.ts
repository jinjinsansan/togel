import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { getMichelleOpenAIClient } from "@/lib/michelle/openai";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { chunkTextSinr, getChunkStats } from "@/lib/michelle/chunk-sinr";

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

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

export async function POST(request: Request) {
  try {
    const { filename } = await request.json();
    
    if (!filename) {
      return NextResponse.json({ error: "filename required" }, { status: 400 });
    }

    const filePath = path.join(KNOWLEDGE_DIR, filename);
    
    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json({ error: `File not found: ${filename}` }, { status: 404 });
    }

    const relativeSource = sanitizeUnicode(filename);
    console.log(`[SINR] Processing ${relativeSource}`);

    const content = await fs.readFile(filePath, "utf-8");
    const parents = chunkTextSinr(content, {
      parentSize: PARENT_SIZE,
      parentOverlap: PARENT_OVERLAP,
      childSize: CHILD_SIZE,
      childOverlap: CHILD_OVERLAP,
    });

    if (parents.length === 0) {
      return NextResponse.json({ error: "No content found" }, { status: 400 });
    }

    const stats = getChunkStats(parents);
    console.log(`[SINR] Stats: ${stats.totalParents} parents, ${stats.totalChildren} children`);

    const supabase = createSupabaseAdminClient();

    // 既存データを削除
    const { error: deleteError } = await supabase
      .from("michelle_knowledge_parents")
      .delete()
      .eq("source", relativeSource);
    
    if (deleteError) {
      throw deleteError;
    }

    console.log(`[SINR] Generating embeddings and inserting...`);

    // 親→子を順次挿入
    for (const parent of parents) {
      // 1. 親チャンクを挿入
      const { data: insertedParent, error: parentError } = await supabase
        .from("michelle_knowledge_parents")
        .insert({
          content: sanitizeUnicode(parent.content),
          source: relativeSource,
          parent_index: parent.index,
          metadata: {
            child_count: parent.children.length,
          },
        })
        .select("id")
        .single();

      if (parentError || !insertedParent) {
        throw parentError || new Error("Failed to insert parent");
      }

      // 2. 子チャンクのembeddingを生成
      console.log(`[SINR] Parent ${parent.index}: Generating ${parent.children.length} embeddings...`);
      const childEmbeddings: number[][] = [];
      for (const child of parent.children) {
        const embedding = await embedText(child.content);
        childEmbeddings.push(embedding);
      }

      // 3. 子チャンクを挿入
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

      console.log(`[SINR] Inserted parent ${parent.index} with ${parent.children.length} children`);
    }

    // 最終確認
    const { count: parentCount } = await supabase
      .from("michelle_knowledge_parents")
      .select("*", { count: "exact", head: true })
      .eq("source", relativeSource);

    const { data: parentIds } = await supabase
      .from("michelle_knowledge_parents")
      .select("id")
      .eq("source", relativeSource);

    const { count: childCount } = await supabase
      .from("michelle_knowledge_children")
      .select("*", { count: "exact", head: true })
      .in("parent_id", parentIds?.map(p => p.id) ?? []);

    return NextResponse.json({
      success: true,
      filename: relativeSource,
      stats: {
        parents: parentCount ?? 0,
        children: childCount ?? 0,
        avgChildrenPerParent: stats.avgChildrenPerParent,
        parentLengthAvg: stats.parentLength.avg,
        childLengthAvg: stats.childLength.avg,
      },
    });

  } catch (error) {
    console.error("[SINR] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
