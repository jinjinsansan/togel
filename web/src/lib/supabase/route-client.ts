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
          writableStore.set?.(name, value, options);
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
