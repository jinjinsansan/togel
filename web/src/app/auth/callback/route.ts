import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  console.log("[Auth Callback] Start", {
    hasCode: !!code,
    origin,
    userAgent: request.headers.get("user-agent"),
  });

  if (!code) {
    console.error("[Auth Callback] No code provided");
    return NextResponse.redirect(new URL("/?error=no_code", requestUrl));
  }

  try {
    const cookieStore = cookies();
    const supabase = createSupabaseRouteClient(cookieStore);

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    console.log("[Auth Callback] Exchange result", {
      hasSession: !!data.session,
      hasUser: !!data.user,
      userId: data.user?.id,
      error: error ? {
        message: error.message,
        status: error.status,
        name: error.name,
      } : null,
    });

    if (error) {
      console.error("[Auth Callback] Failed to exchange code", {
        error,
        message: error.message,
        status: error.status,
        code: error.code,
      });
      return NextResponse.redirect(new URL(`/?error=auth_failed&details=${encodeURIComponent(error.message)}`, requestUrl));
    }

    if (!data.session) {
      console.error("[Auth Callback] No session after exchange");
      return NextResponse.redirect(new URL("/?error=no_session", requestUrl));
    }

    // セッション確認
    const {
      data: { session: verifySession },
    } = await supabase.auth.getSession();

    console.log("[Auth Callback] Session verification", {
      hasSession: !!verifySession,
      sessionId: verifySession?.user.id,
    });

    if (!verifySession) {
      console.error("[Auth Callback] Session verification failed");
      return NextResponse.redirect(new URL("/?error=session_verify_failed", requestUrl));
    }

    console.log("[Auth Callback] Success, redirecting to /diagnosis/select");
    return NextResponse.redirect(new URL("/diagnosis/select", requestUrl));
  } catch (error) {
    console.error("[Auth Callback] Unexpected error", error);
    return NextResponse.redirect(new URL("/?error=unexpected", requestUrl));
  }
}
