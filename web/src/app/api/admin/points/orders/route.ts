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
  const status = url.searchParams.get("status");
  const search = url.searchParams.get("search")?.trim();
  const page = clamp(Number(url.searchParams.get("page")) || 1, 1, 1000);
  const limit = clamp(Number(url.searchParams.get("limit")) || 20, 5, 100);
  const offset = (page - 1) * limit;

  const supabaseAdmin = createSupabaseAdminClient();
  let query = supabaseAdmin
    .from("point_orders")
    .select("id, user_id, package_id, amount, currency, points, status, checkout_url, payment_order_id, created_at, updated_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && ["pending", "opened", "closed", "rejected", "expired", "refunded", "canceled"].includes(status)) {
    query = query.eq("status", status);
  }

  if (search) {
    query = query.or(`id.ilike.%${search}%,payment_order_id.ilike.%${search}%`);
  }

  const { data: orders, count, error } = await query;

  if (error) {
    console.error("Failed to load point orders", error);
    return NextResponse.json({ error: "Failed to load orders" }, { status: 500 });
  }

  const userIds = Array.from(new Set((orders ?? []).map((order) => order.user_id).filter(Boolean)));
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
    orders: (orders ?? []).map((order) => ({
      ...order,
      profile: profileMap.get(order.user_id) ?? null,
    })),
    meta: {
      page,
      limit,
      total: count ?? 0,
      totalPages: count ? Math.ceil(count / limit) : 1,
    },
  });
}
