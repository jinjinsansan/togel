import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protected routes
  const protectedRoutes = ["/mypage", "/settings", "/admin"];
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

  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
