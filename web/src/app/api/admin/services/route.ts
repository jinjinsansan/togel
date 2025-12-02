import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminUser } from "@/lib/admin/check-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const servicePayloadSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().min(1),
  imageUrl: z.string().url().optional().nullable(),
  linkUrl: z.string().url(),
  category: z.string().max(80).optional().nullable(),
  buttonText: z.string().min(1).max(40).optional().default("詳しく見る"),
  isActive: z.boolean().optional().default(true),
});

export type ServiceRow = {
  id: string;
  name: string;
  description: string;
  image_url?: string | null;
  link_url: string;
  category?: string | null;
  button_text?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

const serializeService = (row: ServiceRow) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  imageUrl: row.image_url,
  linkUrl: row.link_url,
  category: row.category,
  buttonText: row.button_text,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const sanitizeSearch = (value: string) => value.replace(/%/g, "\u0025").replace(/,/g, " ");

export async function GET(request: Request) {
  const adminUser = await requireAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim() ?? "";
  const status = url.searchParams.get("status") ?? "all";
  const category = url.searchParams.get("category")?.trim() ?? "";

  let query = supabaseAdmin
    .from("services")
    .select("id,name,description,image_url,link_url,category,button_text,is_active,created_at,updated_at")
    .order("updated_at", { ascending: false });

  if (status === "active") {
    query = query.eq("is_active", true);
  } else if (status === "inactive") {
    query = query.eq("is_active", false);
  }

  if (category) {
    query = query.eq("category", category);
  }

  if (search) {
    const sanitized = sanitizeSearch(search);
    query = query.or(
      `name.ilike.%${sanitized}%,description.ilike.%${sanitized}%,category.ilike.%${sanitized}%`
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error("Failed to load services", error);
    return NextResponse.json({ error: "Failed to load services" }, { status: 500 });
  }

  const rows = (data ?? []) as ServiceRow[];
  return NextResponse.json({ services: rows.map(serializeService) });
}

export async function POST(request: Request) {
  const adminUser = await requireAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json();
  const parsed = servicePayloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;
  const supabaseAdmin = createSupabaseAdminClient();
  const insertPayload = {
    name: payload.name,
    description: payload.description,
    image_url: payload.imageUrl ?? null,
    link_url: payload.linkUrl,
    category: payload.category ?? null,
    button_text: payload.buttonText ?? "詳しく見る",
    is_active: payload.isActive ?? true,
  };

  const { data, error } = await supabaseAdmin
    .from("services")
    .insert(insertPayload)
    .select("id,name,description,image_url,link_url,category,button_text,is_active,created_at,updated_at")
    .single();

  if (error) {
    console.error("Failed to create service", error);
    return NextResponse.json({ error: "Failed to create service" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Failed to create service" }, { status: 500 });
  }

  return NextResponse.json({ service: serializeService(data as ServiceRow) }, { status: 201 });
}
