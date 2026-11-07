import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import type { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { loginUrlFor, NEXT_PARAM, safeNextPath } from "@/lib/auth/next-path";

const createSupabaseMiddlewareClient = (req: NextRequest, res: NextResponse) =>
  createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll().map(({ name, value }) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          // iOS Safari互換性のため、Cookie設定を明示的に指定
          const cookieOptions = {
            ...options,
            path: options?.path || "/",
            sameSite: (options?.sameSite as "lax" | "strict" | "none" | undefined) || "lax",
            secure: process.env.NODE_ENV === "production",
            httpOnly: options?.httpOnly !== false,
            maxAge: options?.maxAge ?? 60 * 60 * 24 * 7, // 7 days default（0 は削除の指示なので残す）
          };

          req.cookies.set(name, value);
          res.cookies.set({ name, value, ...cookieOptions });
        });
      },
    },
  });

export async function proxy(req: NextRequest) {
  /**
   * 開発用プレビュー（`/dev/*`）は、環境変数を立てたときだけ出す。
   *
   * ページ側でも `notFound()` を呼んでいるが、**あれは404にならない**。
   * `force-dynamic` のページでストリーミングが始まったあとに呼ばれるので、
   * 本文は404ページでも**ステータスは200**で返る。本番で実際にそうなっていた。
   * 中身は出ていなかったが、200は「有効なページ」として登録され得る。
   *
   * ここならレンダリング前に判定できるので、本物の404を返せる。
   * Supabase を呼ぶ前に返すこと（無駄な認証確認をしない）。
   */
  if (req.nextUrl.pathname.startsWith("/dev") && process.env.TOGEL_DEV_PREVIEW !== "1") {
    return new NextResponse(null, { status: 404 });
  }

  const res = NextResponse.next();
  const supabase = createSupabaseMiddlewareClient(req, res);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // ログイン済みで /login を開いたら、行き先へそのまま進める（フォームを出しても意味がない）。
  // /login/update-password は再設定のセッションで開く画面なので対象外
  if (req.nextUrl.pathname === "/login" && session) {
    const next = safeNextPath(req.nextUrl.searchParams.get(NEXT_PARAM));
    return NextResponse.redirect(new URL(next, req.url));
  }

  // Protected routes
  const protectedRoutes = ["/mypage", "/admin", "/michelle", "/diagnosis", "/profile", "/result"];
  const isProtectedRoute = protectedRoutes.some((route) =>
    req.nextUrl.pathname.startsWith(route)
  );

  // If accessing a protected route without a session, redirect to login (or home)
  if (isProtectedRoute && !session) {
    // 行き先を持たせる。ログイン後に別の場所へ落とすと、何をしに来たのか分からなくなる
    const redirectUrl = loginUrlFor(
      `${req.nextUrl.pathname}${req.nextUrl.search}`,
      req.url,
    );
    return NextResponse.redirect(redirectUrl);
  }

  // Admin route protection (simple email check for now)
  if (req.nextUrl.pathname.startsWith("/admin")) {
    const userEmail = session?.user.email;
    // Allow only specific emails
    const allowedAdminEmails = ["goldbenchan@gmail.com", "kusanokiyoshi1@gmail.com"];
    
    if (!userEmail || !allowedAdminEmails.includes(userEmail)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // Referral code handling
  const referralCode = req.nextUrl.searchParams.get("c");
  if (referralCode) {
    // If referral code exists in URL parameters, save it to cookie
    // Valid for 30 days
    res.cookies.set("ref_code", referralCode, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
      sameSite: "lax",
    });
  }

  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
