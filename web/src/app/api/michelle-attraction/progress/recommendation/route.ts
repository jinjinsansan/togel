import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { MICHELLE_ATTRACTION_AI_ENABLED } from "@/lib/feature-flags";
import {
  ensureProgressRecord,
  setPsychologyRecommendationState,
  type AttractionSupabase,
} from "@/lib/michelle-attraction/progress-server";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";

const schema = z.object({
  sessionId: z.string().uuid(),
  action: z.enum(["acknowledge", "dismiss", "resolve"] as const),
});

export async function POST(request: Request) {
  if (!MICHELLE_ATTRACTION_AI_ENABLED) {
    return NextResponse.json({ error: "Michelle Attraction AI is currently disabled" }, { status: 503 });
  }

  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient<AttractionSupabase>(cookieStore) as unknown as AttractionSupabase;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { sessionId, action } = parsed.data;

  try {
    await ensureProgressRecord(supabase, user.id, sessionId);

    let reason: string | null = null;
    let optOut: Date | null = null;
    let state: "none" | "suggested" | "acknowledged" | "dismissed" | "resolved" = "none";

    if (action === "acknowledge") {
      state = "acknowledged";
      reason = "ユーザーがミシェル心理学で感情ケアを優先";
    } else if (action === "dismiss") {
      state = "dismissed";
      reason = "ユーザーが今回の提案を見送り";
      optOut = new Date(Date.now() + 1000 * 60 * 60 * 12);
    } else {
      state = "none";
      reason = null;
    }

    const progress = await setPsychologyRecommendationState(supabase, {
      authUserId: user.id,
      sessionId,
      state,
      reason,
      optOutUntil: optOut,
    });

    return NextResponse.json({ progress });
  } catch (error) {
    console.error("Failed to update psychology recommendation", error);
    return NextResponse.json({ error: "Failed to update recommendation" }, { status: 500 });
  }
}
