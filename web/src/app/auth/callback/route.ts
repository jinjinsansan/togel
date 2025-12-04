import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const cookieStore = cookies();
    const supabase = createSupabaseRouteClient(cookieStore);
    await supabase.auth.exchangeCodeForSession(code);
  }

  // ログイン後は診断ページへリダイレクト
  return NextResponse.redirect(new URL("/diagnosis/select", request.url));
}
