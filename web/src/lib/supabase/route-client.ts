import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { env } from "@/lib/env";

type CookieStore = ReturnType<typeof cookies>;

type WritableRequestCookies = CookieStore & {
  set?: (name: string, value: string, options?: Record<string, unknown>) => void;
};

const adaptRouteCookies = (cookieStore: CookieStore) => {
  const base = {
    getAll() {
      return cookieStore.getAll().map(({ name, value }) => ({ name, value }));
    },
  };

  const writableStore = cookieStore as WritableRequestCookies;

  if (typeof writableStore.set === "function") {
    return {
      ...base,
      setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          // iOS Safari互換性のため、Cookie設定を明示的に指定
          const cookieOptions = {
            ...options,
            path: options.path || "/",
            sameSite: (options.sameSite as "lax" | "strict" | "none" | undefined) || "lax",
            secure: process.env.NODE_ENV === "production",
            httpOnly: options.httpOnly !== false,
            maxAge: options.maxAge || 60 * 60 * 24 * 7, // 7 days default
          };
          
          console.log("[Cookie Set]", { 
            name, 
            hasValue: !!value,
            options: cookieOptions 
          });
          
          writableStore.set?.(name, value, cookieOptions);
        });
      },
    };
  }

  return base;
};

export const createSupabaseRouteClient = <Database = unknown>(cookieStore: CookieStore = cookies()) =>
  createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: adaptRouteCookies(cookieStore),
  });
