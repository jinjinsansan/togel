import fs from "node:fs/promises";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const envLocalPath = path.resolve(process.cwd(), ".env.local");
loadEnv({ path: envLocalPath, override: true });
loadEnv();

const KNOWLEDGE_DIR = path.resolve(process.cwd(), "md", "michelle");
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;
const BATCH_SIZE = 10;
const EMBEDDING_MODEL = "text-embedding-3-small";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is required to generate embeddings.");
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Supabase credentials required");
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function chunkText(text, chunkSize = 1000, overlap = 200) {
  if (chunkSize <= overlap) {
    throw new Error("chunkSize must be greater than overlap");
  }

  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return [];
  }

  const step = chunkSize - overlap;
  const chunks = [];
  let start = 0;
  let index = 0;

  while (start < normalized.length) {
    const end = Math.min(start + chunkSize, normalized.length);
    const slice = normalized.slice(start, end).trim();
    if (slice) {
      chunks.push({ content: slice, index });
      index += 1;
    }
    if (end === normalized.length) {
      break;
    }
    start += step;
  }

  return chunks;
}

async function listMarkdownFiles(dir) {
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

async function embedText(input) {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input,
  });
  return response.data[0].embedding;
}

async function processFile(filePath) {
  const relativeSource = path.relative(KNOWLEDGE_DIR, filePath) || path.basename(filePath);
  console.log(`\n📄 Processing ${relativeSource}`);

  const content = await fs.readFile(filePath, "utf-8");
  const chunks = chunkText(content, CHUNK_SIZE, CHUNK_OVERLAP);

  if (chunks.length === 0) {
    console.log("  ⚠️  No content found, skipping.");
    return;
  }

  const { error: deleteError } = await supabase
    .from("michelle_knowledge")
    .delete()
    .eq("metadata->>source", relativeSource);
  if (deleteError) {
    throw deleteError;
  }

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const slice = chunks.slice(i, i + BATCH_SIZE);
    const embeddings = [];
    for (const chunk of slice) {
      const embedding = await embedText(chunk.content);
      embeddings.push(embedding);
    }

    const rows = slice.map((chunk, idx) => ({
      content: chunk.content,
      embedding: embeddings[idx],
      metadata: {
        source: relativeSource,
        chunk_index: chunk.index,
      },
    }));

    const { error } = await supabase.from("michelle_knowledge").insert(rows);
    if (error) {
      throw error;
    }

    console.log(
      `  ✅ Inserted chunks ${slice[0].index}-${slice[slice.length - 1].index} (${Math.min(
        i + BATCH_SIZE,
        chunks.length,
      )}/${chunks.length})`,
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
    console.log("No markdown files found in md/michelle directory.");
    return;
  }

  console.log(`\n🚀 Starting Michelle knowledge base upload (${files.length} files)...\n`);

  for (const file of files) {
    await processFile(file);
  }

  console.log("\n✨ Michelle knowledge base upload complete.");
}

main().catch((error) => {
  console.error("\n❌ Failed to seed Michelle knowledge base");
  console.error(error);
  process.exit(1);
});
