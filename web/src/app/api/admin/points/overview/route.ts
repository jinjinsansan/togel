import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/admin/check-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const mapDailySales = (rows: { created_at: string; amount: number }[]) => {
  const totals = new Map<string, number>();
  rows.forEach((row) => {
    const dateKey = row.created_at.slice(0, 10);
    totals.set(dateKey, (totals.get(dateKey) ?? 0) + Number(row.amount || 0));
  });
  return Array.from(totals.entries())
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([date, amount]) => ({ date, amount }));
};

export async function GET() {
  const adminUser = await requireAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const now = Date.now();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const [metricsRes, closedOrdersRes, pkgSalesRes, recentOrdersRes] = await Promise.all([
      supabaseAdmin.from("point_dashboard_metrics").select("*").maybeSingle(),
      supabaseAdmin
        .from("point_orders")
        .select("created_at, amount")
        .eq("status", "closed")
        .gte("created_at", thirtyDaysAgo),
      supabaseAdmin
        .from("point_package_sales")
        .select("package_id, name, total_amount, total_points, closed_orders")
        .order("total_amount", { ascending: false })
        .limit(5),
      supabaseAdmin
        .from("point_orders")
        .select("id, user_id, amount, currency, points, status, created_at, payment_order_id")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    if (metricsRes.error) throw metricsRes.error;
    if (closedOrdersRes.error) throw closedOrdersRes.error;
    if (pkgSalesRes.error) throw pkgSalesRes.error;
    if (recentOrdersRes.error) throw recentOrdersRes.error;

    return NextResponse.json({
      metrics: {
        totalRevenue: Number(metricsRes.data?.total_revenue ?? 0),
        pendingAmount: Number(metricsRes.data?.pending_amount ?? 0),
        refundedAmount: Number(metricsRes.data?.refunded_amount ?? 0),
        totalPointsSold: Number(metricsRes.data?.total_points_sold ?? 0),
        activeOrders: Number(metricsRes.data?.active_orders ?? 0),
      },
      salesTrend: mapDailySales((closedOrdersRes.data ?? []) as { created_at: string; amount: number }[]),
      topPackages: pkgSalesRes.data ?? [],
      recentOrders: recentOrdersRes.data ?? [],
    });
  } catch (error) {
    console.error("Failed to load admin point overview", error);
    return NextResponse.json({ error: "Failed to load overview" }, { status: 500 });
  }
}
