import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const ALLOWED_SOURCES = new Set(["result_page", "mypage"]);

export async function POST(request: Request) {
  let payload: { recommendationId?: string; source?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (!payload.recommendationId || !ALLOWED_SOURCES.has(payload.source ?? "")) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  let userId: string | null = null;
  try {
    const supabase = createSupabaseRouteClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    userId = session?.user?.id ?? null;
  } catch (error) {
    console.error("Failed to resolve session", error);
  }

  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("recommendation_clicks").insert({
      recommendation_id: payload.recommendationId,
      user_id: userId,
      source: payload.source,
    });

    if (error) {
      console.error("Failed to track recommendation click", error);
    }
  } catch (error) {
    console.error(error);
  }

  return NextResponse.json({ ok: true });
}
