import { NextResponse } from "next/server";
import { z } from "zod";

import { generateMatchingResults, generateDiagnosisResult } from "@/lib/matching/engine";
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

const ensureGuestUser = async (
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  gender: "male" | "female"
) => {
  const guestLineId = `guest-${gender}`;
  
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("line_user_id", guestLineId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data?.id) {
    return data.id;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("users")
    .insert({
      line_user_id: guestLineId,
      gender,
      nickname: gender === "male" ? "ゲストユーザー（男性）" : "ゲストユーザー（女性）",
      birth_date: "1995-01-01",
      avatar_url: `https://api.dicebear.com/8.x/identicon/svg?seed=guest-${gender}`,
      bio: "LINEログイン前のゲストユーザーです。",
      job: "非公開",
      favorite_things: "価値観の共有",
      hobbies: "映画鑑賞",
      special_skills: "気遣い",
      is_mock_data: false,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    throw insertError ?? new Error("Failed to create guest user");
  }

  return inserted.id;
};

export const POST = async (request: Request) => {
  const json = await request.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ message: "invalid payload", issues: parsed.error.issues }, { status: 400 });
  }
  const supabase = createSupabaseAdminClient();

  try {
    const guestUserId = await ensureGuestUser(supabase, parsed.data.userGender);
    
    // ビッグファイブ診断結果を生成
    const diagnosisResult = generateDiagnosisResult(parsed.data);

    const { data: insertResult, error: insertError } = await supabase
      .from("diagnosis_results")
      .insert({
        user_id: guestUserId,
        diagnosis_type: parsed.data.diagnosisType,
        answers: parsed.data.answers,
        big_five_scores: diagnosisResult.bigFiveScores,
        personality_type_id: diagnosisResult.personalityType.id, // 24タイプID
      })
      .select("id")
      .single();

    if (insertError || !insertResult) {
      throw insertError ?? new Error("Failed to store diagnosis result");
    }

    const results = await generateMatchingResults(parsed.data);

    const { error: cacheError } = await supabase.from("matching_cache").insert({
      user_id: guestUserId,
      diagnosis_result_id: insertResult.id,
      matched_users: results,
    });

    if (cacheError) {
      console.warn("Failed to cache matching results", cacheError);
    }

    return NextResponse.json({
      results,
      diagnosis: diagnosisResult,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "diagnosis failed" }, { status: 500 });
  }
};
