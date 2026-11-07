import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";

import { createSupabaseRouteClient } from "@/lib/supabase/route-client";

const ALLOWED_ADMIN_EMAILS = [
  "goldbenchan@gmail.com",
  "kusanokiyoshi1@gmail.com",
];

export const requireAdminUser = async (): Promise<User | null> => {
  const cookieStore = await cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  // getUser() は Auth サーバーで JWT を検証する（getSession() はcookieを復号するだけ）
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;
  // メールアドレス＋パスワード登録では、確認前のアカウントでも getUser は返る。
  // 確認していないアドレスで管理者を名乗れないよう、確認済みであることを要求する
  if (!user.email_confirmed_at) return null;
  if (!ALLOWED_ADMIN_EMAILS.includes(user.email)) return null;
  return user;
};
