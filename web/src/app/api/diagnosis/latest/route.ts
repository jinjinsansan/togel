import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { generateDiagnosisResult, generateMatchingResults, generateMismatchingResults } from "@/lib/matching/engine";
import { Answer } from "@/types/diagnosis";
import { estimateProfileScores } from "@/lib/personality";
import { getMatchingCacheExpiry, isMatchingCacheValid } from "@/lib/matching/cache";

export const GET = async (request: Request) => {
  const cookieStore = cookies();
  const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore });
  const { data: { session } } = await supabaseAuth.auth.getSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const forceFresh = url.searchParams.get("fresh") === "1";
  const revalidate = url.searchParams.get("revalidate") === "1";

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
      .select("matched_users, mismatched_users, featured_user, diagnosis_result_id, expires_at")
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

    const cacheMatchesLatest =
      Boolean(
        cachedData &&
          cachedData.diagnosis_result_id === latestDiagnosis.id &&
          cachedData.matched_users
      );
    const cacheValid = cacheMatchesLatest && isMatchingCacheValid(cachedData?.expires_at ?? null);
    const cachedFeaturedResult = cachedData?.featured_user ?? null;

    const cachedPayload = cacheMatchesLatest
      ? {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          results: (cachedData?.matched_users as any[]) ?? [],
          mismatchResults: cachedData?.mismatched_users ?? null,
          featuredResult: cachedFeaturedResult,
        }
      : null;

    const recomputeAndCache = async () => {
      const [freshResults, freshMismatch] = await Promise.all([
        generateMatchingResults(inputData),
        generateMismatchingResults(inputData),
      ]);

      try {
        await supabaseAdmin.from("matching_cache").insert({
          user_id: userData.id,
          diagnosis_result_id: latestDiagnosis.id,
          matched_users: freshResults,
          mismatched_users: freshMismatch,
          featured_user: cachedFeaturedResult,
          expires_at: getMatchingCacheExpiry(),
        });
      } catch (cacheError) {
        console.warn("Failed to refresh matching cache", cacheError);
      }

      return {
        results: freshResults,
        mismatchResults: freshMismatch,
        featuredResult: cachedFeaturedResult,
      };
    };

    const shouldUseCache = !forceFresh && cacheMatchesLatest;
    let basePayload = cachedPayload;
    let staleResponse = false;

    if (!shouldUseCache) {
      basePayload = await recomputeAndCache();
    } else {
      staleResponse = !cacheValid;
      if (revalidate || !cacheValid) {
        recomputeAndCache().catch((err) => console.error("Background matching cache refresh failed", err));
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let results: any[] = basePayload?.results ?? [];
    let mismatchResults = basePayload?.mismatchResults ?? null;
    const featuredResult = basePayload?.featuredResult ?? null;

    if (!mismatchResults) {
      mismatchResults = await generateMismatchingResults(inputData);
    }

    // --- いたずら機能 (Prank Mode) ---
    // 条件:
    // 1. ユーザーが女性 (inputData.userGender === 'female')
    // 2. Cookieに有効な招待コード(ref_code)がある
    // 3. 招待者が男性である (DBチェック)
    
    if (inputData.userGender === "female") {
      const refCode = cookieStore.get("ref_code")?.value;
      if (refCode) {
        try {
          // ref_codeは暗号化(Base64)されたID
          const referrerId = atob(refCode);
          
          // 招待者の情報を取得
          const { data: referrerProfile } = await supabaseAdmin
            .from("profiles")
            .select("*")
            .eq("id", referrerId)
            .eq("gender", "male") // 男性のみ
            .single();

          // いたずら機能が有効かチェック (social_links.prankActive !== false)
          // JSON型なので any キャスト等が必要な場合があるが、JSロジックではそのままアクセス可能
          const isPrankActive = referrerProfile?.social_links?.prankActive !== false;

          if (referrerProfile && isPrankActive) {
            // 招待者の詳細情報（趣味など）も取得（engine互換のため）
            // ここでは簡易的にprofilesデータからMatchingProfileを構築
            // 必要なプロパティ: id, nickname, gender, age, avatarUrl, bio, job, ...
            // profilesにはないカラムもあるため、usersテーブルからも引くか、あるいはprofilesに統合されている前提で
            // 現状のDB設計では usersテーブルに詳細があるはず
            
            const { data: referrerUser } = await supabaseAdmin
              .from("users")
              .select("id, nickname, gender, age, avatar_url, bio, job, favorite_things, hobbies, special_skills")
              .eq("id", referrerId)
              .single();

            if (referrerUser) {
              const mockProfile = {
                id: referrerUser.id,
                nickname: referrerUser.nickname || referrerProfile.full_name || "Unknown",
                age: referrerUser.age || referrerProfile.age || 25,
                gender: "male" as const,
                avatarUrl: referrerUser.avatar_url || referrerProfile.avatar_url || "",
                bio: referrerUser.bio || referrerProfile.bio || "",
                job: referrerUser.job || referrerProfile.job || "",
                favoriteThings: referrerUser.favorite_things,
                hobbies: referrerUser.hobbies,
                specialSkills: referrerUser.special_skills,
                values: "運命的な出会い", // 固定値でもOK
                communication: "情熱的",
                interests: ["あなた"],
                city: referrerProfile.city || "近く",
              };

              // スコア等は適当に計算（あるいは最高値にする）
              // engine.tsのロジックを一部流用
              const profileScores = estimateProfileScores(mockProfile);
              
              // 強制的にスコア100、ランキング1位のオブジェクトを作成
              const prankResult = {
                ranking: 1,
                score: 100, // 運命の100%
                profile: mockProfile,
                summary: "運命の赤い糸で結ばれた、奇跡のような相性です！",
                highlights: [
                  "運命：前世から結ばれているレベルの相性",
                  "性格：お互いの欠点を完璧に補い合える関係",
                  "価値観：言葉にしなくても通じ合えるシンクロ率",
                  "会話：時間を忘れて語り合える楽しさ",
                  "将来：一緒にいる未来しか想像できない二人"
                ],
                compatibility: {
                  personality: 100,
                  valueAlignment: 100,
                  communication: 100,
                  total: 100,
                },
                compatibilityReason: "AIが「これ以上の相性は存在しない」と判断しました。もはや運命と言っても過言ではありません。今すぐ連絡を取るべき相手です。",
                personalityTypes: {
                  user: { id: "destiny", name: "運命のヒロイン", description: "運命の人を待ち続けていた純粋な心" },
                  profile: { id: "prince", name: "運命の王子様", description: "あなたを迎えに来た運命の相手" },
                },
                bigFiveScores: {
                  user: diagnosisResult.bigFiveScores,
                  profile: profileScores,
                },
                insights: {
                  strengths: ["宇宙規模の奇跡的な出会い", "二人の間には障害すら愛のスパイスになる"],
                  growthAreas: ["愛が深すぎて周りが見えなくなることに注意"],
                  relationshipStyle: "世界中が嫉妬するような熱愛関係",
                  challenges: ["離れている時間が辛すぎること"],
                },
                catchphrase: "AIが導き出した、100年に1度の運命の相手",
                dateIdea: "夜景の見えるレストランで、運命を語り合う",
                commonalities: ["魂のレベルで共鳴している", "笑いのツボから人生観まで全てが一致"],
                conversationStarters: ["「やっと会えたね」と伝えてみる"],
                profileNarrative: {
                  personalityTraits: ["誠実で頼りがいがある", "あなただけを大切にする一途さ"],
                  values: ["愛と信頼", "家族を大切にする"],
                  communicationStyle: "あなたの言葉を全て受け止める包容力"
                },
                matchingReasons: [
                  { title: "魂の共鳴", userTrait: "運命", profileTrait: "宿命", why: "理屈では説明できない引力が二人を引き寄せています" }
                ],
                relationshipPreview: {
                  goodPoints: ["毎日が記念日のような幸せ", "不安を感じさせない絶対的な安心感"],
                  warnings: ["愛されすぎて困ってしまうかも"]
                },
                firstDateSuggestion: {
                  recommendations: ["二人きりになれる静かな場所"],
                  conversationTopics: ["これからの二人の未来について"],
                  ngActions: ["照れ隠しで素っ気ない態度をとること"]
                },
                isPrank: true, // フロントエンドで識別するためのフラグ
              };

              // 結果配列の先頭に追加（既存の1位は2位にずれる）
              results = [prankResult, ...results];
            }
          }
        } catch (e) {
          console.error("Failed to process prank logic", e);
        }
      }
    }

    // アクティブユーザー追跡: マッチング結果を閲覧した日時を記録（非同期、エラーは無視）
    (async () => {
      try {
        await supabaseAdmin
          .from("users")
          .update({ last_viewed_results_at: new Date().toISOString() })
          .eq("id", userData.id);
      } catch (err) {
        console.warn("Failed to update last_viewed_results_at", err);
      }
    })();

    return NextResponse.json({
      results,
      mismatchResults,
      featuredResult,
      diagnosis: diagnosisResult,
      stale: staleResponse,
    });

  } catch (error) {
    console.error("Error fetching diagnosis:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
};
