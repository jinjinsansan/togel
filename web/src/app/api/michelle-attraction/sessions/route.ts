import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";

import { MICHELLE_ATTRACTION_AI_ENABLED } from "@/lib/feature-flags";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AttractionSupabase = SupabaseClient<any>;

export async function GET() {
  if (!MICHELLE_ATTRACTION_AI_ENABLED) {
    return NextResponse.json({ error: "Michelle Attraction AI is currently disabled" }, { status: 503 });
  }

  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore }) as unknown as AttractionSupabase;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("michelle_attraction_sessions")
    .select("id, title, updated_at, category")
    .eq("auth_user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Failed to load michelle attraction sessions", error);
    return NextResponse.json({ error: "Failed to load sessions" }, { status: 500 });
  }

  const sessions = data ?? [];

  if (sessions.length === 0) {
    return NextResponse.json({ sessions: [] });
  }

  const sessionIds = sessions.map((session) => session.id);
  const { data: progressRows, error: progressError } = await supabase
    .from("michelle_attraction_progress")
    .select(
      "id, session_id, current_level, current_section, progress_status, progress_code, updated_at, emotional_state, emotional_score, psychology_recommendation",
    )
    .in("session_id", sessionIds);

  if (progressError) {
    console.error("Failed to load michelle attraction progress snapshot", progressError);
    return NextResponse.json({ error: "Failed to load sessions" }, { status: 500 });
  }

  type ProgressSnapshot = {
    id: string;
    session_id: string;
    current_level: number;
    current_section: number;
    progress_status: "OK" | "IP" | "RV";
    progress_code: string | null;
    updated_at: string;
    emotional_state: "stable" | "concern" | "critical";
    emotional_score: number;
    psychology_recommendation: "none" | "suggested" | "acknowledged" | "dismissed" | "resolved";
  };

  const progressBySession = new Map<string, ProgressSnapshot>();
  (progressRows ?? []).forEach((row) => {
    if (row?.session_id) {
      progressBySession.set(row.session_id, row as ProgressSnapshot);
    }
  });

  const response = sessions.map((session) => ({
    ...session,
    progress: progressBySession.get(session.id) ?? null,
  }));

  return NextResponse.json({ sessions: response });
}
