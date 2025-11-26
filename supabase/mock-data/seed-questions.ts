import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

import { questions } from "../../web/src/data/questions";

const loadEnv = () => {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf8");
  content.split(/\r?\n/).forEach((line) => {
    if (!line || line.startsWith("#")) return;
    const [key, ...rest] = line.split("=");
    if (!key) return;
    const value = rest.join("=").trim();
    if (key && value && !process.env[key]) {
      process.env[key] = value;
    }
  });
};

loadEnv();

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Supabase環境変数が設定されていません");
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
);

const seed = async () => {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY が設定されていません");
  }

  const payload = questions.map((question) => ({
    id: question.id,
    diagnosis_type: question.diagnosisType,
    question_number: question.number,
    question_text: question.text,
    options: question.options,
  }));

  const { error } = await supabase.from("questions").upsert(payload, {
    onConflict: "id",
  });

  if (error) {
    console.error(error);
    process.exit(1);
  }

  console.log(`Seeded ${payload.length} questions.`);
};

seed();
