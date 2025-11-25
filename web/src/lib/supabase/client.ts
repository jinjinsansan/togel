import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

import { env } from "@/lib/env";

export const createSupabaseBrowserClient = () =>
  createClientComponentClient({
    supabaseKey: env.supabaseAnonKey,
    supabaseUrl: env.supabaseUrl,
  });
