import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";

const ALLOWED_ADMIN_EMAILS = [
  "goldbenchan@gmail.com",
  "kusanokiyoshi1@gmail.com",
];

export const requireAdminUser = async (): Promise<User | null> => {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user?.email) return null;
  if (!ALLOWED_ADMIN_EMAILS.includes(session.user.email)) return null;
  return session.user;
};
