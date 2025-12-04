import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import type { NextRequest } from "next/server";
import { env } from "@/lib/env";

const createSupabaseMiddlewareClient = (req: NextRequest, res: NextResponse) =>
  createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll().map(({ name, value }) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          req.cookies.set(name, value);
          res.cookies.set({ name, value, ...options });
        });
      },
    },
  });

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createSupabaseMiddlewareClient(req, res);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protected routes
  const protectedRoutes = ["/mypage", "/admin"];
  const isProtectedRoute = protectedRoutes.some((route) =>
    req.nextUrl.pathname.startsWith(route)
  );

  // If accessing a protected route without a session, redirect to login (or home)
  if (isProtectedRoute && !session) {
    const redirectUrl = new URL("/", req.url);
    // redirectUrl.searchParams.set("login", "true"); // Optional: open login modal
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
