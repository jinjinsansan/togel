import type { SupabaseClient, User } from "@supabase/supabase-js";

export class SupabaseAuthUnavailableError extends Error {
  public readonly context: string;

  public readonly originalError: unknown;

  constructor(context: string, originalError: unknown) {
    super(`Supabase auth unavailable: ${context}`);
    this.name = "SupabaseAuthUnavailableError";
    this.context = context;
    this.originalError = originalError;
  }
}

export const getRouteUser = async <Database>(
  supabase: SupabaseClient<Database>,
  context: string,
) => {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.warn(`[${context}] Supabase auth warning`, error);
    }
    return data.user;
  } catch (error) {
    console.error(`[${context}] Supabase auth request failed`, error);
    throw new SupabaseAuthUnavailableError(context, error);
  }
};

/**
 * 本人確認済みのユーザーを `{ user }` の形で返す（未ログイン・検証失敗なら null）。
 *
 * 🔴 API ルートで `auth.getSession()` を本人確認に使わないこと。getSession は cookie の JSON を
 * そのまま返すだけで、JWT の署名を検証しない。cookie を自分で書けば誰にでもなりすませる。
 * そこから service-role（RLS を素通りする）で読み書きすると、他人のデータに届く。
 * `getUser()` は Auth サーバーで JWT を検証する。
 *
 * 既存のルートが `session.user.id` の形で書かれているので、同じ形で返す。
 */
export const getVerifiedSession = async <Database>(
  supabase: SupabaseClient<Database>,
): Promise<{ user: User } | null> => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { user };
};
