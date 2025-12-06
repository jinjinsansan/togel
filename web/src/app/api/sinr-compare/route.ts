import { NextResponse } from "next/server";
import { retrieveKnowledgeMatches } from "@/lib/michelle/rag";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getMichelleOpenAIClient } from "@/lib/michelle/openai";

export const dynamic = 'force-dynamic';

const EMBEDDING_MODEL = "text-embedding-3-small";

type ComparisonResult = {
  question: string;
  original: {
    matches: number;
    topSimilarity: number | null;
    top3Similarities: number[];
  };
  sinr: {
    matches: number;
    topSimilarity: number | null;
    top3Similarities: number[];
  };
  improvement: {
    matchesDiff: number;
    similarityDiff: number | null;
  };
};

async function embedText(text: string): Promise<number[]> {
  const openai = getMichelleOpenAIClient();
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.trim(),
  });
  return response.data[0]?.embedding ?? [];
}

export async function POST(request: Request) {
  try {
    const { question } = await request.json();
    
    if (!question) {
      return NextResponse.json({ error: "question required" }, { status: 400 });
    }

    console.log(`[SINR Compare] Testing: "${question}"`);

    // 1. 既存RAG検索
    console.log(`[SINR Compare] Testing original RAG...`);
    const originalMatches = await retrieveKnowledgeMatches(question, {
      matchCount: 8,
      similarityThreshold: 0.35, // 最低閾値
    });

    // 2. SINR検索
    console.log(`[SINR Compare] Testing SINR...`);
    const embedding = await embedText(question);
    
    const supabase = createSupabaseAdminClient();
    const { data: sinrData, error: sinrError } = await supabase.rpc(
      "match_michelle_knowledge_sinr",
      {
        query_embedding: embedding,
        match_count: 8,
        similarity_threshold: 0.35,
      }
    );

    if (sinrError) {
      console.error("[SINR Compare] SINR search error:", sinrError);
      throw sinrError;
    }

    const sinrMatches = (sinrData ?? []) as Array<{
      parent_id: string;
      parent_content: string;
      parent_metadata: unknown;
      parent_source: string;
      child_similarity: number;
    }>;

    // 3. 結果比較
    const originalTop3 = originalMatches.slice(0, 3).map(m => m.similarity);
    const sinrTop3 = sinrMatches.slice(0, 3).map(m => m.child_similarity);

    const result: ComparisonResult = {
      question,
      original: {
        matches: originalMatches.length,
        topSimilarity: originalMatches.length > 0 ? originalMatches[0].similarity : null,
        top3Similarities: originalTop3,
      },
      sinr: {
        matches: sinrMatches.length,
        topSimilarity: sinrMatches.length > 0 ? sinrMatches[0].child_similarity : null,
        top3Similarities: sinrTop3,
      },
      improvement: {
        matchesDiff: sinrMatches.length - originalMatches.length,
        similarityDiff: 
          sinrMatches.length > 0 && originalMatches.length > 0
            ? sinrMatches[0].child_similarity - originalMatches[0].similarity
            : null,
      },
    };

    console.log(`[SINR Compare] Results:`, result);

    return NextResponse.json({
      success: true,
      result,
      details: {
        originalSamples: originalMatches.slice(0, 3).map(m => ({
          similarity: m.similarity,
          contentPreview: m.content.slice(0, 100),
        })),
        sinrSamples: sinrMatches.slice(0, 3).map(m => ({
          similarity: m.child_similarity,
          parentContentPreview: m.parent_content.slice(0, 100),
        })),
      },
    });

  } catch (error) {
    console.error("[SINR Compare] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
