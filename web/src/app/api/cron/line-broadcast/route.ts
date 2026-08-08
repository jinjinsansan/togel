import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";
import { buildTypeBroadcast } from "@/lib/line/broadcast";
import { multicastMessage } from "@/lib/line/client";
import { getDiagnosedLineUsers } from "@/lib/line/db";

/**
 * LINE定期配信（週次）。Vercel Cron から呼ばれる。
 *
 * - 認可: `Authorization: Bearer ${CRON_SECRET}`（未設定ならフェイルクローズで無効）
 * - 診断済みのLINE友だちをタイプ別にまとめ、テンプレ文面を multicast で送る
 * - 文面は静的コンテンツから生成（lib/line/broadcast.ts）。AI生成なし・コストゼロ
 */

export const dynamic = "force-dynamic";

const MULTICAST_LIMIT = 500;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // フェイルクローズ: シークレット未設定なら配信機能ごと無効
    return NextResponse.json({ error: "broadcast disabled" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const users = await getDiagnosedLineUsers();
  if (users.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, skipped: 0 });
  }

  // エポック起点の週番号でテンプレを巡回（4テンプレ×ワースト3タイプ=12週周期）
  const weekIndex = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));

  const byType = new Map<string, string[]>();
  for (const user of users) {
    const list = byType.get(user.togel_type) ?? [];
    list.push(user.line_user_id);
    byType.set(user.togel_type, list);
  }

  let sent = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (const [typeId, recipients] of byType) {
    const message = buildTypeBroadcast(typeId, weekIndex);
    if (!message) {
      skipped += recipients.length;
      continue;
    }
    for (let i = 0; i < recipients.length; i += MULTICAST_LIMIT) {
      const chunk = recipients.slice(i, i + MULTICAST_LIMIT);
      try {
        await multicastMessage(chunk, [message]);
        sent += chunk.length;
      } catch (error) {
        console.error(`[LINE Broadcast] multicast failed for type=${typeId}`, error);
        failures.push(typeId);
      }
    }
  }

  return NextResponse.json({ ok: failures.length === 0, sent, skipped, failures, weekIndex });
}
