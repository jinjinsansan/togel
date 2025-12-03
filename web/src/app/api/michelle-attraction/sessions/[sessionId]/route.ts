import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";

import { MICHELLE_ATTRACTION_AI_ENABLED } from "@/lib/feature-flags";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AttractionSupabase = SupabaseClient<any>;

export async function DELETE(_: Request, context: { params: { sessionId: string } }) {
  if (!MICHELLE_ATTRACTION_AI_ENABLED) {
    return NextResponse.json({ error: "Michelle Attraction AI is currently disabled" }, { status: 503 });
  }

  const { sessionId } = context.params;

  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore }) as unknown as AttractionSupabase;
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
