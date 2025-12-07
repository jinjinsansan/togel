"use client";

import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/lib/env";

export const createSupabaseBrowserClient = () =>
  createBrowserClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
