import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/admin/check-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const parseNumber = (value: string | null, fallback: number, opts?: { min?: number; max?: number }) => {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  if (opts?.min && parsed < opts.min) return opts.min;
  if (opts?.max && parsed > opts.max) return opts.max;
  return parsed;
};

export async function GET(request: Request) {
  const adminUser = await requireAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim() ?? "";
  const gender = url.searchParams.get("gender") ?? "all";
  const status = url.searchParams.get("status") ?? "active";
  const diagnosisStatus = url.searchParams.get("diagnosisStatus") ?? "all";
  const sort = url.searchParams.get("sort") ?? "recent";
  const page = parseNumber(url.searchParams.get("page"), 1, { min: 1 });
  const limit = parseNumber(url.searchParams.get("limit"), 20, { min: 5, max: 50 });
  const offset = (page - 1) * limit;

  let overviewQuery = supabaseAdmin
    .from("admin_user_overview")
    .select("*", { count: "exact" })
    .range(offset, offset + limit - 1);

  if (gender !== "all") {
    overviewQuery = overviewQuery.eq("user_gender", gender);
  }

  if (status === "active") {
    overviewQuery = overviewQuery.eq("is_blocked", false).eq("is_deleted", false);
  } else if (status === "blocked") {
    overviewQuery = overviewQuery.eq("is_blocked", true);
  } else if (status === "deleted") {
    overviewQuery = overviewQuery.eq("is_deleted", true);
  }

  if (diagnosisStatus === "diagnosed") {
    overviewQuery = overviewQuery.not("diagnosis_type_id", "is", null);
  } else if (diagnosisStatus === "undiagnosed") {
    overviewQuery = overviewQuery.is("diagnosis_type_id", null);
  }

  if (search) {
    const sanitized = search.replace(/%/g, "\u0025").replace(/,/g, " ");
    overviewQuery = overviewQuery.or(
      `full_name.ilike.%${sanitized}%,nickname.ilike.%${sanitized}%,city.ilike.%${sanitized}%,line_user_id.ilike.%${sanitized}%`
    );
  }

  if (sort === "oldest") {
    overviewQuery = overviewQuery.order("user_created_at", { ascending: true });
  } else if (sort === "activity") {
    overviewQuery = overviewQuery.order("profile_updated_at", { ascending: false });
  } else {
    overviewQuery = overviewQuery.order("user_created_at", { ascending: false });
  }

  const { data: rows, count, error } = await overviewQuery;

  if (error) {
    console.error("Failed to load admin users", error);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }

  const userIds = rows?.map((row) => row.user_id).filter(Boolean) as string[];

  let diagnosisRows: { user_id: string; created_at: string; diagnosis_type: string }[] = [];
  let featuredRows: { user_id: string; target_gender: string; start_at: string; end_at: string; active: boolean }[] = [];

  if (userIds.length > 0) {
    const [diagnosisRes, featuredRes] = await Promise.all([
      supabaseAdmin
        .from("diagnosis_results")
        .select("user_id, created_at, diagnosis_type")
        .in("user_id", userIds),
      supabaseAdmin
        .from("featured_users")
        .select("user_id, target_gender, start_at, end_at, active")
        .in("user_id", userIds),
    ]);

    diagnosisRows = diagnosisRes.data ?? [];
    featuredRows = featuredRes.data ?? [];
  }

  const diagnosisMap = new Map<
    string,
    { totalDiagnoses: number; lastDiagnosisAt: string | null; lastDiagnosisType: string | null }
  >();

  diagnosisRows.forEach((row) => {
    const existing = diagnosisMap.get(row.user_id) ?? {
      totalDiagnoses: 0,
      lastDiagnosisAt: null as string | null,
      lastDiagnosisType: null as string | null,
    };
    existing.totalDiagnoses += 1;
    if (!existing.lastDiagnosisAt || new Date(row.created_at) > new Date(existing.lastDiagnosisAt)) {
      existing.lastDiagnosisAt = row.created_at;
      existing.lastDiagnosisType = row.diagnosis_type;
    }
    diagnosisMap.set(row.user_id, existing);
  });

  const featuredMap = new Map<
    string,
    { targetGender: string; startAt: string; endAt: string; isActive: boolean }
  >();
  const now = Date.now();
  featuredRows.forEach((row) => {
    const isActive = Boolean(row.active) && Date.parse(row.start_at) <= now && Date.parse(row.end_at) >= now;
    const existing = featuredMap.get(row.user_id);
    if (!existing || Date.parse(row.end_at) > Date.parse(existing.endAt)) {
      featuredMap.set(row.user_id, {
        targetGender: row.target_gender,
        startAt: row.start_at,
        endAt: row.end_at,
        isActive,
      });
    }
  });

  const users = (rows ?? []).map((row) => {
    const notifSettings = (row.notification_settings as Record<string, unknown>) || {};
    const socialLinks = (row.social_links as Record<string, unknown>) || {};
    const details = (row.details as Record<string, unknown>) || {};
    const stats = diagnosisMap.get(row.user_id) ?? {
      totalDiagnoses: 0,
      lastDiagnosisAt: null,
      lastDiagnosisType: null,
    };
    const featured = featuredMap.get(row.user_id) || null;

    return {
      id: row.user_id,
      fullName: row.full_name,
      nickname: row.nickname,
      gender: row.profile_gender || row.user_gender,
      city: row.city,
      job: row.job,
      age: row.age,
      avatarUrl: row.avatar_url,
      isPublic: row.is_public,
      diagnosisTypeId: row.diagnosis_type_id,
      notificationSettings: notifSettings,
      socialLinks,
      details,
      userCreatedAt: row.user_created_at,
      profileUpdatedAt: row.profile_updated_at,
      status: row.is_deleted ? "deleted" : row.is_blocked ? "blocked" : "active",
      isBlocked: row.is_blocked,
      blockedReason: row.blocked_reason,
      blockedAt: row.blocked_at,
      isDeleted: row.is_deleted,
      deletedAt: row.deleted_at,
      adminNotes: row.admin_notes,
      lineUserId: row.line_user_id,
      isMock: row.is_mock_data,
      stats,
      featured,
    };
  });

  const [totalRes, blockedRes, deletedRes, newWeekRes] = await Promise.all([
    supabaseAdmin.from("users").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("users").select("id", { count: "exact", head: true }).eq("is_blocked", true),
    supabaseAdmin.from("users").select("id", { count: "exact", head: true }).eq("is_deleted", true),
    supabaseAdmin
      .from("users")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const metrics = {
    totalUsers: totalRes.count ?? 0,
    blockedUsers: blockedRes.count ?? 0,
    deletedUsers: deletedRes.count ?? 0,
    newThisWeek: newWeekRes.count ?? 0,
  };

  return NextResponse.json({
    users,
    meta: {
      total: count ?? 0,
      page,
      limit,
      totalPages: count ? Math.ceil(count / limit) : 1,
    },
    metrics,
  });
}
