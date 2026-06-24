import { timingSafeEqual } from "node:crypto";

import { requireAdminUser } from "@/lib/admin/check-admin";

/**
 * 管理者専用 / データ移行系エンドポイントのガード。
 *
 * 次のいずれかを満たせば許可:
 *  - 管理者としてログイン済みのセッション
 *  - リクエストヘッダ `x-internal-secret` が `INTERNAL_API_SECRET` と一致（サーバー間・スクリプト用）
 *
 * フェイルクローズ: `INTERNAL_API_SECRET` 未設定時はヘッダ経由のアクセスを一切認めない。
 *
 * @returns 許可されていれば null、拒否時は 401 を表す理由文字列
 */
export async function denyUnlessInternal(req: Request): Promise<string | null> {
  // 1) 管理者セッション
  const admin = await requireAdminUser();
  if (admin) return null;

  // 2) 内部シークレットヘッダ（フェイルクローズ）
  const configured = process.env.INTERNAL_API_SECRET;
  const provided = req.headers.get("x-internal-secret");
  if (configured && provided && safeEqual(configured, provided)) {
    return null;
  }

  return "Unauthorized";
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
