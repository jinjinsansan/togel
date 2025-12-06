import { NextResponse } from "next/server";
import { retrieveKnowledgeMatches } from "@/lib/michelle/rag";
import { getMichelleAssistantId, getMichelleOpenAIClient } from "@/lib/michelle/openai";

const BASELINE_QUESTIONS = [
  "恐怖を感じる時はどうすればいい？",
  "怒りの下にある感情は何ですか？",
  "アラジンのランプテストとは何ですか？",
  "五大ネガティブとは何ですか？",
  "ピールダウンの方法を教えてください",
];

type BaselineResult = {
  question: string;
  matchCount: number;
  matches: Array<{
    similarity: number;
    contentPreview: string;
    metadata: unknown;
  }>;
  answer: string;
};

export async function GET() {
  const results: BaselineResult[] = [];

  try {
    const openai = getMichelleOpenAIClient();
    const assistantId = getMichelleAssistantId();
    const betaThreads = openai.beta?.threads;

    if (!betaThreads) {
      return NextResponse.json({ error: "OpenAI Assistants API is not available" }, { status: 500 });
    }

    for (const question of BASELINE_QUESTIONS) {
      console.log(`[Baseline] Processing: ${question}`);

      // Retrieve RAG knowledge matches
      const knowledgeMatches = await retrieveKnowledgeMatches(question, {
        matchCount: 8,
        similarityThreshold: 0.45,
      });

      console.log(`[Baseline] Found ${knowledgeMatches.length} matches`);

      // Build knowledge context
      const knowledgeContext = knowledgeMatches
        .map((match, index) => `[参考知識${index + 1} | 類似度 ${match.similarity.toFixed(3)}]\n${match.content}`)
        .join("\n\n");

      const finalMessage = knowledgeMatches.length
        ? `【ユーザーメッセージ】\n${question}\n\n---\n内部参考情報（ユーザーには見せないこと）：\n以下のミシェル心理学知識を参考にして回答を構築してください。\n${knowledgeContext}`
        : question;

      // Create thread and get AI response
      const thread = await betaThreads.create();
      await betaThreads.messages.create(thread.id, { role: "user", content: finalMessage });

      const run = await betaThreads.runs.createAndPoll(thread.id, { assistant_id: assistantId });

      if (run.status !== "completed") {
        console.error(`[Baseline] Run did not complete: ${run.status}`);
        results.push({
          question,
          matchCount: knowledgeMatches.length,
          matches: knowledgeMatches.map((m) => ({
            similarity: m.similarity,
            contentPreview: m.content.slice(0, 100),
            metadata: m.metadata,
          })),
          answer: `[エラー: Assistant run status = ${run.status}]`,
        });
        continue;
      }

      const messages = await betaThreads.messages.list(thread.id, { order: "desc", limit: 5 });
      const assistantMessage = messages.data.find((m) => m.role === "assistant");

      const answer = assistantMessage
        ? assistantMessage.content
            .map((part) => (part.type === "text" ? part.text.value : ""))
            .join("\n")
            .trim()
        : "[エラー: 応答が見つかりませんでした]";

      results.push({
        question,
        matchCount: knowledgeMatches.length,
        matches: knowledgeMatches.map((m) => ({
          similarity: m.similarity,
          contentPreview: m.content.slice(0, 100),
          metadata: m.metadata,
        })),
        answer,
      });

      console.log(`[Baseline] Completed: ${question} (${knowledgeMatches.length} matches)`);
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
      summary: {
        totalQuestions: BASELINE_QUESTIONS.length,
        avgMatchesPerQuestion: results.reduce((sum, r) => sum + r.matchCount, 0) / results.length,
        questionsWithMatches: results.filter((r) => r.matchCount > 0).length,
        questionsWithNoMatches: results.filter((r) => r.matchCount === 0).length,
      },
    });
  } catch (error) {
    console.error("[Baseline] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        results,
      },
      { status: 500 },
    );
  }
}
