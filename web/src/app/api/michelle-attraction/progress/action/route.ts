import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { z } from "zod";

import {
  ensureProgressRecord,
  fetchProgressBySession,
  type AttractionSupabase,
  type ProgressRecord,
  upsertProgressRecord,
} from "@/lib/michelle-attraction/progress-server";
import { getNextSection, getPreviousSection } from "@/lib/michelle-attraction/sections";

const requestSchema = z.object({
  sessionId: z.string().uuid(),
  action: z.enum(["next", "back"]),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { sessionId, action } = parsed.data;
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore }) as unknown as AttractionSupabase;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let progressRecord = await fetchProgressBySession(supabase, user.id, sessionId);
    if (!progressRecord) {
      await ensureProgressRecord(supabase, user.id, sessionId);
      progressRecord = await fetchProgressBySession(supabase, user.id, sessionId);
    }

    if (!progressRecord) {
      throw new Error("Failed to resolve progress record");
    }

    const updated = await applyProgressAction({ action, progressRecord, supabase, authUserId: user.id, sessionId });
    return NextResponse.json({ progress: updated });
  } catch (error) {
    console.error("Michelle attraction progress action error", error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "進捗を更新できませんでした";
    const status = message.includes("セクション") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

const applyProgressAction = async (params: {
  action: "next" | "back";
  progressRecord: ProgressRecord;
  supabase: AttractionSupabase;
  authUserId: string;
  sessionId: string;
}) => {
  const { action, progressRecord, supabase, authUserId, sessionId } = params;
  if (action === "next") {
    const nextSection = getNextSection(progressRecord.current_section);
    if (!nextSection) {
      throw new Error("これ以上先のセクションはありません");
    }
    return upsertProgressRecord(supabase, {
      authUserId,
      sessionId,
      level: nextSection.level,
      section: nextSection.section,
      status: "IP",
    });
  }

  const previousSection = getPreviousSection(progressRecord.current_section);
  if (!previousSection) {
    throw new Error("これ以上戻ることはできません");
  }
  return upsertProgressRecord(supabase, {
    authUserId,
    sessionId,
    level: previousSection.level,
    section: previousSection.section,
    status: "RV",
  });
};
