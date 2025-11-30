import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const cookieStore = cookies();
  const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore });
  const { data: { session } } = await supabaseAuth.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = createSupabaseAdminClient();

  // 1. Get all notifications for this user (or global)
  const { data: notifications, error } = await supabaseAdmin
    .from("notifications")
    .select("*")
    .or(`user_id.eq.${session.user.id},user_id.is.null`)
    .lte("scheduled_at", new Date().toISOString()) // Only scheduled ones
    .order("scheduled_at", { ascending: false })
    .limit(20); // Limit to recent 20

  if (error) {
    console.error("Fetch notifications error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }

  // 2. Get read status
  const { data: reads } = await supabaseAdmin
    .from("notification_reads")
    .select("notification_id")
    .eq("user_id", session.user.id);

  const readIds = new Set(reads?.map((r) => r.notification_id));

  // 3. Merge read status
  const result = notifications.map((n) => ({
    ...n,
    read: readIds.has(n.id),
  }));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  // Mark as read logic
  const cookieStore = cookies();
  const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore });
  const { data: { session } } = await supabaseAuth.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { notificationId } = body;

  if (!notificationId) {
    return NextResponse.json({ error: "Missing ID" }, { status: 400 });
  }

  const supabaseAdmin = createSupabaseAdminClient();

  // Upsert read status
  const { error } = await supabaseAdmin
    .from("notification_reads")
    .upsert(
      {
        user_id: session.user.id,
        notification_id: notificationId,
        read_at: new Date().toISOString(),
      },
      { onConflict: "user_id, notification_id" }
    );

  if (error) {
    return NextResponse.json({ error: "Failed to mark read" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
