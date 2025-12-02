import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";

import { MICHELLE_AI_ENABLED } from "@/lib/feature-flags";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MichelleSupabase = SupabaseClient<any>;

export async function GET() {
  if (!MICHELLE_AI_ENABLED) {
    return NextResponse.json({ error: "Michelle AI is currently disabled" }, { status: 503 });
  }

  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore }) as unknown as MichelleSupabase;
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
