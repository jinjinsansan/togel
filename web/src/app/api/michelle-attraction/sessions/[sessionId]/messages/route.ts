import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { MICHELLE_ATTRACTION_AI_ENABLED } from "@/lib/feature-flags";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AttractionSupabase = SupabaseClient<any>;

const paramsSchema = z.object({
  sessionId: z.string().uuid(),
});

export async function GET(_: Request, context: { params: { sessionId: string } }) {
  if (!MICHELLE_ATTRACTION_AI_ENABLED) {
    return NextResponse.json({ error: "Michelle Attraction AI is currently disabled" }, { status: 503 });
  }

  const { sessionId } = paramsSchema.parse(context.params);

  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient<AttractionSupabase>(cookieStore) as unknown as AttractionSupabase;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: session, error: sessionError } = await supabase
    .from("michelle_attraction_sessions")
    .select("id, title, category")
    .eq("id", sessionId)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const { data: messages, error } = await supabase
    .from("michelle_attraction_messages")
    .select("id, role, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    console.error("Failed to load michelle attraction messages", error);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }

  return NextResponse.json({ session, messages: messages ?? [] });
}
