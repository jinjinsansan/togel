import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { generateDiagnosisResult } from "@/lib/matching/engine";
import { Answer, BigFiveScores } from "@/types/diagnosis";
import { personalityTypes } from "@/lib/personality";
import { generatePersonalityNarrative } from "@/lib/personality/narrative";

export const GET = async (request: Request, props: { params: Promise<{ id: string }> }) => {
  const params = await props.params;
  const supabaseAdmin = createSupabaseAdminClient();

  // ログインユーザーを特定（本人なら非公開でも閲覧可）
  const cookieStore = await cookies();
  const supabaseAuth = createSupabaseRouteClient(cookieStore);
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

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

    // 非公開プロフィールは本人のみ閲覧可。サーバー側で強制する。
    if (profile.is_public === false) {
      let isOwner = false;
      if (user) {
        const { data: ownRow } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("auth_user_id", user.id)
          .maybeSingle();
        isOwner = ownRow?.id === params.id || user.id === params.id;
      }
      if (!isOwner) {
        return NextResponse.json({ message: "This profile is private" }, { status: 403 });
      }
    }

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
