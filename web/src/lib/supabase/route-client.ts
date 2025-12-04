import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { env } from "@/lib/env";

type CookieStore = ReturnType<typeof cookies>;

const adaptRouteCookies = (cookieStore: CookieStore) => {
  const base = {
    getAll() {
      return cookieStore.getAll().map(({ name, value }) => ({ name, value }));
    },
  };

  const store = cookieStore as unknown as {
    set?: (options: { name: string; value: string } & Record<string, unknown>) => void;
  };

  if (typeof store.set === "function") {
    return {
      ...base,
      setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          store.set?.({ name, value, ...options });
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
