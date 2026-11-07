import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/admin/check-admin";

// Admin check helper
// getSession() は cookie を検証しないので、管理者判定には使わない（偽造 cookie で突破されていた）
const checkAdmin = async () => Boolean(await requireAdminUser());

export async function GET() {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  
  // Fetch admin notifications (history)
  // We also want to know WHO it was sent to if it's individual.
  // For individual, user_id is set. We might want to join with profiles to get names.
  
  const { data, error } = await supabaseAdmin
    .from("notifications")
    .select("*, profiles(full_name, email)") // Note: profiles might not have email depending on schema, let's check schema if needed. usually only id/name.
    .eq("type", "admin")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    // If profiles join fails (no FK), retry without join
    const { data: retryData, error: retryError } = await supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("type", "admin")
      .order("created_at", { ascending: false })
      .limit(50);
      
    if (retryError) return NextResponse.json({ error: retryError.message }, { status: 500 });
    return NextResponse.json(retryData);
  }

  return NextResponse.json(data);
}
