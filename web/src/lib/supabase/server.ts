import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

import { env } from "@/lib/env";

export const createSupabaseServerClient = () =>
  createServerComponentClient(
    {
      cookies,
    },
    {
      supabaseKey: env.supabaseAnonKey,
      supabaseUrl: env.supabaseUrl,
    }
  );
