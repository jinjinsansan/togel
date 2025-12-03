import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/admin/check-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const ALLOWED_STATUSES = ["pending", "opened", "closed", "rejected", "expired", "refunded", "canceled"] as const;

type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

export async function PATCH(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  const adminUser = await requireAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orderId = params.orderId;
  const body = await request.json().catch(() => null);
  const nextStatus: AllowedStatus | undefined = body?.status;

  if (!nextStatus || !ALLOWED_STATUSES.includes(nextStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: order, error } = await supabaseAdmin
    .from("point_orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const { data: existingTransactions } = await supabaseAdmin
    .from("point_transactions")
    .select("id, reason, transaction_type")
    .eq("order_id", orderId);

  const hasPurchaseCredit = existingTransactions?.some((tx) => tx.reason === "purchase" && tx.transaction_type === "credit");
  const hasRefundDebit = existingTransactions?.some((tx) => tx.reason === "refund" && tx.transaction_type === "debit");

  if (nextStatus === "closed" && !hasPurchaseCredit) {
    await supabaseAdmin.rpc("apply_point_transaction", {
      p_user_id: order.user_id,
      p_points: order.points,
      p_type: "credit",
      p_reason: "purchase",
      p_order_id: order.id,
      p_metadata: { source: "admin" },
    });
  }

  if (nextStatus === "refunded" && !hasRefundDebit && hasPurchaseCredit) {
    await supabaseAdmin.rpc("apply_point_transaction", {
      p_user_id: order.user_id,
      p_points: order.points,
      p_type: "debit",
      p_reason: "refund",
      p_order_id: order.id,
      p_metadata: { source: "admin" },
    });
  }

  await supabaseAdmin
    .from("point_orders")
    .update({
      status: nextStatus,
      failure_reason: body?.failureReason ?? order.failure_reason,
    })
    .eq("id", orderId);

  return NextResponse.json({ success: true });
}
