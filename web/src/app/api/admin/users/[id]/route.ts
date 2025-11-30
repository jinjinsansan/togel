import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/admin/check-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ActionPayload =
  | { action: "block"; reason?: string }
  | { action: "unblock" }
  | { action: "delete" }
  | { action: "restore" }
  | { action: "notes"; notes: string };

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const adminUser = await requireAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as ActionPayload;
  const supabaseAdmin = createSupabaseAdminClient();
  const userId = params.id;

  if (!userId) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  const now = new Date().toISOString();

  switch (body.action) {
    case "block":
      updates.is_blocked = true;
      updates.blocked_reason = body.reason || null;
      updates.blocked_at = now;
      break;
    case "unblock":
      updates.is_blocked = false;
      updates.blocked_reason = null;
      updates.blocked_at = null;
      break;
    case "delete":
      updates.is_deleted = true;
      updates.deleted_at = now;
      break;
    case "restore":
      updates.is_deleted = false;
      updates.deleted_at = null;
      break;
    case "notes":
      updates.admin_notes = body.notes ?? null;
      break;
    default:
      return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .update(updates)
    .eq("id", userId)
    .select("id, is_blocked, blocked_reason, blocked_at, is_deleted, deleted_at, admin_notes")
    .single();

  if (error) {
    console.error("Failed to update user", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }

  return NextResponse.json({ user: data });
}
