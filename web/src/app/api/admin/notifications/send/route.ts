import { NextResponse } from "next/server";
import { broadcastNotification, findUserIdByEmail } from "@/lib/mail/sender";
// import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/admin/check-admin";

// Admin check helper
// getSession() は cookie を検証しないので、管理者判定には使わない（偽造 cookie で突破されていた）
const checkAdmin = async () => Boolean(await requireAdminUser());

export async function POST(request: Request) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, content, targetType, targetEmail } = body;

  if (!title || !content) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // 個別送信は、宛先のユーザーIDを引いてからお知らせを作る。
  // 以前は ID を渡さずに作っていたので user_id が null（＝全員向け）になり、
  // 1人に送ったつもりの文面が全ユーザーのマイページに出ていた
  let targetUserId: string | undefined;
  if (targetType === "individual") {
    if (!targetEmail) {
      return NextResponse.json({ error: "宛先のメールアドレスがありません" }, { status: 400 });
    }
    const found = await findUserIdByEmail(targetEmail);
    if (!found) {
      return NextResponse.json({ error: "そのメールアドレスのユーザーが見つかりません" }, { status: 404 });
    }
    targetUserId = found;
  }

  const result = await broadcastNotification({
    title,
    content,
    targetUserId,
    targetEmail: targetType === "individual" ? targetEmail : undefined,
  });

  return NextResponse.json(result);
}
