import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { generateDiagnosisResult } from "@/lib/matching/engine";
import { Answer } from "@/types/diagnosis";

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

export const GET = async () => {
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

  const { data: rows, error } = await supabaseAdmin
    .from("diagnosis_results")
    .select("id, diagnosis_type, animal_type, answers, created_at, completed_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error || !rows) {
    console.error("Failed to load diagnosis history", error);
    return NextResponse.json({ history: [] });
  }

  const history = rows.map((row, index) => {
    const answers = Array.isArray(row.answers) ? (row.answers as Answer[]) : [];
    const mode: "light" | "full" = row.diagnosis_type === "full" ? "full" : "light";
    let togelTypeId: string | null = null;
    const togelLabel: string | null = row.animal_type ?? null;
    let typeName: string | null = null;

    if (answers.length > 0) {
      const diagnosis = generateDiagnosisResult({
        diagnosisType: mode,
        userGender: gender,
        answers,
      });
      togelTypeId = diagnosis.personalityType.id;
      typeName = diagnosis.personalityType.typeName ?? null;
    }

    return {
      id: row.id,
      occurrence: index + 1,
      mode,
      togelTypeId,
      togelLabel,
      typeName,
      completedAt: row.completed_at ?? row.created_at,
    };
  });

  return NextResponse.json({ history });
};
