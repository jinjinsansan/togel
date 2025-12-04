import fs from "node:fs/promises";
import path from "node:path";
import { setDefaultResultOrder } from "node:dns";

import { config as loadEnv } from "dotenv";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

import type { MichelleAttractionDatabase } from "../../src/types/michelle-attraction-db";
import { chunkText } from "../michelle-knowledge/chunk";

setDefaultResultOrder("ipv4first");

const envLocalPath = path.resolve(process.cwd(), ".env.local");
loadEnv({ path: envLocalPath, override: true });
loadEnv();

const KNOWLEDGE_DIR = path.resolve(process.cwd(), "md", "michelle-attraction");
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;
const BATCH_SIZE = 10;
const EMBEDDING_MODEL = "text-embedding-3-small";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Supabase credentials (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are required.");
}

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is required to generate embeddings.");
}

type MichelleAttractionKnowledgeInsert =
  MichelleAttractionDatabase["public"]["Tables"]["michelle_attraction_knowledge"]["Insert"];

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function sanitizeUnicode(value: string): string {
  return Array.from(value)
    .filter((char) => {
      const codePoint = char.codePointAt(0);
      return typeof codePoint === "number" && (codePoint < 0xd800 || codePoint > 0xdfff);
    })
    .join("");
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
        return [fullPath];
      }
      return [];
    }),
  );
  return files.flat();
}

async function embedText(input: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input,
  });
  return response.data[0].embedding;
}

async function processFile(filePath: string) {
  const relativeSource = sanitizeUnicode(path.relative(KNOWLEDGE_DIR, filePath) || path.basename(filePath));
  console.log(`\n📄 Processing ${relativeSource}`);

  const content = await fs.readFile(filePath, "utf-8");
  const chunks = chunkText(content, { chunkSize: CHUNK_SIZE, overlap: CHUNK_OVERLAP });

  if (chunks.length === 0) {
    console.log("  ⚠️  No content found, skipping.");
    return;
  }

  const { error: deleteError } = await supabase
    .from("michelle_attraction_knowledge")
    .delete()
    .eq("metadata->>source", relativeSource);
  if (deleteError) {
    throw deleteError;
  }

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const slice = chunks.slice(i, i + BATCH_SIZE);
    const embeddings: number[][] = [];

    for (const chunk of slice) {
      const embedding = await embedText(chunk.content);
      embeddings.push(embedding);
    }

    const rows: MichelleAttractionKnowledgeInsert[] = slice.map((chunk, idx) => ({
      content: sanitizeUnicode(chunk.content),
      embedding: embeddings[idx],
      metadata: {
        source: relativeSource,
        chunk_index: chunk.index,
      },
    }));

    const { error } = await supabase.from("michelle_attraction_knowledge").insert(rows);
    if (error) {
      throw error;
    }

    const lastChunk = slice[slice.length - 1];
    console.log(
      `  ✅ Inserted chunks ${slice[0].index}-${lastChunk.index} (${Math.min(i + BATCH_SIZE, chunks.length)}/${chunks.length})`,
    );
  }
}

async function main() {
  try {
    await fs.access(KNOWLEDGE_DIR);
  } catch {
    throw new Error(`Knowledge directory not found: ${KNOWLEDGE_DIR}`);
  }

  const files = await listMarkdownFiles(KNOWLEDGE_DIR);
  if (files.length === 0) {
    console.log("No markdown files found in md/michelle-attraction directory.");
    return;
  }

  for (const file of files) {
    await processFile(file);
  }

  console.log("\n✨ Michelle attraction knowledge base upload complete.");
}

main().catch((error) => {
  console.error("\n❌ Failed to seed Michelle attraction knowledge base");
  console.error(error);
  process.exit(1);
});
