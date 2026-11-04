import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";
import { claimIssue, fetchCandidates, releaseClaim } from "@/lib/newsletter/db";
import { BROADCAST_TOTAL_ISSUES, buildNewsletterIssue } from "@/lib/newsletter/issues";
import { renderNewsletterEmail } from "@/lib/newsletter/render";
import { dailyLimit, dueIssue } from "@/lib/newsletter/schedule";
import { sendNewsletterBatch } from "@/lib/newsletter/send";
import { newsletterStatus } from "@/lib/newsletter/status";
import { getAppBaseUrl } from "@/lib/url";

/**
 * メルマガ（週1通・全15通）。Vercel Cron から**毎日**呼ばれる。
 *
 * - 認可: `Authorization: Bearer ${CRON_SECRET}`（Vercel Cron が自動で付ける）
 * - 送信: Resend（RESEND_API_KEY）。どちらかが無ければフェイルクローズで 503
 * - 誰に何通目を送るかは lib/newsletter/schedule.ts（前回から7日たった人に次の1通）
 * - 1日の上限は NEWSLETTER_DAILY_LIMIT（既定80・最大100）。溢れた人は翌日に回る
 * - 文面は静的コンテンツから生成（lib/newsletter/issues.ts）。AI生成なし
 *
 * 検証用（いずれも CRON_SECRET 認証の内側）:
 *   ?dryRun=1                  … 送信せず、今日送る人数と文面を返す（宛先は返さない）
 *   ?dryRun=1&type=<id>&all=1  … DBを見ず、指定タイプの全15通を組み立てて返す
 *   ?to=<email>[,...]          … 購読者のうち明示したアドレスにだけ実送信（最大5件）
 */

export const dynamic = "force-dynamic";

/** 明示指定での送信はこの件数までしか受け付けない（一斉送信の抜け道にしない） */
const EXPLICIT_LIMIT = 5;

export async function GET(req: NextRequest) {
  const { missing } = newsletterStatus(process.env);
  if (missing.length > 0) {
    // 変数名だけを返す（値は返さない）。片方だけ設定して「済んだ」と思い込む事故を防ぐ
    return NextResponse.json({ error: "newsletter disabled", missing }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const previewType = url.searchParams.get("type");
  const explicit = (url.searchParams.get("to") ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (dryRun && url.searchParams.get("all") === "1") {
    if (!previewType) {
      return NextResponse.json({ error: "type is required with all=1" }, { status: 400 });
    }
    const issues = Array.from({ length: BROADCAST_TOTAL_ISSUES }, (_, index) =>
      buildNewsletterIssue(previewType, index + 1),
    );
    return NextResponse.json({
      ok: issues.every(Boolean) && buildNewsletterIssue(previewType, BROADCAST_TOTAL_ISSUES + 1) === null,
      type: previewType,
      total: BROADCAST_TOTAL_ISSUES,
      issues,
    });
  }

  const now = new Date();
  const limit = dailyLimit(process.env.NEWSLETTER_DAILY_LIMIT);
  const baseUrl = getAppBaseUrl(req);

  // 7日たっていない人も混ざるので、上限より多めに引いてから絞る
  const candidates = await fetchCandidates(limit * 5);
  const filtered =
    explicit.length > 0
      ? candidates.filter((row) => explicit.includes(row.email.toLowerCase())).slice(0, EXPLICIT_LIMIT)
      : candidates;

  const due = filtered
    .map((row) => ({ row, issue: dueIssue(row, now) }))
    .filter((item): item is { row: (typeof filtered)[number]; issue: number } => item.issue !== null)
    .slice(0, limit);

  const prepared = due
    .map(({ row, issue }) => {
      const content = buildNewsletterIssue(row.type_id as string, issue);
      return content
        ? { row, issue, email: renderNewsletterEmail(content, baseUrl, row.unsubscribe_token) }
        : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
  const skipped = due.length - prepared.length;

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      limit,
      due: due.length,
      skipped,
      preview: prepared.slice(0, 3).map(({ issue, row, email }) => ({
        typeId: row.type_id,
        issue,
        subject: email.subject,
        text: email.text,
      })),
    });
  }

  // 送る前に確保する（二重に走っても同じ通を2回送らない）
  const claimed: typeof prepared = [];
  for (const item of prepared) {
    if (await claimIssue(item.row.user_id, item.issue, now)) claimed.push(item);
  }

  const results = await sendNewsletterBatch(
    process.env.RESEND_API_KEY as string,
    claimed.map(({ row, email }) => ({ to: row.email, email })),
  );

  let sent = 0;
  let failed = 0;
  for (let index = 0; index < claimed.length; index += 1) {
    if (results[index]) {
      sent += 1;
      continue;
    }
    failed += 1;
    const { row, issue } = claimed[index];
    await releaseClaim(row.user_id, issue, row.last_sent_at).catch((error) =>
      console.error("[Newsletter] failed to release claim", { userId: row.user_id, error }),
    );
  }

  return NextResponse.json({
    ok: failed === 0,
    limit,
    sent,
    failed,
    skipped,
    explicit: explicit.length > 0 ? claimed.length : undefined,
  });
}
