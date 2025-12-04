import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { env } from "@/lib/env";

const getServerCookiesAdapter = () => {
  const cookieStore = cookies();
  return {
    getAll() {
      return cookieStore.getAll().map(({ name, value }) => ({ name, value }));
    },
  };
};

export const createSupabaseServerClient = () =>
  createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: getServerCookiesAdapter(),
  });
