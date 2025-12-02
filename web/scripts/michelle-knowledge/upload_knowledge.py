#!/usr/bin/env python3
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI
from supabase import Client, create_client


env_local = Path.cwd() / ".env.local"
if env_local.exists():
    load_dotenv(env_local, override=True)
load_dotenv()

KNOWLEDGE_DIR = Path.cwd() / "md" / "michelle"
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200
STEP = CHUNK_SIZE - CHUNK_OVERLAP
BATCH_SIZE = 10
EMBEDDING_MODEL = "text-embedding-3-small"


def require_env(key: str) -> str:
    value = os.getenv(key)
    if not value:
        raise ValueError(f"Missing required environment variable: {key}")
    return value


OPENAI_API_KEY = require_env("OPENAI_API_KEY")
SUPABASE_URL = require_env("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = require_env("SUPABASE_SERVICE_ROLE_KEY")

openai_client = OpenAI(api_key=OPENAI_API_KEY)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def chunk_text(text: str):
    normalized = text.replace("\r\n", "\n").strip()
    if not normalized:
        return []

    chunks = []
    start = 0
    index = 0

    while start < len(normalized):
        end = min(start + CHUNK_SIZE, len(normalized))
        segment = normalized[start:end].strip()
        if segment:
            chunks.append({"content": segment, "index": index})
            index += 1
        if end == len(normalized):
            break
        start += STEP

    return chunks


def list_markdown_files(directory: Path):
    return [path for path in directory.rglob("*.md") if path.is_file()]


def embed_text(text: str):
    response = openai_client.embeddings.create(model=EMBEDDING_MODEL, input=text)
    return response.data[0].embedding


def process_file(file_path: Path):
    relative_source = str(file_path.relative_to(KNOWLEDGE_DIR))
    print(f"\n📄 Processing {relative_source}")

    chunks = chunk_text(file_path.read_text(encoding="utf-8"))
    if not chunks:
        print("  ⚠️  No content found, skipping.")
        return

    try:
        supabase.from_("michelle_knowledge").delete().eq("metadata->>source", relative_source).execute()
    except Exception as exc:
        print(f"  ⚠️  Failed to delete old records: {exc}")

    for i in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[i : i + BATCH_SIZE]
        embeddings = [embed_text(chunk["content"]) for chunk in batch]

        rows = []
        for idx, chunk in enumerate(batch):
            rows.append(
                {
                    "content": chunk["content"],
                    "embedding": embeddings[idx],
                    "metadata": {
                        "source": relative_source,
                        "chunk_index": chunk["index"],
                    },
                }
            )

        supabase.from_("michelle_knowledge").insert(rows).execute()

        last_chunk = batch[-1]["index"]
        print(
            f"  ✅ Inserted chunks {batch[0]['index']}-{last_chunk} ({min(i + BATCH_SIZE, len(chunks))}/{len(chunks)})"
        )


def main():
    if not KNOWLEDGE_DIR.exists():
        raise FileNotFoundError(f"Knowledge directory not found: {KNOWLEDGE_DIR}")

    files = list_markdown_files(KNOWLEDGE_DIR)
    if not files:
        print("No markdown files found in md/michelle.")
        return

    print(f"\n🚀 Starting Michelle knowledge upload ({len(files)} files)...")
    for file_path in files:
        try:
            process_file(file_path)
        except Exception as exc:
            print(f"❌ Error processing {file_path}: {exc}")
            continue

    print("\n✨ Michelle knowledge base upload complete.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"\n❌ Failed to seed Michelle knowledge base: {exc}")
        sys.exit(1)
