import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import type { EmailOtpType } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { NEXT_COOKIE, readNextCookie } from "@/lib/auth/next-path";

/**
 * 確認メール・再設定メールのリンクの戻り先。
 *
 * 受け付ける形は2つ。
 * 1. `?token_hash=…&type=signup|recovery|email|email_change`（推奨）
 *    メールのテンプレートを `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=…`
 *    にした場合。**別のブラウザ（メールアプリの中など）で開いても通る。**
 * 2. `?code=…`（Supabase の既定テンプレートのまま）
 *    PKCE の検証用の値が登録した画面と同じブラウザにしか無いので、
 *    別のブラウザで開くと失敗する。テンプレートを1に変えるまでの互換として残す。
 *
 * 再設定（type=recovery）は、新しいパスワードを決める画面へ送る。
 * 失敗はすべて /login?error=<キー> に戻す（文言は lib/auth/messages.ts）。
 */

const OTP_TYPES: EmailOtpType[] = ["signup", "recovery", "invite", "magiclink", "email", "email_change"];

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const params = requestUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const code = params.get("code");
  const rawType = params.get("type");
  const type = OTP_TYPES.find((value) => value === rawType) ?? null;
  const providerError = params.get("error");

  const cookieStore = await cookies();
  const next = readNextCookie(cookieStore.get(NEXT_COOKIE)?.value);

  const fail = (key: string) => {
    const target = new URL("/login", requestUrl);
    target.searchParams.set("error", key);
    if (type !== "recovery") target.searchParams.set("mode", "login");
    return NextResponse.redirect(target);
  };

  if (providerError) {
    // 期限切れ・使用済みのリンクは Supabase がここへ error 付きで戻してくる
    console.warn("[Auth Callback] error from auth server", {
      error: providerError,
      code: params.get("error_code"),
    });
    return fail("link_invalid");
  }

  try {
    const supabase = createSupabaseRouteClient(cookieStore);

    if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      if (error) {
        console.warn("[Auth Callback] verifyOtp failed", { type, message: error.message });
        return fail("link_invalid");
      }
    } else if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.warn("[Auth Callback] exchangeCodeForSession failed", { message: error.message });
        return fail("link_invalid");
      }
    } else {
      return fail("no_code");
    }

    const destination = type === "recovery" ? "/login/update-password" : next;
    const response = NextResponse.redirect(new URL(destination, requestUrl));
    // 再設定の画面は、保存したあとにこの行き先を使うので残しておく
    if (type !== "recovery") response.cookies.delete(NEXT_COOKIE);
    return response;
  } catch (error) {
    console.error("[Auth Callback] Unexpected error", error);
    return fail("unexpected");
  }
}
