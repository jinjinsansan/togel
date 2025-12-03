import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPaymentOrder, verifyWebhookSecret } from "@/lib/one-lat";

type OneLatWebhookPayload = {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
};

const STATUS_MAP: Record<string, string> = {
  OPENED: "opened",
  CLOSED: "closed",
  REJECTED: "rejected",
  EXPIRED: "expired",
  REFUNDED: "refunded",
};

export async function POST(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? request.headers.get("x-one-lat-token") ?? request.headers.get("x-webhook-token");

  if (!verifyWebhookSecret(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as OneLatWebhookPayload | null;

  if (!body?.id || !body.entity_id) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const supabaseAdmin = createSupabaseAdminClient();

  let insertLog: { data: { id: string } | null } | null = null;
  try {
    insertLog = await supabaseAdmin
      .from("point_webhook_events")
      .insert({
        event_id: body.id,
        event_type: body.event_type,
        entity_type: body.entity_type,
        entity_id: body.entity_id,
        payload: body,
      })
      .select("id")
      .single();
  } catch (error) {
    const message = (error as Error).message ?? "";
    if (!message.includes("duplicate")) {
      console.error("Failed to log webhook", error);
    }
  }

  if (body.entity_type !== "PAYMENT_ORDER") {
    return NextResponse.json({ ok: true, logged: Boolean(insertLog?.data) });
  }

  try {
    const paymentOrder = await getPaymentOrder(body.entity_id);
    const mappedStatus = STATUS_MAP[paymentOrder.status] ?? "pending";

    const { data: orderRowByPayment } = await supabaseAdmin
      .from("point_orders")
      .select("*")
      .eq("payment_order_id", paymentOrder.id)
      .maybeSingle();

    let orderRow = orderRowByPayment;

    if (!orderRow && paymentOrder.external_id) {
      const { data: byExternal } = await supabaseAdmin
        .from("point_orders")
        .select("*")
        .eq("id", paymentOrder.external_id)
        .maybeSingle();
      orderRow = byExternal || null;
    }

    if (!orderRow) {
      console.error("Webhook: related point order not found", paymentOrder.id);
      return NextResponse.json({ error: "Order not found" }, { status: 202 });
    }

    const metadata = {
      ...(orderRow.metadata ?? {}),
      paymentMethod: paymentOrder.payment_method_type,
    };

    const updateRes = await supabaseAdmin
      .from("point_orders")
      .update({
        status: mappedStatus,
        payment_order_id: paymentOrder.id,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        metadata,
        webhook_synced_at: new Date().toISOString(),
      })
      .eq("id", orderRow.id);

    if (updateRes.error) {
      throw updateRes.error;
    }

    const { data: existingTransactions } = await supabaseAdmin
      .from("point_transactions")
      .select("id, reason, transaction_type")
      .eq("order_id", orderRow.id);

    const hasPurchaseCredit = existingTransactions?.some((tx) => tx.reason === "purchase" && tx.transaction_type === "credit");
    const hasRefundDebit = existingTransactions?.some((tx) => tx.reason === "refund" && tx.transaction_type === "debit");

    if (mappedStatus === "closed" && !hasPurchaseCredit) {
      await supabaseAdmin.rpc("apply_point_transaction", {
        p_user_id: orderRow.user_id,
        p_points: orderRow.points,
        p_type: "credit",
        p_reason: "purchase",
        p_order_id: orderRow.id,
        p_metadata: { source: "one.lat", payment_order_id: paymentOrder.id },
      });
    }

    if (mappedStatus === "refunded" && !hasRefundDebit) {
      await supabaseAdmin.rpc("apply_point_transaction", {
        p_user_id: orderRow.user_id,
        p_points: orderRow.points,
        p_type: "debit",
        p_reason: "refund",
        p_order_id: orderRow.id,
        p_metadata: { source: "one.lat", payment_order_id: paymentOrder.id },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to process One.lat webhook", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
