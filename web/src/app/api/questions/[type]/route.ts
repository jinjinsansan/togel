import { NextRequest, NextResponse } from "next/server";

import { getQuestionsByType } from "@/data/questions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { DiagnosisQuestion } from "@/types/diagnosis";

type Params = Promise<{
  type: string;
}>;

export const GET = async (_request: NextRequest, { params }: { params: Params }) => {
  const resolvedParams = await params;
  const typeParam =
    resolvedParams.type === "full"
      ? "full"
      : resolvedParams.type === "light"
        ? "light"
        : null;
  if (!typeParam) {
    return NextResponse.json({ message: "invalid diagnosis type" }, { status: 400 });
  }
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("questions")
    .select("id, question_text, options, question_number, diagnosis_type, question_number")
    .eq("diagnosis_type", typeParam)
    .order("question_number", { ascending: true });

  if (error) {
    console.error("Failed to fetch questions from Supabase", error);
  }

  if (!error && data && data.length > 0) {
    const mapped: DiagnosisQuestion[] = data.map((question) => ({
      id: question.id,
      diagnosisType: typeParam,
      number: question.question_number,
      text: question.question_text,
      scale: (question.options?.length ?? 0) === 4 ? "single" : "likert",
      options: question.options ?? [],
      trait: "sociability",
    }));
    return NextResponse.json({ questions: mapped });
  }

  const fallback = getQuestionsByType(typeParam);
  return NextResponse.json({ questions: fallback, fallback: true });
};
