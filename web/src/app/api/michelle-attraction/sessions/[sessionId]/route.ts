import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { MICHELLE_ATTRACTION_AI_ENABLED } from "@/lib/feature-flags";
import { getRouteUser, SupabaseAuthUnavailableError } from "@/lib/supabase/auth-helpers";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AttractionSupabase = SupabaseClient<any>;

export async function DELETE(_: Request, context: { params: { sessionId: string } }) {
  if (!MICHELLE_ATTRACTION_AI_ENABLED) {
    return NextResponse.json({ error: "Michelle Attraction AI is currently disabled" }, { status: 503 });
  }

  const { sessionId } = context.params;

  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient<AttractionSupabase>(cookieStore) as unknown as AttractionSupabase;
  let user;
  try {
    user = await getRouteUser(supabase, "Michelle attraction session delete");
  } catch (error) {
    if (error instanceof SupabaseAuthUnavailableError) {
      return NextResponse.json({ error: "Authentication service is temporarily unavailable. Please try again later." }, { status: 503 });
    }
    throw error;
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("michelle_attraction_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("auth_user_id", user.id);

  if (error) {
    console.error("Failed to delete michelle attraction session", error);
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
