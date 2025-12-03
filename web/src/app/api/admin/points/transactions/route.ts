import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/admin/check-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export async function GET(request: Request) {
  const adminUser = await requireAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const reason = url.searchParams.get("reason");
  const userId = url.searchParams.get("userId");
  const page = clamp(Number(url.searchParams.get("page")) || 1, 1, 1000);
  const limit = clamp(Number(url.searchParams.get("limit")) || 50, 10, 200);
  const offset = (page - 1) * limit;

  const supabaseAdmin = createSupabaseAdminClient();
  let query = supabaseAdmin
    .from("point_transactions")
    .select("id, user_id, order_id, transaction_type, reason, points, balance_after, metadata, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (type && ["credit", "debit"].includes(type)) {
    query = query.eq("transaction_type", type);
  }

  if (reason && ["purchase", "diagnosis", "bonus", "admin_adjustment", "refund", "other"].includes(reason)) {
    query = query.eq("reason", reason);
  }

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data: transactions, count, error } = await query;

  if (error) {
    console.error("Failed to load point transactions", error);
    return NextResponse.json({ error: "Failed to load transactions" }, { status: 500 });
  }

  const userIds = Array.from(new Set((transactions ?? []).map((tx) => tx.user_id).filter(Boolean)));
  let profiles: { id: string; full_name: string | null; nickname: string | null }[] = [];
  if (userIds.length > 0) {
    const profilesRes = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, nickname")
      .in("id", userIds);
    profiles = profilesRes.data ?? [];
  }
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

  return NextResponse.json({
    transactions: (transactions ?? []).map((tx) => ({
      ...tx,
      profile: profileMap.get(tx.user_id) ?? null,
    })),
    meta: {
      page,
      limit,
      total: count ?? 0,
      totalPages: count ? Math.ceil(count / limit) : 1,
    },
  });
}
