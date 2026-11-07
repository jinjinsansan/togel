import { Resend } from "resend";

import type { RenderedEmail } from "./render";
import { SUPPORT_EMAIL } from "./render";

/**
 * Resend の一括送信（1回の API 呼び出しで最大100通）。無料枠の秒間制限に当たらないよう、
 * 1日ぶんを1回で送る。宛先ごとの成否を、渡した順番の配列で返す。
 *
 * 差出人は RESEND_FROM_EMAIL（既定 `Togel <noreply@to-gel.com>`）。
 * Resend 側で to-gel.com のドメイン認証（DNS は Cloudflare）が済んでいないと送れない。
 * 返信は support@ に届くようにする（受信は Cloudflare Email Routing・無料）。
 */

export const BATCH_MAX = 100;

export const sendNewsletterBatch = async (
  apiKey: string,
  items: { to: string; email: RenderedEmail }[],
): Promise<boolean[]> => {
  if (items.length === 0) return [];
  if (items.length > BATCH_MAX) throw new Error(`batch too large: ${items.length}`);

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM_EMAIL || "Togel <noreply@to-gel.com>";

  const { data, error } = await resend.batch.send(
    items.map(({ to, email }) => ({
      from,
      to,
      replyTo: SUPPORT_EMAIL,
      subject: email.subject,
      text: email.text,
      html: email.html,
      headers: email.headers,
    })),
    { batchValidation: "permissive" },
  );

  if (error || !data) {
    console.error("[Newsletter] batch send failed", error);
    return items.map(() => false);
  }

  const failed = new Set((data.errors ?? []).map((item) => item.index));
  for (const item of data.errors ?? []) {
    console.error("[Newsletter] rejected", { index: item.index, message: item.message });
  }
  return items.map((_, index) => !failed.has(index));
};
