import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getMichelleOpenAIClient } from "@/lib/michelle/openai";
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

export async function retrieveKnowledgeMatches(text: string, options: RetrieveOptions = {}): Promise<KnowledgeMatch[]> {
  const embedding = await embedText(text);
  if (!embedding.length) {
    console.log("[RAG] No embedding generated, returning empty matches");
    return [];
  }

  console.log(`[RAG] Embedding ready (${embedding.length} dims), starting search`);
  const supabase = createSupabaseAdminClient();
  const attempt = async (threshold: number) => {
    console.log(`[RAG] Attempting RPC with threshold: ${threshold}`);
    const rpcArgs = {
      query_embedding: embedding,
      match_count: options.matchCount ?? 8,
      similarity_threshold: threshold,
    };

    const { data, error } = await supabase.rpc("match_michelle_knowledge", rpcArgs as never);
    if (error) {
      console.error("[RAG] RPC error:", error);
      return [] as KnowledgeMatch[];
    }

    console.log(`[RAG] RPC returned ${(data ?? []).length} matches at threshold ${threshold}`);
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
