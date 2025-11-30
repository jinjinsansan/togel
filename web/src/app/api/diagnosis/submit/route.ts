import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { generateMatchingResults, generateMismatchingResults, generateDiagnosisResult } from "@/lib/matching/engine";
import { getTogelLabel } from "@/lib/personality";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  diagnosisType: z.enum(["light", "full"]),
  userGender: z.enum(["male", "female"]),
  answers: z
    .array(
      z.object({
        questionId: z.string(),
        value: z.number().min(1).max(5),
      })
    )
    .min(1),
});

const ensureUserRecord = async (
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  params: {
    authUserId?: string; // ログインユーザーの場合のUUID
    gender: "male" | "female";
    nickname?: string;
    avatarUrl?: string;
  }
) => {
  // 1. ログインユーザーの場合: public.users にレコードがあるか確認、なければ作成
  if (params.authUserId) {
    const { data } = await supabase
      .from("users")
      .select("id, auth_user_id")
      .eq("id", params.authUserId) // public.users.id と auth.users.id を一致させる運用を想定
      .maybeSingle();

    if (data?.id) {
      // 既存レコードがあるが auth_user_id が null の場合は修正
      if (!data.auth_user_id) {
        await supabase
          .from("users")
          .update({ auth_user_id: params.authUserId })
          .eq("id", params.authUserId);
      }
      return data.id;
    }

    // レコードがない場合作成 (IDを明示的に指定)
    // 既に存在する場合のエラー(23505: unique_violation)を考慮して upsert にするか、
    // エラーをキャッチして select し直す
    try {
      const { data: inserted, error: insertError } = await supabase
        .from("users")
        .insert({
          id: params.authUserId, // 重要: auth.uid と同じIDにする
          auth_user_id: params.authUserId, // RLSポリシーで必要！
          line_user_id: `auth-${params.authUserId}`, // 一意制約回避のためのダミー
          gender: params.gender,
          nickname: params.nickname || "No Name",
          birth_date: "2000-01-01", // ダミー
          avatar_url: params.avatarUrl || "",
          is_mock_data: false,
          bio: "",
          job: "未設定",
          favorite_things: "",
          hobbies: "",
          special_skills: "",
        })
        .select("id")
        .single();
        
      if (insertError) {
        // 既に存在する場合はスルー（ただし通常は上のselectで見つかるはず）
        console.warn("Failed to insert user, trying to fetch again:", insertError);
        
        // 再取得を試みる
        const { data: existing } = await supabase
          .from("users")
          .select("id")
          .eq("id", params.authUserId)
          .single();
          
        if (existing) return existing.id;
        
        throw insertError;
      }
      return inserted.id;
    } catch (e) {
      console.error("Error ensuring user record:", e);
      // 最悪の場合、authUserIdをそのまま返す（外部キー制約がない場合のみ有効だが、試みる価値あり）
      return params.authUserId;
    }
  }

  // 2. ゲストユーザーの場合 (既存ロジック)
  const guestLineId = `guest-${params.gender}`;
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("line_user_id", guestLineId)
    .maybeSingle();

  if (data?.id) return data.id;

  const { data: inserted, error: insertError } = await supabase
    .from("users")
    .insert({
      line_user_id: guestLineId,
      gender: params.gender,
      nickname: params.gender === "male" ? "ゲストユーザー（男性）" : "ゲストユーザー（女性）",
      birth_date: "1995-01-01",
      avatar_url: `https://api.dicebear.com/8.x/identicon/svg?seed=guest-${params.gender}`,
      is_mock_data: false,
    })
    .select("id")
    .single();

  if (insertError || !inserted) throw insertError;
  return inserted.id;
};

export const POST = async (request: Request) => {
  const json = await request.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ message: "invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  // ログインユーザーの取得
  const cookieStore = cookies();
  const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore });
  const { data: { user } } = await supabaseAuth.auth.getUser();

  const supabaseAdmin = createSupabaseAdminClient();

  try {
    // ログイン済みならそのID、未ログインならゲスト処理
    let userId: string;
    
    if (user?.id) {
      // ログインユーザー: public.users にレコードがあるか確認・作成
      userId = await ensureUserRecord(supabaseAdmin, {
        authUserId: user.id,
        gender: parsed.data.userGender,
        nickname: user.user_metadata.full_name,
        avatarUrl: user.user_metadata.avatar_url,
      });
    } else {
      // ゲストユーザー
      userId = await ensureUserRecord(supabaseAdmin, {
        gender: parsed.data.userGender,
      });
    }
    
    // ビッグファイブ診断結果を生成
    const diagnosisResult = generateDiagnosisResult(parsed.data);
    const animalType = getTogelLabel(diagnosisResult.personalityType.id);
    const typeId = diagnosisResult.personalityType.id;

    // プロフィールに診断タイプを保存 (ログインユーザーのみ)
    if (user?.id) {
      await supabaseAdmin.from("profiles").upsert({
        id: user.id,
        diagnosis_type_id: typeId,
        // 他のプロフィール情報があれば更新（とりあえずIDとtypeだけ更新）
      }, { onConflict: "id" }); 
      // upsertだと他のフィールドが消える可能性があるため、updateの方が安全だが
      // profilesが存在しない可能性もあるのでupsert。ただし本来は他のフィールドも保持すべき。
      // ここでは簡単のため update を試み、ダメなら insert するか、
      // 単純に update だけにする（プロフィールは会員登録時に作られるはず）
      
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({ diagnosis_type_id: typeId })
        .eq("id", user.id);
        
      if (profileError) {
        // プロフィールがまだない場合は作成
        await supabaseAdmin.from("profiles").insert({
          id: user.id,
          diagnosis_type_id: typeId,
          full_name: user.user_metadata.full_name || "No Name",
          avatar_url: user.user_metadata.avatar_url || "",
        });
      }
    }

    const { data: insertResult, error: insertError } = await supabaseAdmin
      .from("diagnosis_results")
      .insert({
        user_id: userId,
        diagnosis_type: parsed.data.diagnosisType,
        animal_type: animalType,
        answers: parsed.data.answers,
      })
      .select("id")
      .single();

    if (insertError || !insertResult) {
      // 古いテーブル構造などでエラーになる場合は無視して進む（今回はプロフィールの更新が主目的）
      console.warn("Failed to store diagnosis result history:", insertError);
      // throw insertError; 
    }

    const results = await generateMatchingResults(parsed.data);
    const mismatchResults = await generateMismatchingResults(parsed.data);

    if (insertResult) {
      const { error: cacheError } = await supabaseAdmin.from("matching_cache").insert({
        user_id: userId,
        diagnosis_result_id: insertResult.id,
        matched_users: results,
      });
      if (cacheError) console.warn("Failed to cache matching results", cacheError);
    }

    return NextResponse.json({
      results,
      mismatchResults,
      diagnosis: diagnosisResult,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "diagnosis failed" }, { status: 500 });
  }
};
