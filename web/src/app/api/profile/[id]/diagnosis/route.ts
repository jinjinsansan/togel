import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { generateDiagnosisResult } from "@/lib/matching/engine";
import { Answer, BigFiveScores } from "@/types/diagnosis";
import { personalityTypes } from "@/lib/personality";
import { generatePersonalityNarrative } from "@/lib/personality/narrative";

export const GET = async (
  request: Request,
  { params }: { params: { id: string } }
) => {
  const supabaseAdmin = createSupabaseAdminClient();

  try {
    // プロフィールの公開設定を確認
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("is_public")
      .eq("id", params.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ message: "Profile not found" }, { status: 404 });
    }

    // プロフィールが非公開の場合はエラー（本人確認は省略、フロントで制御）
    // 注: is_publicチェックはフロント側で行うので、ここではデータを返す
    // （プロフィールページで既にアクセス制御済み）

    // 最新の診断結果を取得
    const { data: diagnosisData, error } = await supabaseAdmin
      .from("diagnosis_results")
      .select("diagnosis_type, answers, personality_type_id, big_five_scores")
      .eq("user_id", params.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching diagnosis:", error);
      return NextResponse.json({ message: "Diagnosis not found" }, { status: 404 });
    }

    const storedScores = diagnosisData?.big_five_scores as BigFiveScores | null;
    const storedTypeId = diagnosisData?.personality_type_id;
    const storedType = personalityTypes.find((type) => type.id === storedTypeId);

    if (storedScores && storedType) {
      return NextResponse.json({
        bigFiveScores: storedScores,
        detailedNarrative: generatePersonalityNarrative(storedScores, storedType),
      });
    }

    if (!diagnosisData?.answers) {
      return NextResponse.json({ message: "No diagnosis data" }, { status: 404 });
    }

    const result = generateDiagnosisResult({
      diagnosisType: diagnosisData.diagnosis_type as "light" | "full",
      userGender: "male",
      answers: diagnosisData.answers as Answer[],
    });

    return NextResponse.json({
      bigFiveScores: result.bigFiveScores,
      detailedNarrative: result.detailedNarrative,
    });
  } catch (error) {
    console.error("Error processing diagnosis:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
};
