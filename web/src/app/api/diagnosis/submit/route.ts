import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { generateMatchingResults, generateMismatchingResults, generateDiagnosisResult, generateSingleMatchingResult } from "@/lib/matching/engine";
import { getMatchingCacheExpiry } from "@/lib/matching/cache";
import { getTogelLabel } from "@/lib/personality";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { MatchingResult } from "@/types/diagnosis";

type NotificationPayload = {
  user_id: string;
  type: "matching" | "admin" | "system";
  title: string;
  content: string;
  metadata: Record<string, unknown>;
};

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
    const { data: linked } = await supabase
      .from("users")
      .select("id")
      .eq("auth_user_id", params.authUserId)
      .maybeSingle();

    if (linked?.id) {
      return linked.id;
    }

    const { data } = await supabase
      .from("users")
      .select("id, auth_user_id")
      .eq("id", params.authUserId) // public.users.id と auth.users.id を一致させる運用を想定
      .maybeSingle();

    if (data?.id) {
      if (!data.auth_user_id) {
        await supabase
          .from("users")
          .update({ auth_user_id: params.authUserId })
          .eq("id", data.id);
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
        console.warn("Failed to insert user, trying to fetch again:", insertError);

        const { data: existingByAuth } = await supabase
          .from("users")
          .select("id")
          .eq("auth_user_id", params.authUserId)
          .maybeSingle();

        if (existingByAuth?.id) return existingByAuth.id;

        const { data: existingById } = await supabase
          .from("users")
          .select("id")
          .eq("id", params.authUserId)
          .maybeSingle();

        if (existingById?.id) return existingById.id;

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
        personality_type_id: typeId,
        big_five_scores: diagnosisResult.bigFiveScores,
      })
      .select("id")
      .single();

    if (insertError || !insertResult) {
      console.error("Failed to store diagnosis result history", insertError);
      return NextResponse.json({ message: "Failed to store diagnosis result" }, { status: 500 });
    }

    const results = await generateMatchingResults(parsed.data);
    const mismatchResults = await generateMismatchingResults(parsed.data);
    
    let featuredResult: MatchingResult | null = null;

    // 広告/ピックアップユーザーの挿入
    try {
      // 現在有効なピックアップユーザーを取得
      const now = new Date().toISOString();
      const { data: featured } = await supabaseAdmin
        .from("featured_users")
        .select("*, users!inner(*)")
        .eq("active", true)
        .or(`target_gender.eq.all,target_gender.eq.${parsed.data.userGender === 'male' ? 'male' : 'female'}`)
        .lte("start_at", now)
        .gte("end_at", now)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (featured && featured.users) {
         // 単体マッチング生成 (engine.tsに新規追加する関数を使用)
         // Note: generateSingleMatchingResultの実装が必要
         const result = await generateSingleMatchingResult(parsed.data, featured.users);
         if (result) {
           featuredResult = { ...result, isFeatured: true };
         }
      }
    } catch (e) {
      console.error("Failed to fetch featured user", e);
    }

    if (insertResult) {
      const { error: cacheError } = await supabaseAdmin.from("matching_cache").insert({
        user_id: userId,
        diagnosis_result_id: insertResult.id,
        matched_users: results,
        mismatched_users: mismatchResults,
        featured_user: featuredResult,
        expires_at: getMatchingCacheExpiry(),
      });
      if (cacheError) console.warn("Failed to cache matching results", cacheError);

      // --- 自動ランクイン通知機能 ---
      // 上位5名のユーザーに対して、「あなたが〇位に選ばれました」という通知を送る
      // ただし、相手が「通知ON」にしている場合に限る
      
      // 非同期で実行 (awaitせず進むことでレスポンス遅延を防ぐ)
      (async () => {
        try {
          const submitterName = user?.user_metadata?.full_name || "ゲスト";
          const rankedResults = results.slice(0, 5);
          if (rankedResults.length === 0) return;

          const targetIds = rankedResults.map((result) => result.profile.id);
          const { data: targetProfiles } = await supabaseAdmin
            .from("profiles")
            .select("id, notification_settings")
            .in("id", targetIds);

          const settingsMap = new Map<string, Record<string, unknown>>(
            (targetProfiles ?? []).map((profile) => [profile.id, profile.notification_settings || {}])
          );

          const payloads = rankedResults.reduce<NotificationPayload[]>((acc, result) => {
            const preferences = settingsMap.get(result.profile.id) || {};
            if (preferences.rank_in === false) return acc;
            acc.push({
              user_id: result.profile.id,
              type: "matching",
              title: `🎉 ${result.ranking}位にランクイン！`,
              content: `${submitterName}さんの診断結果で、あなたが相性の良いお相手${result.ranking}位に選ばれました！\n相性度: ${result.score}%`,
              metadata: {
                rank: result.ranking,
                score: result.score,
                submitter_id: user?.id ?? null,
                url: user?.id ? `/profile/${user.id}` : null,
              },
            });
            return acc;
          }, []);

          if (payloads.length > 0) {
            await supabaseAdmin.from("notifications").insert(payloads);
          }
        } catch (bgError) {
          console.error("Background notification error:", bgError);
        }
      })();
    }

    return NextResponse.json({
      results,
      featuredResult,
      mismatchResults,
      diagnosis: diagnosisResult,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "diagnosis failed" }, { status: 500 });
  }
};
