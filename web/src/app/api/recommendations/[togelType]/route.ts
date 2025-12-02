import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

const supabaseClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: { persistSession: false, detectSessionInUrl: false },
});

type PublicRecommendationRow = {
  id: string;
  reason: string;
  match_percentage: number | null;
  display_order: number;
  service?: Record<string, unknown> | null;
};

const serialize = (row: PublicRecommendationRow) => ({
  id: row.id,
  reason: row.reason,
  matchPercentage: row.match_percentage,
  displayOrder: row.display_order,
  service: row.service
    ? {
        id: String(row.service.id ?? ""),
        name: String(row.service.name ?? ""),
        description: String(row.service.description ?? ""),
        imageUrl: (row.service.image_url as string | null | undefined) ?? null,
        linkUrl: String(row.service.link_url ?? ""),
        buttonText: (row.service.button_text as string | null | undefined) ?? null,
      }
    : null,
});

export async function GET(request: Request, { params }: { params: { togelType: string } }) {
  const url = new URL(request.url);
  const page = url.searchParams.get("page") === "mypage" ? "mypage" : "result";
  const showColumn = page === "mypage" ? "show_on_mypage" : "show_on_result_page";

  const { data, error } = await supabaseClient
    .from("togel_recommendations")
    .select(
      `id,reason,match_percentage,display_order,service:services(id,name,description,image_url,link_url,button_text)`
    )
    .eq("togel_type_id", params.togelType)
    .eq("is_active", true)
    .eq(showColumn, true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) {
    console.error("Failed to load recommendations", error);
    return NextResponse.json({ recommendations: [] }, { status: 500 });
  }

  const recommendations = ((data ?? []) as unknown as PublicRecommendationRow[])
    .map(serialize)
    .filter((rec) => rec.service !== null)
    .map((rec) => ({
      id: rec.id,
      reason: rec.reason,
      matchPercentage: rec.matchPercentage,
      displayOrder: rec.displayOrder,
      service: rec.service,
    }));

  return new Response(JSON.stringify({ recommendations }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
