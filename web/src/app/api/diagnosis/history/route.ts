import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { generateDiagnosisResult } from "@/lib/matching/engine";
import { Answer } from "@/types/diagnosis";
import { getTogelLabel, personalityTypes } from "@/lib/personality";

const resolveUserId = async (supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>, authUserId: string) => {
  const { data: authLinked } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (authLinked?.id) {
    return authLinked.id;
  }

  const { data: fallback } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("id", authUserId)
    .maybeSingle();

  if (fallback?.id) {
    await supabaseAdmin.from("users").update({ auth_user_id: authUserId }).eq("id", fallback.id);
    return fallback.id;
  }

  return null;
};

export const GET = async (request: Request) => {
  const cookieStore = cookies();
  const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore });
  const {
    data: { session },
  } = await supabaseAuth.auth.getSession();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const userId = await resolveUserId(supabaseAdmin, session.user.id);

  if (!userId) {
    return NextResponse.json({ history: [] });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("gender")
    .eq("id", session.user.id)
    .maybeSingle();

  const gender = profile?.gender === "female" ? "female" : "male";

  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get("limit"));
  const offsetParam = Number(url.searchParams.get("offset"));
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 50) : 10;
  const offset = Number.isFinite(offsetParam) ? Math.max(offsetParam, 0) : 0;

  const selectColumns = "id, diagnosis_type, animal_type, personality_type_id, big_five_scores, answers, created_at, completed_at";

  const fetchHistory = async (targetUserId: string) =>
    supabaseAdmin
      .from("diagnosis_results")
      .select(selectColumns, { count: "exact" })
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

  const initial = userId ? await fetchHistory(userId) : { data: null, error: null, count: 0 };
  let rows = initial.data;
  let count = initial.count;
  const { error } = initial;

  if ((!rows || rows.length === 0) && session.user.id) {
    const fallback = await fetchHistory(session.user.id);
    if (fallback.data && fallback.data.length > 0) {
      rows = fallback.data;
      count = fallback.count;
      if (userId && userId !== session.user.id) {
        await supabaseAdmin.from("users").update({ auth_user_id: session.user.id }).eq("id", userId);
      }
    }
  }

  if (error || !rows) {
    console.error("Failed to load diagnosis history", error);
    return NextResponse.json({ history: [] });
  }

  const fallbackTypeName = (typeId: string | null) => {
    if (!typeId) return null;
    return personalityTypes.find((type) => type.id === typeId)?.typeName ?? null;
  };

  const total = count ?? rows.length + offset;

  const history = rows.map((row, index) => {
    const answers = Array.isArray(row.answers) ? (row.answers as Answer[]) : [];
    const mode: "light" | "full" = row.diagnosis_type === "full" ? "full" : "light";
    let togelTypeId: string | null = row.personality_type_id ?? null;
    let typeName: string | null = fallbackTypeName(togelTypeId);
    let togelLabel: string | null = row.animal_type ?? (togelTypeId ? getTogelLabel(togelTypeId) : null);

    if ((!togelTypeId || !typeName) && answers.length > 0) {
      const diagnosis = generateDiagnosisResult({
        diagnosisType: mode,
        userGender: gender,
        answers,
      });
      togelTypeId = diagnosis.personalityType.id;
      typeName = diagnosis.personalityType.typeName ?? null;
      togelLabel = getTogelLabel(togelTypeId);
    }

    const occurrence = Math.max(total - (offset + index), 1);

    return {
      id: row.id,
      occurrence,
      mode,
      togelTypeId,
      togelLabel,
      typeName,
      completedAt: row.completed_at ?? row.created_at,
    };
  });

  return NextResponse.json({
    history,
    meta: {
      total,
      limit,
      offset,
      hasMore: offset + history.length < total,
    },
  });
};
