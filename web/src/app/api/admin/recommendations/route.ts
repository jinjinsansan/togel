import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/admin/check-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import {
  hasValidDateRange,
  recommendationCreateSchema,
  recommendationSelect,
  serializeRecommendation,
  toIsoString,
  type RecommendationRow,
} from "./helpers";

export async function GET(request: Request) {
  const adminUser = await requireAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const url = new URL(request.url);
  const togelType = url.searchParams.get("togelType")?.trim();
  const status = url.searchParams.get("status") ?? "all";
  const page = Math.max(Number(url.searchParams.get("page")) || 1, 1);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 20, 1), 100);
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from("togel_recommendations")
    .select(recommendationSelect, { count: "exact" })
    .order("display_order", { ascending: true })
    .range(offset, offset + limit - 1);

  if (togelType) {
    query = query.eq("togel_type_id", togelType);
  }

  if (status === "active") {
    query = query.eq("is_active", true);
  } else if (status === "inactive") {
    query = query.eq("is_active", false);
  }

  const { data, error, count } = await query;
  if (error) {
    console.error("Failed to load recommendations", error);
    return NextResponse.json({ error: "Failed to load recommendations" }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as RecommendationRow[];

  return NextResponse.json({
    recommendations: rows.map(serializeRecommendation),
    meta: {
      total: count ?? 0,
      page,
      limit,
      totalPages: count ? Math.ceil(count / limit) : 1,
    },
  });
}

export async function POST(request: Request) {
  const adminUser = await requireAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payloadResult = recommendationCreateSchema.safeParse(await request.json());
  if (!payloadResult.success) {
    return NextResponse.json({ error: payloadResult.error.flatten() }, { status: 400 });
  }

  const payload = payloadResult.data;
  if (!hasValidDateRange(payload.startDate, payload.endDate)) {
    return NextResponse.json({ error: "終了日時は開始日時より後に設定してください" }, { status: 400 });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const insertValues = {
    togel_type_id: payload.togelTypeId,
    service_id: payload.serviceId,
    reason: payload.reason,
    match_percentage: payload.matchPercentage ?? null,
    display_order: payload.displayOrder ?? 0,
    show_on_result_page: payload.showOnResultPage ?? true,
    show_on_mypage: payload.showOnMypage ?? true,
    is_active: payload.isActive ?? true,
    start_date: toIsoString(payload.startDate),
    end_date: toIsoString(payload.endDate),
  };

  const { data, error } = await supabaseAdmin
    .from("togel_recommendations")
    .insert(insertValues)
    .select(recommendationSelect)
    .single();

  if (error) {
    console.error("Failed to create recommendation", error);
    return NextResponse.json({ error: "Failed to create recommendation" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Failed to create recommendation" }, { status: 500 });
  }

  return NextResponse.json({ recommendation: serializeRecommendation(data as unknown as RecommendationRow) }, { status: 201 });
}
