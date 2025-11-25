import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

export const createSupabaseAdminClient = () =>
  createClient(env.supabaseUrl, serverEnv.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
