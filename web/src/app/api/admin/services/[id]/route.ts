import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminUser } from "@/lib/admin/check-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ServiceRow } from "../route";

const updateSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    description: z.string().min(1).optional(),
    imageUrl: z.string().url().optional().nullable(),
    linkUrl: z.string().url().optional(),
    category: z.string().max(80).optional().nullable(),
    buttonText: z.string().min(1).max(40).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "更新する項目がありません" });

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

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const adminUser = await requireAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payloadResult = updateSchema.safeParse(await request.json());
  if (!payloadResult.success) {
    return NextResponse.json({ error: payloadResult.error.flatten() }, { status: 400 });
  }

  const updates = payloadResult.data;
  const supabaseAdmin = createSupabaseAdminClient();
  const updateValues = {
    ...(updates.name !== undefined ? { name: updates.name } : {}),
    ...(updates.description !== undefined ? { description: updates.description } : {}),
    ...(updates.imageUrl !== undefined ? { image_url: updates.imageUrl } : {}),
    ...(updates.linkUrl !== undefined ? { link_url: updates.linkUrl } : {}),
    ...(updates.category !== undefined ? { category: updates.category } : {}),
    ...(updates.buttonText !== undefined ? { button_text: updates.buttonText } : {}),
    ...(updates.isActive !== undefined ? { is_active: updates.isActive } : {}),
  };

  const { data, error } = await supabaseAdmin
    .from("services")
    .update(updateValues)
    .eq("id", params.id)
    .select("id,name,description,image_url,link_url,category,button_text,is_active,created_at,updated_at")
    .maybeSingle();

  if (error) {
    console.error("Failed to update service", error);
    return NextResponse.json({ error: "Failed to update service" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  return NextResponse.json({ service: serializeService(data as ServiceRow) });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const adminUser = await requireAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { error } = await supabaseAdmin.from("services").delete().eq("id", params.id);

  if (error) {
    console.error("Failed to delete service", error);
    return NextResponse.json({ error: "Failed to delete service" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
