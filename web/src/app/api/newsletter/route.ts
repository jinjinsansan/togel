import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getNewsletterState,
  latestTypeIdFor,
  subscribe,
  unsubscribeByUser,
} from "@/lib/newsletter/db";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";

/**
 * ログイン中の本人のメルマガ購読。
 *   GET    … 状態（未ログインなら loggedIn: false）
 *   POST   … 購読する（同意の記録）。宛先は**本人の確認済みメールアドレスだけ**
 *   DELETE … 解除する
 */

export const dynamic = "force-dynamic";

const currentUser = async () => {
  const supabase = createSupabaseRouteClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
};

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ loggedIn: false });
  try {
    const [state, latestType] = await Promise.all([
      getNewsletterState(user.id),
      latestTypeIdFor(user.id),
    ]);
    return NextResponse.json({
      loggedIn: true,
      subscribed: state.subscribed,
      diagnosed: Boolean(state.typeId ?? latestType),
      lastIssue: state.lastIssue,
    });
  } catch (error) {
    console.error("[Newsletter] status failed", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

const bodySchema = z.object({
  source: z.enum(["result", "mypage", "newsletter_page"]),
});

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // 確認していないアドレスには送らない（他人のアドレスで登録された場合に備える）
  if (!user.email || !user.email_confirmed_at) {
    return NextResponse.json({ error: "email_not_confirmed" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  try {
    await subscribe({
      userId: user.id,
      email: user.email,
      source: parsed.data.source,
      typeId: await latestTypeIdFor(user.id),
    });
    return NextResponse.json({ ok: true, subscribed: true });
  } catch (error) {
    console.error("[Newsletter] subscribe failed", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

export async function DELETE() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    await unsubscribeByUser(user.id);
    return NextResponse.json({ ok: true, subscribed: false });
  } catch (error) {
    console.error("[Newsletter] unsubscribe failed", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
