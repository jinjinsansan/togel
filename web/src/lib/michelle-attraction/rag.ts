import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getMichelleAttractionOpenAIClient } from "@/lib/michelle-attraction/openai";
import type { Json } from "@/types/michelle-db";

const EMBEDDING_MODEL = "text-embedding-3-small";
const DEFAULT_THRESHOLD = 0.65;
const FALLBACK_THRESHOLDS = [0.58, 0.5, 0.45, 0.35];

export type AttractionKnowledgeMatch = {
  id: string;
  content: string;
  metadata: Json | null;
  similarity: number;
};

export async function embedAttractionText(text: string) {
  const normalized = text.trim();
  if (!normalized) {
    return [] as number[];
  }

  const openai = getMichelleAttractionOpenAIClient();
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

export async function retrieveAttractionKnowledgeMatches(
  text: string,
  options: RetrieveOptions = {},
): Promise<AttractionKnowledgeMatch[]> {
  const embedding = await embedAttractionText(text);
  if (!embedding.length) {
    return [];
  }

  const supabase = createSupabaseAdminClient();

  const attempt = async (threshold: number) => {
    const rpcArgs = {
      query_embedding: embedding,
      match_count: options.matchCount ?? 8,
      similarity_threshold: threshold,
    };

    const { data, error } = await supabase.rpc("match_michelle_attraction_knowledge", rpcArgs as never);
    if (error) {
      console.error("match_michelle_attraction_knowledge error", error);
      return [] as AttractionKnowledgeMatch[];
    }

    return (data ?? []) as AttractionKnowledgeMatch[];
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
