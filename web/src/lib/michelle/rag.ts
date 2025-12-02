import type { SupabaseClient } from "@supabase/supabase-js";

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
    return [] as number[];
  }

  const openai = getMichelleOpenAIClient();
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: normalized,
  });

  return response.data[0]?.embedding ?? [];
}

type RetrieveOptions = {
  matchCount?: number;
  similarityThreshold?: number;
};

export async function retrieveKnowledgeMatches(
  supabase: SupabaseClient<any>,
  text: string,
  options: RetrieveOptions = {},
): Promise<KnowledgeMatch[]> {
  const embedding = await embedText(text);
  if (!embedding.length) {
    return [];
  }

  const attempt = async (threshold: number) => {
    const rpcArgs = {
      query_embedding: embedding,
      match_count: options.matchCount ?? 8,
      similarity_threshold: threshold,
    };

    const { data, error } = await supabase.rpc("match_michelle_knowledge", rpcArgs as never);
    if (error) {
      console.error("match_michelle_knowledge error", error);
      return [] as KnowledgeMatch[];
    }

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
