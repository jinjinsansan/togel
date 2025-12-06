import { NextResponse } from "next/server";
import { retrieveKnowledgeMatches } from "@/lib/michelle/rag";

export const dynamic = 'force-dynamic';

const TEST_QUESTIONS = [
  "恐怖を感じる時はどうすればいい？",
  "怒りの下にある感情は何ですか？",
  "アラジンのランプテストとは何ですか？",
];

type QuickResult = {
  question: string;
  matchCount: number;
  topMatches: Array<{
    similarity: number;
    contentPreview: string;
    source: string | null;
  }>;
};

export async function GET() {
  const results: QuickResult[] = [];

  try {
    for (const question of TEST_QUESTIONS) {
      console.log(`[Quick Baseline] Processing: ${question}`);

      // Retrieve RAG knowledge matches (閾値 0.45)
      const knowledgeMatches = await retrieveKnowledgeMatches(question, {
        matchCount: 8,
        similarityThreshold: 0.45,
      });

      console.log(`[Quick Baseline] Found ${knowledgeMatches.length} matches`);

      results.push({
        question,
        matchCount: knowledgeMatches.length,
        topMatches: knowledgeMatches.slice(0, 3).map((m) => ({
          similarity: m.similarity,
          contentPreview: m.content.replace(/\s+/g, " ").slice(0, 150) + "...",
          source: m.metadata && typeof m.metadata === "object" && "source" in m.metadata
            ? String(m.metadata.source)
            : null,
        })),
      });
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      config: {
        similarityThreshold: 0.45,
        matchCount: 8,
        questionsCount: TEST_QUESTIONS.length,
      },
      results,
      summary: {
        totalQuestions: TEST_QUESTIONS.length,
        avgMatchesPerQuestion: (results.reduce((sum, r) => sum + r.matchCount, 0) / results.length).toFixed(2),
        questionsWithMatches: results.filter((r) => r.matchCount > 0).length,
        questionsWithNoMatches: results.filter((r) => r.matchCount === 0).length,
        totalMatches: results.reduce((sum, r) => sum + r.matchCount, 0),
      },
    });
  } catch (error) {
    console.error("[Quick Baseline] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        errorDetails: error instanceof Error ? error.stack : undefined,
        results,
      },
      { status: 500 },
    );
  }
}
