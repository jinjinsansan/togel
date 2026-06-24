import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * 招待コード（いたずら機能）の署名付き発行・検証。
 *
 * 旧実装は `btoa(userId)` をそのまま使っており、第三者が任意ユーザーのUUIDを
 * Base64化するだけで「その人を1位に表示＆プロフィール露出」できるIDORだった。
 * ここではサーバー秘密鍵による HMAC 署名を付与し、偽造を防ぐ。
 *
 * フォーマット: `<base64url(userId)>.<base64url(hmac)>`
 * 秘密鍵 (`INVITE_SECRET`) 未設定時は発行・検証ともに無効（フェイルクローズ）。
 */

const b64url = (buf: Buffer) =>
  buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const fromB64url = (s: string) =>
  Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

function sign(userId: string, secret: string): string {
  return b64url(createHmac("sha256", secret).update(userId).digest());
}

/** ログイン中ユーザーの招待コードを発行。秘密鍵未設定なら null。 */
export function signInviteCode(userId: string): string | null {
  const secret = process.env.INVITE_SECRET;
  if (!secret) return null;
  const payload = b64url(Buffer.from(userId, "utf8"));
  return `${payload}.${sign(userId, secret)}`;
}

/** 招待コードを検証し、正当なら userId を返す。不正・未設定なら null。 */
export function verifyInviteCode(code: string | undefined | null): string | null {
  const secret = process.env.INVITE_SECRET;
  if (!secret || !code) return null;

  const dot = code.indexOf(".");
  if (dot <= 0) return null;

  const payload = code.slice(0, dot);
  const provided = code.slice(dot + 1);

  let userId: string;
  try {
    userId = fromB64url(payload).toString("utf8");
  } catch {
    return null;
  }
  if (!userId) return null;

  const expected = sign(userId, secret);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return userId;
}
