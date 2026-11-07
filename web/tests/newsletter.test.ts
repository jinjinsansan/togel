import { test } from "node:test";
import assert from "node:assert/strict";

import { BROADCAST_TOTAL_ISSUES, buildNewsletterIssue } from "../src/lib/newsletter/issues";
import { dailyLimit, dueIssue, SCHEDULE_SLACK_MS } from "../src/lib/newsletter/schedule";
import { renderNewsletterEmail, SENDER_ADDRESS, SUPPORT_EMAIL } from "../src/lib/newsletter/render";
import { newsletterStatus } from "../src/lib/newsletter/status";
import { ANGLE_BY_BROADCAST_KIND } from "../src/lib/coaching/board";
import { personalityTypes } from "../src/lib/personality";

/**
 * メルマガ（週1通・全15通）。通目・範囲・文面の重複・送る日・法定表示を固定する。
 * 文面は LINE 週次配信から引き継いだもの。通目は購読者ごとに数える。
 */

const WEEK = 7 * 24 * 60 * 60 * 1000;
const NOW = new Date("2026-10-02T03:00:00Z");

test("1〜15通目がすべて組み立てられる", () => {
  for (let issue = 1; issue <= BROADCAST_TOTAL_ISSUES; issue += 1) {
    const message = buildNewsletterIssue("creative-leader", issue);
    assert.ok(message, `issue=${issue}`);
    assert.equal(
      message.text.split("\n")[0],
      `${issue}通目です（全${BROADCAST_TOTAL_ISSUES}通）`,
    );
  }
});

test("範囲外の通目は送らない（巡回させない）", () => {
  for (const issue of [0, -1, BROADCAST_TOTAL_ISSUES + 1, 999, 1.5]) {
    assert.equal(buildNewsletterIssue("creative-leader", issue), null, `issue=${issue}`);
  }
});

/**
 * 🔴 この検査は**全文が同一かどうかしか見ていない。**
 * 見出しが違えば別の文字列になるので、**中の一部だけが重複していても通る。**
 * 実際そうなっていて、同じ相手の ✕/◯ が2通に入っていたのを通していた。
 * 部分の重複は下の「自分の角度だけを含む」で止める。
 */
test("15通の文面が重複しない（5テンプレ × ワースト3を網羅する）", () => {
  for (const type of personalityTypes) {
    const texts: string[] = [];
    for (let issue = 1; issue <= BROADCAST_TOTAL_ISSUES; issue += 1) {
      const message = buildNewsletterIssue(type.id, issue);
      if (message) texts.push(message.text);
    }
    assert.equal(texts.length, BROADCAST_TOTAL_ISSUES, type.id);
    assert.equal(new Set(texts).size, BROADCAST_TOTAL_ISSUES, type.id);
  }
});

/**
 * 各通は、**自分の角度の文だけ**を含む。
 *
 * リンクの対応（ANGLE_BY_BROADCAST_KIND）は1対1だったのに、**本文がその対応に
 * 従っていなかった**。kind 2 は角度として `why` を指しているのに、本文に
 * `ng / ok` も載せていたため、1通目と同じ中身が2週後にもう一度届いていた
 * （15通中3通）。見出しも「言い方の翻訳講座」のままで、中身と合っていなかった。
 *
 * 既存の「1対1」検査は**リンク先しか見ていない**ので、これを通していた。
 */
test("他の角度を、その角度の見せ方で載せない", () => {
  // 「他の角度の文字列を含まない」では厳しすぎる。`why` の本文は
  // **説明する対象として ✕ の言い回しをそのまま引用している**（「『今、真面目な
  // 話してるんだけど』は進行の整理のつもりでも…」）。引用は重複ではない。
  //
  // 重複だったのは、**その角度の見せ方ごと載せていた**こと。
  // ✕/◯ の行は translate の見せ方、番号付きの行は dos の見せ方。
  // そこだけを、自分の角度の通に限る。
  const MARKERS: { angle: string; test: (line: string) => boolean; name: string }[] = [
    { angle: "translate", test: (l) => /^[✕◯]/.test(l.trim()), name: "✕/◯ の行" },
    { angle: "dos", test: (l) => /^\d+\. /.test(l.trim()), name: "番号付きの行" },
  ];

  const offenders: string[] = [];
  for (const type of personalityTypes) {
    for (let issue = 1; issue <= BROADCAST_TOTAL_ISSUES; issue += 1) {
      const text = buildNewsletterIssue(type.id, issue)?.text;
      if (!text) continue;
      const mine = ANGLE_BY_BROADCAST_KIND[(issue - 1) % ANGLE_BY_BROADCAST_KIND.length];
      const lines = text.split("\n");

      for (const marker of MARKERS) {
        const hit = lines.some(marker.test);
        if (hit && marker.angle !== mine) {
          offenders.push(`${type.id} ${issue}通目(${mine}): ${marker.name}が出ている`);
        }
        if (!hit && marker.angle === mine) {
          offenders.push(`${type.id} ${issue}通目(${mine}): ${marker.name}が無い`);
        }
      }
    }
  }
  assert.deepEqual([...new Set(offenders)], []);
});

test("各通は盤のマスへのリンクを持つ（配信1通 = 1マス）", () => {
  for (let issue = 1; issue <= BROADCAST_TOTAL_ISSUES; issue += 1) {
    const text = buildNewsletterIssue("creative-leader", issue)?.text ?? "";
    assert.match(text, /to-gel\.com\/coaching\?cell=/);
  }
});

test("残り通数・連続記録・不在への言及を含まない", () => {
  // 「あとで〜」のような正当な語と区別するため、禁止事項そのものの形で見る
  const banned: [RegExp, string][] = [
    [/あと\s*\d+\s*通/, "残り通数"],
    [/残り\s*\d+/, "残り数"],
    [/\d+\s*週連続|連続記録|連続で開封/, "ストリーク"],
    [/お久しぶり|ぶりですね|未読/, "不在への言及"],
  ];
  for (const type of personalityTypes) {
    for (let issue = 1; issue <= BROADCAST_TOTAL_ISSUES; issue += 1) {
      const text = buildNewsletterIssue(type.id, issue)?.text ?? "";
      for (const [pattern, label] of banned) {
        assert.ok(!pattern.test(text), `${type.id} issue=${issue} に${label}が含まれている`);
      }
    }
  }
});

test("件名に通目と全通数が入る", () => {
  const issue = buildNewsletterIssue("creative-leader", 3);
  assert.ok(issue);
  assert.match(issue.subject, /^【Togel】.+（3\/15）$/);
});

test("登録したら次の cron で1通目、以降は7日ごと", () => {
  assert.equal(dueIssue({ last_issue: 0, last_sent_at: null }, NOW), 1);
  const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();
  assert.equal(dueIssue({ last_issue: 1, last_sent_at: ago(WEEK / 2) }, NOW), null);
  // cron の実行時刻が少し早まっても、1日ずれない
  assert.equal(dueIssue({ last_issue: 1, last_sent_at: ago(WEEK - SCHEDULE_SLACK_MS) }, NOW), 2);
  assert.equal(dueIssue({ last_issue: 1, last_sent_at: ago(WEEK - SCHEDULE_SLACK_MS - 60_000) }, NOW), null);
  assert.equal(dueIssue({ last_issue: 14, last_sent_at: ago(WEEK) }, NOW), 15);
});

test("15通を送り終えた人には送らない（巡回させない）", () => {
  assert.equal(dueIssue({ last_issue: 15, last_sent_at: null }, NOW), null);
  assert.equal(dueIssue({ last_issue: 99, last_sent_at: null }, NOW), null);
  assert.equal(dueIssue({ last_issue: -1, last_sent_at: null }, NOW), null);
});

test("1日の上限は無料枠（100通）を超えない", () => {
  assert.equal(dailyLimit(undefined), 80);
  assert.equal(dailyLimit("abc"), 80);
  assert.equal(dailyLimit("0"), 80);
  assert.equal(dailyLimit("30"), 30);
  assert.equal(dailyLimit("500"), 100);
});

test("毎通に、解除リンク・送信者・住所・問い合わせ先が入る（特定電子メール法）", () => {
  const issue = buildNewsletterIssue("creative-leader", 1);
  assert.ok(issue);
  const token = "8f14e45f-ceea-467f-a0e5-3b1c2d9a7e10";
  const email = renderNewsletterEmail(issue, "https://to-gel.com", token);
  for (const body of [email.text, email.html]) {
    assert.ok(body.includes(`https://to-gel.com/newsletter/unsubscribe?token=${token}`), "解除リンク");
    assert.ok(body.includes("Togel"), "送信者");
    assert.ok(body.includes(SENDER_ADDRESS), "住所");
    assert.ok(body.includes(SUPPORT_EMAIL), "問い合わせ先");
  }
  assert.equal(email.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  assert.ok(email.headers["List-Unsubscribe"].includes(`/api/newsletter/unsubscribe?token=${token}`));
});

test("HTML版は本文を逃がしてから組み立てる（文面の記号がタグにならない）", () => {
  const email = renderNewsletterEmail({ subject: "s", text: "<b>x</b> & y" }, "https://to-gel.com", "t");
  assert.ok(email.html.includes("&lt;b&gt;x&lt;/b&gt; &amp; y"));
});

/* ===== 約束は、守れるときだけ出す ===== */

import { readdirSync, readFileSync as readSource, statSync } from "node:fs";
import { join as joinPath } from "node:path";

test("配信の判定: CRON_SECRET と RESEND_API_KEY の両方が要る", () => {
  assert.deepEqual(newsletterStatus({}).missing, ["CRON_SECRET", "RESEND_API_KEY"]);
  assert.equal(newsletterStatus({ CRON_SECRET: "x" }).enabled, false);
  assert.equal(newsletterStatus({ RESEND_API_KEY: "x" }).enabled, false);
  const on = newsletterStatus({ CRON_SECRET: "secret-value", RESEND_API_KEY: "re_value" });
  assert.equal(on.enabled, true);
  // 値を返さない（ビルド時に公開変数へ焼くため）
  assert.ok(!JSON.stringify(on).includes("secret-value"));
  assert.ok(!JSON.stringify(newsletterStatus({ CRON_SECRET: "secret-value" })).includes("secret-value"));
});

test("cron ルートも next.config も同じ判定を使っている", () => {
  const route = readSource(joinPath(process.cwd(), "src/app/api/cron/newsletter/route.ts"), "utf8");
  assert.ok(route.includes("newsletterStatus(process.env)"), "cron ルートが共通の判定を使っていない");
  assert.ok(!/missing\.push\(/.test(route), "cron ルートが自前で判定している");
  const config = readSource(joinPath(process.cwd(), "next.config.ts"), "utf8");
  assert.ok(config.includes("newsletterStatus(process.env)"), "next.config が共通の判定を使っていない");
});

test("vercel.json の cron は毎日メルマガを呼ぶ（LINE配信は残っていない）", () => {
  const vercel = JSON.parse(readSource(joinPath(process.cwd(), "vercel.json"), "utf8")) as {
    crons: { path: string; schedule: string }[];
  };
  const paths = vercel.crons.map((cron) => cron.path);
  assert.ok(paths.includes("/api/cron/newsletter"));
  assert.ok(!paths.some((path) => path.includes("line")));
  const schedule = vercel.crons.find((cron) => cron.path === "/api/cron/newsletter")?.schedule ?? "";
  assert.match(schedule, /^\d+ \d+ \* \* \*$/, "毎日1回であること");
});

/**
 * 配信が止まっているあいだ、画面のどこにも「届く」約束を出さない。
 * 約束の文言は、配信の判定の内側にしか書いてはいけない。
 */
test("「週1通」「全15回」などの約束は、配信の判定の内側にしか書かれていない", () => {
  const files = [
    "src/components/newsletter/newsletter-cta.tsx",
    "src/app/newsletter/page.tsx",
    "src/app/coaching/page.tsx",
    "src/app/coaching/[typeId]/page.tsx",
    "src/app/result/page.tsx",
    "src/app/result/mismatch/page.tsx",
    "src/app/mypage/page.tsx",
    "src/components/result/story-viewer.tsx",
  ];
  const PROMISE = /週に?1通|毎週1通|全15通|全15回|踏まない歩き方だけ送ります|1通目を受け取る/;
  const GATE = /isNewsletterEnabled\(\)\s*&&|enabled\s*&&/;
  const offenders: string[] = [];

  for (const file of files) {
    const lines = readSource(joinPath(process.cwd(), file), "utf8").split(/\r?\n/);
    lines.forEach((line, i) => {
      if (/^\s*(\/\/|\*|\{\/\*)/.test(line) || !PROMISE.test(line)) return;
      const before = lines.slice(Math.max(0, i - 10), i).join("\n");
      if (!GATE.test(before)) offenders.push(`${file}:${i + 1}`);
    });
  }
  assert.deepEqual(offenders, []);
});

test("LINE公式アカウントへの導線が残っていない", () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) => {
      const path = joinPath(dir, entry);
      return statSync(path).isDirectory() ? walk(path) : /\.tsx?$/.test(path) ? [path] : [];
    });
  const offenders = walk(joinPath(process.cwd(), "src")).filter((file) =>
    /lin\.ee\/|公式LINE|LINEでお問い合わせ|LINEで結果を受け取る/.test(readSource(file, "utf8")),
  );
  assert.deepEqual(offenders, []);
});
