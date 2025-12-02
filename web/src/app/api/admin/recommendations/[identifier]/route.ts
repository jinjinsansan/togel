import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/admin/check-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import {
  hasValidDateRange,
  recommendationSelect,
  recommendationUpdateSchema,
  serializeRecommendation,
  toIsoString,
  type RecommendationRow,
} from "../helpers";

export async function GET(_: Request, { params }: { params: { identifier: string } }) {
  const adminUser = await requireAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const togelTypeId = decodeURIComponent(params.identifier);
  const { data, error } = await supabaseAdmin
    .from("togel_recommendations")
    .select(recommendationSelect)
    .eq("togel_type_id", togelTypeId)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Failed to load recommendations for type", togelTypeId, error);
    return NextResponse.json({ error: "Failed to load recommendations" }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as RecommendationRow[];
  return NextResponse.json({ recommendations: rows.map(serializeRecommendation) });
}

export async function PUT(request: Request, { params }: { params: { identifier: string } }) {
  const adminUser = await requireAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payloadResult = recommendationUpdateSchema.safeParse(await request.json());
  if (!payloadResult.success) {
    return NextResponse.json({ error: payloadResult.error.flatten() }, { status: 400 });
  }

  const payload = payloadResult.data;
  if (!hasValidDateRange(payload.startDate, payload.endDate)) {
    return NextResponse.json({ error: "終了日時は開始日時より後に設定してください" }, { status: 400 });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const updateValues = {
    ...(payload.togelTypeId !== undefined ? { togel_type_id: payload.togelTypeId } : {}),
    ...(payload.serviceId !== undefined ? { service_id: payload.serviceId } : {}),
    ...(payload.reason !== undefined ? { reason: payload.reason } : {}),
    ...(payload.matchPercentage !== undefined ? { match_percentage: payload.matchPercentage } : {}),
    ...(payload.displayOrder !== undefined ? { display_order: payload.displayOrder } : {}),
    ...(payload.showOnResultPage !== undefined ? { show_on_result_page: payload.showOnResultPage } : {}),
    ...(payload.showOnMypage !== undefined ? { show_on_mypage: payload.showOnMypage } : {}),
    ...(payload.isActive !== undefined ? { is_active: payload.isActive } : {}),
    ...(payload.startDate !== undefined ? { start_date: toIsoString(payload.startDate) } : {}),
    ...(payload.endDate !== undefined ? { end_date: toIsoString(payload.endDate) } : {}),
  };

  const { data, error } = await supabaseAdmin
    .from("togel_recommendations")
    .update(updateValues)
    .eq("id", params.identifier)
    .select(recommendationSelect)
    .maybeSingle();

  if (error) {
    console.error("Failed to update recommendation", error);
    return NextResponse.json({ error: "Failed to update recommendation" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Recommendation not found" }, { status: 404 });
  }

  return NextResponse.json({ recommendation: serializeRecommendation(data as unknown as RecommendationRow) });
}

export async function DELETE(_: Request, { params }: { params: { identifier: string } }) {
  const adminUser = await requireAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { error } = await supabaseAdmin.from("togel_recommendations").delete().eq("id", params.identifier);

  if (error) {
    console.error("Failed to delete recommendation", error);
    return NextResponse.json({ error: "Failed to delete recommendation" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
