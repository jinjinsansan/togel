import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { MICHELLE_AI_ENABLED } from "@/lib/feature-flags";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MichelleSupabase = SupabaseClient<any>;

export async function GET() {
  if (!MICHELLE_AI_ENABLED) {
    return NextResponse.json({ error: "Michelle AI is currently disabled" }, { status: 503 });
  }

  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient<MichelleSupabase>(cookieStore) as unknown as MichelleSupabase;
  let user;
  try {
    user = await getRouteUser(supabase, "Michelle sessions list");
  } catch (error) {
    if (error instanceof SupabaseAuthUnavailableError) {
      return NextResponse.json({ error: "Authentication service is temporarily unavailable. Please try again later." }, { status: 503 });
    }
    throw error;
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("michelle_sessions")
    .select("id, title, updated_at, category")
    .eq("auth_user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Failed to load michelle sessions", error);
    return NextResponse.json({ error: "Failed to load sessions" }, { status: 500 });
  }

  return NextResponse.json({ sessions: data ?? [] });
}
