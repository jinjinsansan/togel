import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export async function GET(request: Request) {
  const cookieStore = cookies();
  const supabaseAuth = createSupabaseRouteClient(cookieStore);
  const {
    data: { session },
  } = await supabaseAuth.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const page = clamp(Number(url.searchParams.get("page")) || 1, 1, 1000);
  const limit = clamp(Number(url.searchParams.get("limit")) || 20, 5, 50);
  const status = url.searchParams.get("status")?.toLowerCase();
  const offset = (page - 1) * limit;

  const supabaseAdmin = createSupabaseAdminClient();
  let query = supabaseAdmin
    .from("point_orders")
    .select("id, amount, currency, points, status, checkout_url, payment_order_id, created_at, updated_at", { count: "exact" })
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && ["pending", "opened", "closed", "rejected", "expired", "refunded", "canceled"].includes(status)) {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Failed to load point orders", error);
    return NextResponse.json({ error: "Failed to load orders" }, { status: 500 });
  }

  return NextResponse.json({
    orders: data ?? [],
    meta: {
      page,
      limit,
      total: count ?? 0,
      totalPages: count ? Math.ceil(count / limit) : 1,
    },
  });
}
