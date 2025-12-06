import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));

const envPath = resolve(__dirname, "../../.env.local");
config({ path: envPath });

process.env.NODE_ENV ||= "development";
process.env.NEXT_PUBLIC_MICHELLE_AI_ENABLED ||= "true";
process.env.NEXT_PUBLIC_SUPABASE_URL ||= process.env.SUPABASE_URL ?? "";

const getEnv = (key: string) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

const supabase = createClient(getEnv("NEXT_PUBLIC_SUPABASE_URL"), getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const QUESTIONS = [
  "恐怖を感じる時はどうすればいい？",
];

type KnowledgeMatch = {
  id: string;
  content: string;
  metadata: Record<string, unknown> | null;
  similarity: number;
};

type MichelleDeps = {
  getMichelleAssistantId: typeof import("@/lib/michelle/openai").getMichelleAssistantId;
  getMichelleOpenAIClient: typeof import("@/lib/michelle/openai").getMichelleOpenAIClient;
  supabase: SupabaseClient;
};

type BaselineResult = {
  question: string;
  answer: string;
  matches: KnowledgeMatch[];
};

const embedText = async (deps: MichelleDeps, text: string) => {
  const normalized = text.trim();
  if (!normalized) {
    console.log("⚠️ Empty text, skipping embedding");
    return [] as number[];
  }

  console.log(`🔄 Generating embedding for: "${normalized.slice(0, 50)}..."`);
  const openai = deps.getMichelleOpenAIClient();
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: normalized,
  });

  const embedding = response.data[0]?.embedding ?? ([] as number[]);
  console.log(`✅ Embedding generated: ${embedding.length} dimensions`);
  return embedding;
};

const retrieveMatches = async (deps: MichelleDeps, question: string) => {
  const embedding = await embedText(deps, question);
  if (!embedding.length) {
    return [] as KnowledgeMatch[];
  }

  console.log(`🔍 Calling RPC with embedding[0..2]: [${embedding.slice(0, 3).join(", ")}], threshold: 0.0`);
  
  const { data, error } = await deps.supabase.rpc("match_michelle_knowledge", {
    query_embedding: embedding,
    match_count: 8,
    similarity_threshold: 0.0,
  });

  if (error) {
    console.error("Supabase RPC error details:", JSON.stringify(error, null, 2));
    throw new Error(error.message || "match_michelle_knowledge failed");
  }

  console.log(`📊 RPC returned ${data?.length ?? 0} results`);
  return (data ?? []) as KnowledgeMatch[];
};

const runBaselineQuery = async (deps: MichelleDeps, question: string): Promise<BaselineResult> => {
  const matches = await retrieveMatches(deps, question);
  const knowledgeContext = matches
    .map((match, index) => `[参考知識${index + 1} | 類似度 ${match.similarity.toFixed(3)}]\n${match.content}`)
    .join("\n\n");

  const finalMessage = matches.length
    ? `【ユーザーメッセージ】\n${question}\n\n---\n内部参考情報（ユーザーには見せないこと）：\n以下のミシェル心理学知識を参考にして回答を構築してください。\n${knowledgeContext}`
    : question;

  const openai = deps.getMichelleOpenAIClient();
  const assistantId = deps.getMichelleAssistantId();
  const betaThreads = openai.beta?.threads;

  if (!betaThreads) {
    throw new Error("OpenAI Assistants beta API is not available");
  }

  const thread = await betaThreads.create();
  await betaThreads.messages.create(thread.id, { role: "user", content: finalMessage });

  const run = await betaThreads.runs.createAndPoll(thread.id, { assistant_id: assistantId });
  if (run.status !== "completed") {
    throw new Error(`Assistant run did not complete (status: ${run.status})`);
  }

  const messages = await betaThreads.messages.list(thread.id, { order: "desc", limit: 5 });
  const assistantMessage = messages.data.find((message) => message.role === "assistant");

  if (!assistantMessage) {
    throw new Error("No assistant response found in thread");
  }

  const answer = assistantMessage.content
    .map((part) => (part.type === "text" ? part.text.value : ""))
    .join("\n")
    .trim();

  return {
    question,
    answer,
    matches,
  };
};

const main = async (deps: MichelleDeps) => {
  const results: BaselineResult[] = [];

  for (const question of QUESTIONS) {
    console.log(`\n============================`);
    console.log(`📝 質問: ${question}`);

    try {
      const result = await runBaselineQuery(deps, question);
      results.push(result);

      console.log(`🔎 ヒット件数: ${result.matches.length}`);
      result.matches.forEach((match, index) => {
        const preview = match.content.replace(/\s+/g, " ").slice(0, 120);
        console.log(`  - [${index + 1}] 類似度 ${match.similarity.toFixed(3)} | ${preview}${preview.length === 120 ? "…" : ""}`);
      });
      console.log(`\n💬 応答:\n${result.answer}\n`);
    } catch (error) {
      console.error(`❌ エラー: ${(error as Error).message}`);
    }
  }

  console.log(`\n============================`);
  console.log(`✅ ベースライン測定完了 (合計 ${results.length} 件)`);
};

import("@/lib/michelle/openai")
  .then(async (openaiModule) => {
    const deps: MichelleDeps = {
      getMichelleAssistantId: openaiModule.getMichelleAssistantId,
      getMichelleOpenAIClient: openaiModule.getMichelleOpenAIClient,
      supabase,
    };

    await main(deps);
  })
  .catch((error) => {
    console.error("Baseline measurement failed", error);
    process.exit(1);
  });
