import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";

export async function GET() {
  const cookieStore = cookies();
  const supabaseAuth = createSupabaseRouteClient(cookieStore);
  const {
    data: { session },
  } = await supabaseAuth.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const userId = session.user.id;

  try {
    const [walletRes, packagesRes, ordersRes, transactionsRes] = await Promise.all([
      supabaseAdmin
        .from("point_wallets")
        .select("balance, pending_balance")
        .eq("user_id", userId)
        .maybeSingle(),
      supabaseAdmin
        .from("point_packages")
        .select("id, name, description, amount_usd, currency, points, bonus_points, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabaseAdmin
        .from("point_orders")
        .select("id, amount, currency, points, status, checkout_url, payment_order_id, created_at, updated_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabaseAdmin
        .from("point_transactions")
        .select("id, transaction_type, reason, points, balance_after, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    if (walletRes.error) throw walletRes.error;
    if (packagesRes.error) throw packagesRes.error;
    if (ordersRes.error) throw ordersRes.error;
    if (transactionsRes.error) throw transactionsRes.error;

    return NextResponse.json({
      wallet: walletRes.data ?? { balance: 0, pending_balance: 0 },
      packages: packagesRes.data ?? [],
      recentOrders: ordersRes.data ?? [],
      recentTransactions: transactionsRes.data ?? [],
    });
  } catch (error) {
    console.error("Failed to load points summary", error);
    return NextResponse.json({ error: "Failed to load summary" }, { status: 500 });
  }
}
