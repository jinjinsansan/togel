import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { z } from "zod";

import { MICHELLE_ATTRACTION_AI_ENABLED } from "@/lib/feature-flags";
import {
  ensureProgressRecord,
  fetchProgressNotes,
  type AttractionSupabase,
} from "@/lib/michelle-attraction/progress-server";

const noteSchema = z.object({
  progressId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  noteType: z.enum(["comprehension", "emotion", "action", "success", "other"] as const),
  content: z.string().min(1).max(1000),
  relatedLevel: z.number().int().min(1).max(5).optional(),
  relatedSection: z.number().int().min(1).max(20).optional(),
});

export async function POST(request: Request) {
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

  const body = await request.json().catch(() => null);
  const parsed = noteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { progressId, sessionId, noteType, content, relatedLevel, relatedSection } = parsed.data;

  try {
    let targetProgressId = progressId ?? null;

    if (!targetProgressId) {
      if (!sessionId) {
        return NextResponse.json({ error: "progressId or sessionId is required" }, { status: 400 });
      }
      targetProgressId = await ensureProgressRecord(supabase, user.id, sessionId);
    }

    const { error } = await supabase.from("michelle_attraction_progress_notes").insert({
      progress_id: targetProgressId,
      note_type: noteType,
      related_level: relatedLevel ?? null,
      related_section: relatedSection ?? null,
      content,
    });

    if (error) {
      throw error;
    }

    const notes = await fetchProgressNotes(supabase, targetProgressId, 10);
    return NextResponse.json({ notes });
  } catch (error) {
    console.error("Failed to log michelle attraction note", error);
    return NextResponse.json({ error: "Failed to log note" }, { status: 500 });
  }
}
