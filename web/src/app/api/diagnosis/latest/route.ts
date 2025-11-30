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

    // 1. まずキャッシュテーブルを確認（高速化）
    // キャッシュがあれば重いマッチング計算をスキップできる
    const { data: cachedData } = await supabaseAdmin
      .from("matching_cache")
      .select("matched_users, diagnosis_result_id")
      .eq("user_id", userData.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 最新の診断結果履歴を取得
    // キャッシュがあっても、診断自体のデータ（回答など）が必要なため取得する
    // ただしキャッシュとIDが一致しているか確認することで、キャッシュが古い場合を排除できる
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

    const inputData = {
      diagnosisType: latestDiagnosis.diagnosis_type as "light" | "full",
      userGender: "male" as "male" | "female",
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

    // 自己診断結果の生成（計算コストは低いので毎回実行でOK）
    const diagnosisResult = generateDiagnosisResult(inputData);

    // マッチング結果の取得
    let results;
    let mismatchResults;

    // キャッシュが有効（存在し、かつ最新の診断結果に対応している）なら使用
    if (cachedData && cachedData.diagnosis_result_id === latestDiagnosis.id && cachedData.matched_users) {
      // console.log("Using cached matching results");
      results = cachedData.matched_users;
      // ミスマッチ結果はキャッシュしていない場合が多いので、必要な場合は計算するか、キャッシュに追加が必要
      // ここではミスマッチ結果も毎回計算コストが高いので、本来はキャッシュすべきだが、
      // 現状のテーブル構造が不明なため、matched_usersがあれば計算をスキップする方針にする。
      // もしミスマッチもキャッシュするならカラム追加が必要。
      // 一旦、ミスマッチは「キャッシュがない」場合のみ計算、あるいは軽量なら毎回計算。
      // matching.tsを見る限り、mismatchもloadRealProfilesするので重い。
      // キャッシュ構造に mismatch_results があるか不明だが、submit APIを見る限り matched_users しか入れてない。
      // なので、mismatchだけは計算せざるを得ないが、最も重い「ベストマッチ」はキャッシュで救える。
      
      // 妥協案: mismatchだけ計算する
      mismatchResults = await generateMismatchingResults(inputData);
    } else {
      // キャッシュがない、または古い場合は再計算
      // console.log("Cache miss or stale, recalculating...");
      results = await generateMatchingResults(inputData);
      mismatchResults = await generateMismatchingResults(inputData);

      // 新しい結果をキャッシュに保存（次回以降のために）
      // エラーハンドリングは緩くして、レスポンスを優先
      /* await supabaseAdmin.from("matching_cache").insert({
        user_id: userData.id,
        diagnosis_result_id: latestDiagnosis.id,
        matched_users: results,
      }).catch(err => console.warn("Failed to update cache", err)); */
      // ↑ submit時に保存しているはずなので、ここでは無理に保存しない（重複やデッドロック回避）
    }

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
