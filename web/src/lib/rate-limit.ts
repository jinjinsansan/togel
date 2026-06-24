import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type RateLimitResult = { allowed: boolean };

/**
 * DB バックエンドのアトミックなレート制限。
 * サーバーレスの複数インスタンス間でも共有される。
 *
 * @param bucket  種別（例: "michelle-chat"）
 * @param id      ユーザーIDなどの識別子
 * @param max     ウィンドウ内の最大リクエスト数
 * @param windowSeconds ウィンドウ秒数
 * @returns allowed=false なら上限超過。判定に失敗した場合は allowed=true（フェイルオープン: 機能停止を避ける）
 */
export async function enforceRateLimit(
  bucket: string,
  id: string,
  max: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.rpc("check_and_increment_rate_limit", {
      p_key: `${bucket}:${id}`,
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      console.warn("[rate-limit] check failed, allowing", error.message);
      return { allowed: true };
    }
    return { allowed: data !== false };
  } catch (err) {
    console.warn("[rate-limit] unexpected error, allowing", err);
    return { allowed: true };
  }
}
