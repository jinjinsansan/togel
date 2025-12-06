import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getMichelleOpenAIClient } from "@/lib/michelle/openai";
import { serverEnv } from "@/lib/env.server";
import type { Json } from "@/types/michelle-db";

const EMBEDDING_MODEL = "text-embedding-3-small";
const DEFAULT_THRESHOLD = 0.65;
const FALLBACK_THRESHOLDS = [0.58, 0.5, 0.45, 0.35];

export type KnowledgeMatch = {
  id: string;
  content: string;
  metadata: Json | null;
  similarity: number;
};

type SinrMatch = {
  parent_id: string;
  parent_content: string;
  parent_metadata: Json | null;
  parent_source: string;
  child_similarity: number;
};

export async function embedText(text: string) {
  const normalized = text.trim();
  if (!normalized) {
    console.log("[RAG] Empty text, skipping embedding");
    return [] as number[];
  }

  try {
    console.log(`[RAG] Generating embedding for: "${normalized.slice(0, 50)}..."`);
    const openai = getMichelleOpenAIClient();
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: normalized,
    });

    const embedding = response.data[0]?.embedding ?? [];
    console.log(`[RAG] Embedding generated: ${embedding.length} dimensions`);
    return embedding;
  } catch (error) {
    console.error("[RAG] Embedding generation failed:", error);
    return [];
  }
}

type RetrieveOptions = {
  matchCount?: number;
  similarityThreshold?: number;
};

/**
 * SINR検索：子チャンクで検索→親チャンクを返す
 */
async function retrieveSinrMatches(
  embedding: number[],
  options: RetrieveOptions,
): Promise<KnowledgeMatch[]> {
  const supabase = createSupabaseAdminClient();
  
  const attempt = async (threshold: number) => {
    console.log(`[RAG SINR] Attempting with threshold: ${threshold}`);
    const { data, error } = await supabase.rpc("match_michelle_knowledge_sinr", {
      query_embedding: embedding,
      match_count: options.matchCount ?? 8,
      similarity_threshold: threshold,
    } as never);

    if (error) {
      console.error("[RAG SINR] RPC error:", error);
      return [] as SinrMatch[];
    }

    const sinrMatches = (data ?? []) as SinrMatch[];
    console.log(`[RAG SINR] RPC returned ${sinrMatches.length} matches at threshold ${threshold}`);
    return sinrMatches;
  };

  const thresholds = [options.similarityThreshold ?? DEFAULT_THRESHOLD, ...FALLBACK_THRESHOLDS]
    .filter((value, index, arr) => value > 0 && arr.indexOf(value) === index)
    .sort((a, b) => b - a);

  for (const threshold of thresholds) {
    const sinrMatches = await attempt(threshold);
    if (sinrMatches.length) {
      // SinrMatchをKnowledgeMatchに変換
      return sinrMatches.map(m => ({
        id: m.parent_id,
        content: m.parent_content,
        metadata: m.parent_metadata,
        similarity: m.child_similarity,
      }));
    }
  }

  return [];
}

/**
 * 既存RAG検索（1000文字チャンク）
 */
async function retrieveOriginalMatches(
  embedding: number[],
  options: RetrieveOptions,
): Promise<KnowledgeMatch[]> {
  const supabase = createSupabaseAdminClient();
  
  const attempt = async (threshold: number) => {
    console.log(`[RAG Original] Attempting RPC with threshold: ${threshold}`);
    const rpcArgs = {
      query_embedding: embedding,
      match_count: options.matchCount ?? 8,
      similarity_threshold: threshold,
    };

    const { data, error } = await supabase.rpc("match_michelle_knowledge", rpcArgs as never);
    if (error) {
      console.error("[RAG Original] RPC error:", error);
      return [] as KnowledgeMatch[];
    }

    console.log(`[RAG Original] RPC returned ${(data ?? []).length} matches at threshold ${threshold}`);
    return (data ?? []) as KnowledgeMatch[];
  };

  const thresholds = [options.similarityThreshold ?? DEFAULT_THRESHOLD, ...FALLBACK_THRESHOLDS]
    .filter((value, index, arr) => value > 0 && arr.indexOf(value) === index)
    .sort((a, b) => b - a);

  for (const threshold of thresholds) {
    const matches = await attempt(threshold);
    if (matches.length) {
      return matches;
    }
  }

  return [];
}

export async function retrieveKnowledgeMatches(text: string, options: RetrieveOptions = {}): Promise<KnowledgeMatch[]> {
  const embedding = await embedText(text);
  if (!embedding.length) {
    console.log("[RAG] No embedding generated, returning empty matches");
    return [];
  }

  console.log(`[RAG] Embedding ready (${embedding.length} dims), starting search`);
  console.log(`[RAG] Mode: ${serverEnv.useSinrRag ? "SINR" : "Original"}`);

  // フィーチャーフラグに基づいて検索方法を切り替え
  if (serverEnv.useSinrRag) {
    const sinrMatches = await retrieveSinrMatches(embedding, options);
    
    // SINRで結果が得られなければ既存RAGにフォールバック
    if (sinrMatches.length === 0) {
      console.log("[RAG] SINR returned 0 matches, falling back to original RAG");
      return retrieveOriginalMatches(embedding, options);
    }
    
    return sinrMatches;
  }

  // デフォルト：既存RAG検索
  return retrieveOriginalMatches(embedding, options);
}
