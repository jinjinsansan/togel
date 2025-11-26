import { createClient } from "@supabase/supabase-js";

import { env } from "../../web/src/lib/env";
import { questions } from "../../web/src/data/questions";

const supabase = createClient(env.supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", {
  auth: { persistSession: false, autoRefreshToken: false },
});

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
