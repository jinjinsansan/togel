import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createCheckoutPreference, getOneLatConfig } from "@/lib/one-lat";
import { getAppBaseUrl } from "@/lib/url";

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore });
  const {
    data: { session },
  } = await supabaseAuth.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const packageId: string | undefined = body?.packageId;

  if (!packageId) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: packageRow, error: packageError } = await supabaseAdmin
    .from("point_packages")
    .select("id, name, description, amount_usd, currency, points, bonus_points")
    .eq("id", packageId)
    .eq("is_active", true)
    .maybeSingle();

  if (packageError || !packageRow) {
    return NextResponse.json({ error: "指定されたポイントパックが見つかりません" }, { status: 404 });
  }

  const orderId = crypto.randomUUID();

  const baseInsert = await supabaseAdmin
    .from("point_orders")
    .insert({
      id: orderId,
      user_id: session.user.id,
      package_id: packageRow.id,
      amount: Number(packageRow.amount_usd),
      currency: packageRow.currency,
      points: Number(packageRow.points) + Number(packageRow.bonus_points ?? 0),
      status: "pending",
      metadata: {
        packageName: packageRow.name,
        bonusPoints: packageRow.bonus_points ?? 0,
      },
    })
    .select("id")
    .single();

  if (baseInsert.error) {
    console.error("Failed to create point order", baseInsert.error);
    return NextResponse.json({ error: "注文の作成に失敗しました" }, { status: 500 });
  }

  const baseUrl = getAppBaseUrl(request);
  const { webhookSecret } = getOneLatConfig();

  try {
    const checkout = await createCheckoutPreference({
      type: "PAYMENT",
      amount: Number(packageRow.amount_usd),
      currency: packageRow.currency,
      title: `Togelポイント - ${packageRow.name}`,
      external_id: orderId,
      custom_urls: {
        status_changes_webhook: webhookSecret
          ? `${baseUrl}/api/webhooks/one-lat?token=${encodeURIComponent(webhookSecret)}`
          : `${baseUrl}/api/webhooks/one-lat`,
        success_payment_redirect: `${baseUrl}/points?checkout=success&order=${orderId}`,
        error_payment_redirect: `${baseUrl}/points?checkout=error&order=${orderId}`,
      },
    });

    const updateRes = await supabaseAdmin
      .from("point_orders")
      .update({
        checkout_preference_id: checkout.id,
        checkout_url: checkout.checkout_url,
        status: "opened",
      })
      .eq("id", orderId);

    if (updateRes.error) {
      throw updateRes.error;
    }

    return NextResponse.json({ orderId, checkoutUrl: checkout.checkout_url });
  } catch (error) {
    console.error("Failed to create One.lat checkout", error);
    await supabaseAdmin.from("point_orders").update({ status: "rejected", failure_reason: "checkout_creation_failed" }).eq("id", orderId);
    return NextResponse.json({ error: "決済の初期化に失敗しました" }, { status: 502 });
  }
}
