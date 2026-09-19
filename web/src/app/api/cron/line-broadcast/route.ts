import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";
import { BROADCAST_TOTAL_ISSUES, buildTypeBroadcast, issueForUser } from "@/lib/line/broadcast";
import { multicastMessage } from "@/lib/line/client";
import { getBroadcastRecipients } from "@/lib/line/db";

/**
 * LINE定期配信（週次）。Vercel Cron から呼ばれる。
 *
 * - 認可: `Authorization: Bearer ${CRON_SECRET}`（未設定ならフェイルクローズで無効）
 * - 起点: `LINE_BROADCAST_START_AT`（配信有効化日。未設定ならフェイルクローズ）
 * - 通目はユーザー単位。起点は max(友だち登録日, 配信有効化日)。全15通を超えたら送らない
 * - 文面は静的コンテンツから生成（lib/line/broadcast.ts）。AI生成なし・コストゼロ
 *
 * 検証用（いずれも CRON_SECRET 認証の内側）:
 *   ?dryRun=1                  … 送信せず、実際の宛先集合に対する文面と件数を返す
 *   ?dryRun=1&type=<id>&all=1  … DBを見ず、指定タイプの全15通を組み立てて返す
 *   ?to=<lineUserId>[,...]     … 明示したLINE IDにだけ実送信（最大5件・一斉送信には使えない）
 */

export const dynamic = "force-dynamic";

const MULTICAST_LIMIT = 500;
/** 明示指定での送信はこの件数までしか受け付けない（一斉送信の抜け道にしない） */
const EXPLICIT_LIMIT = 5;

type Group = { typeId: string; issue: number; recipients: string[] };

const groupKey = (typeId: string, issue: number) => `${typeId}#${issue}`;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // フェイルクローズ: シークレット未設定なら配信機能ごと無効
    return NextResponse.json({ error: "broadcast disabled" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const previewAll = url.searchParams.get("all") === "1";
  const previewType = url.searchParams.get("type");
  const explicit = (url.searchParams.get("to") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  // 文面だけの確認（DBを見ない）。全15通をまとめて返す
  if (dryRun && previewAll) {
    if (!previewType) {
      return NextResponse.json({ error: "type is required with all=1" }, { status: 400 });
    }
    const issues = Array.from({ length: BROADCAST_TOTAL_ISSUES }, (_, index) => index + 1).map(
      (issue) => ({ issue, text: buildTypeBroadcast(previewType, issue)?.text ?? null }),
    );
    const overflow = buildTypeBroadcast(previewType, BROADCAST_TOTAL_ISSUES + 1);
    return NextResponse.json({
      ok: issues.every((item) => item.text) && overflow === null,
      type: previewType,
      total: BROADCAST_TOTAL_ISSUES,
      overflowIsNull: overflow === null,
      issues,
    });
  }

  const startedAt = process.env.LINE_BROADCAST_START_AT;
  if (!startedAt || Number.isNaN(new Date(startedAt).getTime())) {
    // 起点が無いと通目を決められない。推測しないでフェイルクローズする
    return NextResponse.json({ error: "start date not configured" }, { status: 503 });
  }
  const startAt = new Date(startedAt);
  const now = new Date();

  const all = await getBroadcastRecipients();
  const targets =
    explicit.length > 0
      ? all.filter((user) => explicit.includes(user.line_user_id)).slice(0, EXPLICIT_LIMIT)
      : all;

  if (explicit.length > 0 && targets.length === 0) {
    return NextResponse.json({ error: "no matching recipients" }, { status: 404 });
  }
  if (targets.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, skipped: 0, groups: 0 });
  }

  // 同じ（タイプ, 通目）の人はまとめて multicast できる
  const groups = new Map<string, Group>();
  let finished = 0;
  for (const user of targets) {
    const issue = issueForUser(user.created_at, startAt, now);
    if (issue < 1 || issue > BROADCAST_TOTAL_ISSUES) {
      finished += 1; // 全通数を配り終えた人。巡回させない
      continue;
    }
    const key = groupKey(user.togel_type, issue);
    const group = groups.get(key) ?? { typeId: user.togel_type, issue, recipients: [] };
    group.recipients.push(user.line_user_id);
    groups.set(key, group);
  }

  let sent = 0;
  let skipped = 0;
  const failures: string[] = [];
  const preview: Array<{ typeId: string; issue: number; recipients: number; text: string }> = [];

  for (const group of groups.values()) {
    const message = buildTypeBroadcast(group.typeId, group.issue);
    if (!message) {
      skipped += group.recipients.length;
      continue;
    }
    if (dryRun) {
      // 宛先のIDは返さない（件数だけ）
      preview.push({
        typeId: group.typeId,
        issue: group.issue,
        recipients: group.recipients.length,
        text: message.text,
      });
      continue;
    }
    for (let i = 0; i < group.recipients.length; i += MULTICAST_LIMIT) {
      const chunk = group.recipients.slice(i, i + MULTICAST_LIMIT);
      try {
        await multicastMessage(chunk, [message]);
        sent += chunk.length;
      } catch (error) {
        console.error(
          `[LINE Broadcast] multicast failed for type=${group.typeId} issue=${group.issue}`,
          error,
        );
        failures.push(groupKey(group.typeId, group.issue));
      }
    }
  }

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      startedAt,
      groups: preview.length,
      finished,
      skipped,
      preview,
    });
  }

  return NextResponse.json({
    ok: failures.length === 0,
    explicit: explicit.length > 0 ? targets.length : undefined,
    sent,
    skipped,
    finished,
    failures,
  });
}
