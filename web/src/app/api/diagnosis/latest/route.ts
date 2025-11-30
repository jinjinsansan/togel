import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { generateDiagnosisResult, generateMatchingResults, generateMismatchingResults } from "@/lib/matching/engine";
import { Answer } from "@/types/diagnosis";

export const GET = async () => {
  const cookieStore = cookies();
  const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore });
  const { data: { session } } = await supabaseAuth.auth.getSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = createSupabaseAdminClient();

  try {
    // まず public.users から auth_user_id で検索して user.id を取得
    const { data: initialUserData, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("auth_user_id", session.user.id)
      .maybeSingle();

    let userData = initialUserData;

    if (userError || !userData) {
      // auth_user_id で見つからない場合、id で直接検索（後方互換性）
      const { data: fallbackUser } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("id", session.user.id)
        .maybeSingle();
      
      if (!fallbackUser) {
        return NextResponse.json({ message: "User not found" }, { status: 404 });
      }
      
      // auth_user_id を修正
      await supabaseAdmin
        .from("users")
        .update({ auth_user_id: session.user.id })
        .eq("id", session.user.id);
      
      userData = fallbackUser;
    }

    // 最新の診断結果を取得（public.users.id を使用）
    const { data: latestDiagnosis, error } = await supabaseAdmin
      .from("diagnosis_results")
      .select("*")
      .eq("user_id", userData.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !latestDiagnosis) {
      return NextResponse.json({ message: "No diagnosis found" }, { status: 404 });
    }

    // マッチング結果を再計算（またはキャッシュから取得）
    // ここではエンジンのロジックを再利用して計算する（キャッシュ取得より確実）
    // 必要なデータ形式に整形
    const inputData = {
      diagnosisType: latestDiagnosis.diagnosis_type as "light" | "full",
      userGender: "male" as "male" | "female", // TODO: profilesから取得すべきだが、一旦male/femaleどちらでも動くロジックならOK。
      // しかしマッチングには性別が必要。profilesから取る。
      answers: latestDiagnosis.answers as Answer[],
    };

    // プロフィールから性別を取得
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("gender")
      .eq("id", session.user.id)
      .single();
    
    if (profile?.gender) {
      inputData.userGender = profile.gender as "male" | "female";
    }

    // 結果生成
    const diagnosisResult = generateDiagnosisResult(inputData);
    const results = await generateMatchingResults(inputData);
    const mismatchResults = await generateMismatchingResults(inputData);

    return NextResponse.json({
      results,
      mismatchResults,
      diagnosis: diagnosisResult,
    });

  } catch (error) {
    console.error("Error fetching diagnosis:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
};
