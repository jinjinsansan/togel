import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { signInviteCode } from "@/lib/invite/code";

/**
 * ログイン中ユーザー自身の招待コード（署名付き）を発行する。
 * 自分のコードしか発行できないため、他人を対象にしたリンクは作れない。
 */
export async function GET() {
  const cookieStore = await cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // public.users.id を取得（招待は public.users.id ベース）
  const admin = createSupabaseAdminClient();
  const { data: row } = await admin
    .from("users")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const userId = row?.id ?? user.id;
  const code = signInviteCode(userId);

  if (!code) {
    // INVITE_SECRET 未設定: 招待機能は無効
    return NextResponse.json({ code: null, enabled: false });
  }

  return NextResponse.json({ code, enabled: true });
}
