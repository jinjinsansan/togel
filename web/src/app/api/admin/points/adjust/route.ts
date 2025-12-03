import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/admin/check-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const adminUser = await requireAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const userId: string | undefined = body?.userId;
  const points = Number(body?.points);
  const direction = body?.direction === "debit" ? "debit" : "credit";
  const reason = body?.reason ?? "admin_adjustment";
  const note: string | undefined = body?.note;

  if (!userId || !Number.isFinite(points) || points <= 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const supabaseAdmin = createSupabaseAdminClient();

  try {
    const { data, error } = await supabaseAdmin.rpc("apply_point_transaction", {
      p_user_id: userId,
      p_points: Math.trunc(points),
      p_type: direction,
      p_reason: reason,
      p_metadata: { note, admin: adminUser.email },
    });

    if (error) throw error;

    return NextResponse.json({ success: true, transaction: data });
  } catch (error) {
    console.error("Failed to adjust points", error);
    return NextResponse.json({ error: "調整に失敗しました" }, { status: 500 });
  }
}
