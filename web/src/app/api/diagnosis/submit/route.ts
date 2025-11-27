import { NextResponse } from "next/server";
import { z } from "zod";

import { generateMatchingResults } from "@/lib/matching/engine";
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

const determineAnimalType = (answers: { value: number }[]) => {
  const baseAnimals = [
    "こじか",
    "ひつじ",
    "狼",
    "猿",
    "チーター",
    "黒ひょう",
    "ライオン",
    "虎",
    "たぬき",
    "子守熊",
    "ゾウ",
    "ペガサス",
  ];
  const variations = ["月", "地球", "太陽", "新月", "満月"];
  const avg = answers.reduce((sum, item) => sum + item.value, 0) / answers.length;
  const normalized = Math.max(0, Math.min(59, Math.round(((avg - 1) / 4) * 59)));
  const animal = baseAnimals[normalized % baseAnimals.length];
  const variation = variations[Math.floor(normalized / baseAnimals.length) % variations.length];
  return `${animal}-${variation}`;
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
    const animalType = determineAnimalType(parsed.data.answers);
    const { data: insertResult, error: insertError } = await supabase
      .from("diagnosis_results")
      .insert({
        user_id: guestUserId,
        diagnosis_type: parsed.data.diagnosisType,
        animal_type: animalType,
        answers: parsed.data.answers,
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

    return NextResponse.json({ results });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "diagnosis failed" }, { status: 500 });
  }
};
