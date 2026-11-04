/**
 * メルマガ1通をメールの形にする（本文・HTML・解除リンク・送信者の表示）。
 *
 * 特定電子メール法で、広告宣伝メールには次の表示が要る。毎通、本文の末尾に置く。
 * - 送信者の氏名または名称
 * - 受信拒否（配信解除）ができる旨と、その連絡先（URL）
 * - 送信者の住所
 * - 苦情・問い合わせの連絡先
 * 値は /tokushoho と同じもの。どちらかを変えるときは両方を変える。
 */

export const SENDER_NAME = "Togel（DLLC）";
export const SENDER_ADDRESS = "東京都港区赤坂4丁目8番19号 赤坂フロントタウン3階";
export const SUPPORT_EMAIL = "support@to-gel.com";

export const unsubscribeUrl = (baseUrl: string, token: string) =>
  `${baseUrl}/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;

export const unsubscribeApiUrl = (baseUrl: string, token: string) =>
  `${baseUrl}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;

export const footerText = (unsubscribe: string) =>
  [
    "――――――――――",
    "このメールは、Togel でメルマガの受け取りに同意された方にお送りしています。",
    `配信の解除: ${unsubscribe}`,
    `送信者: ${SENDER_NAME}`,
    `住所: ${SENDER_ADDRESS}`,
    `お問い合わせ: ${SUPPORT_EMAIL}`,
  ].join("\n");

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** URL だけをリンクにして、あとは改行を保ったまま出す */
const linkify = (escaped: string) =>
  escaped.replace(/https?:\/\/[^\s<]+/g, (url) => `<a href="${url}" style="color:#FF2E74">${url}</a>`);

export const toHtml = (text: string) =>
  [
    '<!doctype html><html lang="ja"><body style="margin:0;padding:24px 16px;background:#ffffff;">',
    '<div style="max-width:560px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,\'Hiragino Sans\',\'Noto Sans JP\',sans-serif;font-size:15px;line-height:1.8;color:#111111;white-space:pre-wrap;word-break:break-word;">',
    linkify(escapeHtml(text)),
    "</div></body></html>",
  ].join("");

export type RenderedEmail = {
  subject: string;
  text: string;
  html: string;
  headers: Record<string, string>;
};

export const renderNewsletterEmail = (
  issue: { subject: string; text: string },
  baseUrl: string,
  token: string,
): RenderedEmail => {
  const text = `${issue.text}\n\n${footerText(unsubscribeUrl(baseUrl, token))}`;
  return {
    subject: issue.subject,
    text,
    html: toHtml(text),
    // Gmail・Yahoo のワンクリック解除（RFC 8058）。POST で解除される
    headers: {
      "List-Unsubscribe": `<${unsubscribeApiUrl(baseUrl, token)}>, <mailto:${SUPPORT_EMAIL}?subject=unsubscribe>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
};
