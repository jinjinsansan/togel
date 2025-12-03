import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export async function GET(request: Request) {
  const cookieStore = cookies();
  const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore });
  const {
    data: { session },
  } = await supabaseAuth.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const page = clamp(Number(url.searchParams.get("page")) || 1, 1, 1000);
  const limit = clamp(Number(url.searchParams.get("limit")) || 20, 5, 100);
  const reason = url.searchParams.get("reason");
  const type = url.searchParams.get("type");
  const offset = (page - 1) * limit;

  const supabaseAdmin = createSupabaseAdminClient();
  let query = supabaseAdmin
    .from("point_transactions")
    .select("id, transaction_type, reason, points, balance_after, metadata, created_at", { count: "exact" })
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (reason && ["purchase", "diagnosis", "bonus", "admin_adjustment", "refund", "other"].includes(reason)) {
    query = query.eq("reason", reason);
  }

  if (type && ["credit", "debit"].includes(type)) {
    query = query.eq("transaction_type", type);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Failed to load point transactions", error);
    return NextResponse.json({ error: "Failed to load transactions" }, { status: 500 });
  }

  return NextResponse.json({
    transactions: data ?? [],
    meta: {
      page,
      limit,
      total: count ?? 0,
      totalPages: count ? Math.ceil(count / limit) : 1,
    },
  });
}
