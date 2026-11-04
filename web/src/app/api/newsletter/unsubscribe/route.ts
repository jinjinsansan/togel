import { NextResponse } from "next/server";

import { unsubscribeByToken } from "@/lib/newsletter/db";

/**
 * メールの解除リンクから（ログイン不要）。
 *
 * POST だけを受ける。GET で解除すると、メールのセキュリティ機能がリンクを
 * 先読みしただけで解除されてしまう。メールのリンクは /newsletter/unsubscribe の画面に行き、
 * そこでボタンを押すとここに POST する。
 *
 * Gmail・Yahoo のワンクリック解除（List-Unsubscribe-Post）も、この URL に
 * `?token=` 付きで `List-Unsubscribe=One-Click` を POST してくる。
 *
 * トークンが見つからなくても 200 を返す（何が登録されているかを外から確かめられないように）。
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const url = new URL(request.url);
  let token = url.searchParams.get("token");
  if (!token && request.headers.get("content-type")?.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
    token = typeof body?.token === "string" ? body.token : null;
  }
  if (!token) return NextResponse.json({ error: "token is required" }, { status: 400 });

  try {
    await unsubscribeByToken(token);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Newsletter] unsubscribe by token failed", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
