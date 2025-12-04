import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { MICHELLE_ATTRACTION_AI_ENABLED } from "@/lib/feature-flags";
import {
  ensureProgressRecord,
  fetchLatestProgress,
  fetchProgressNotes,
  type AttractionSupabase,
  upsertProgressRecord,
} from "@/lib/michelle-attraction/progress-server";
import { type ProgressStatus } from "@/lib/michelle-attraction/sections";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";

const progressStatusSchema = z.enum(["OK", "IP", "RV"] as const);

const progressSchema = z.object({
  sessionId: z.string().uuid(),
  level: z.number().int().min(1).max(5),
  section: z.number().int().min(1).max(20),
  status: progressStatusSchema,
  notes: z.string().max(500).optional().nullable(),
});

export async function GET() {
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

  try {
    const progress = await fetchLatestProgress(supabase, user.id);
    const notes = progress ? await fetchProgressNotes(supabase, progress.id, 10) : [];
    return NextResponse.json({ progress, notes });
  } catch (error) {
    console.error("Failed to fetch michelle attraction progress", error);
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 });
  }
}

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

  const body = await request.json().catch(() => null);
  const parsed = progressSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { sessionId, level, section, status, notes } = parsed.data;

  try {
    await ensureProgressRecord(supabase, user.id, sessionId);
    const record = await upsertProgressRecord(supabase, {
      authUserId: user.id,
      sessionId,
      level,
      section,
      status: status as ProgressStatus,
      notes: notes ?? null,
    });
    const latestNotes = await fetchProgressNotes(supabase, record.id, 10);
    return NextResponse.json({ progress: record, notes: latestNotes });
  } catch (error) {
    console.error("Failed to update michelle attraction progress", error);
    return NextResponse.json({ error: "Failed to update progress" }, { status: 500 });
  }
}
