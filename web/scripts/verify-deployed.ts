/**
 * デプロイ後の本番に対する到達性チェック。
 *
 *   npx tsx scripts/verify-deployed.ts
 *   npx tsx scripts/verify-deployed.ts --base https://www.to-gel.com --wait 300
 *
 * なぜ必要か:
 * テストは指定した不変条件を見るが、デプロイ後の本番は見ない。そして本番は
 * 「同じURLが5分前と後で違う答えを返す」——ビルド前に叩いた結果がCDNに
 * 載っている間は、コードが正しくても古い応答が返る。1回きりの確認では
 * 見た時刻がデプロイの前か後かを区別できない。
 *
 * 🔴 ステータス200だけでは不足する。旧デプロイでも200が返るルートがあるので、
 * **そのルートにしか無い文字列**で新旧を判別する。
 * 反映待ちのため、失敗したチェックは時間内で再試行する。
 */

import { personalityTypes, typeToken } from "../src/lib/personality";

type Check = {
  path: string;
  /** 本文に必ず含まれるもの（このデプロイでしか出ない文字列） */
  contains?: string[];
  /** 画像として返ること */
  image?: boolean;
  /** 最低バイト数 */
  minBytes?: number;
};

const args = process.argv.slice(2);
const argValue = (name: string, fallback: string) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const BASE = argValue("base", "https://www.to-gel.com").replace(/\/$/, "");
const WAIT_SECONDS = Number(argValue("wait", "180"));
const RETRY_INTERVAL_MS = 15_000;

const sample = personalityTypes[0];

const checks: Check[] = [
  { path: "/", contains: ["Togel"], minBytes: 5_000 },
  {
    path: "/coaching",
    // 盤ではなく公開一覧が出ていること（一覧が無い版でも200は返る）
    contains: [typeToken(sample), "タイプ別ガイド"],
    minBytes: 30_000,
  },
  { path: "/compatibility", contains: ["4群 相性表", "タイプは傾向、ラベルは個人。"] },
  { path: "/types", contains: [typeToken(sample)] },
  {
    path: "/sitemap.xml",
    contains: personalityTypes.map((type) => `${BASE}/coaching/${type.id}`),
  },
  { path: "/robots.txt", contains: ["Sitemap: https://www.to-gel.com/sitemap.xml"] },
  { path: `/api/og?type=${sample.id}`, image: true, minBytes: 20_000 },
  { path: `/api/og?type=${sample.id}&format=story`, image: true, minBytes: 50_000 },
  { path: "/api/og/groups", image: true, minBytes: 50_000 },
  // 24タイプの攻略ページ。愛称と見出しの両方で、旧デプロイと区別する
  ...personalityTypes.map((type) => ({
    path: `/coaching/${type.id}`,
    contains: [typeToken(type), "言い方の翻訳", "距離の置き方"],
    minBytes: 20_000,
  })),
];

type Failure = { path: string; reason: string };

const runCheck = async (check: Check): Promise<Failure | null> => {
  let response: Response;
  try {
    response = await fetch(`${BASE}${check.path}`, { redirect: "follow" });
  } catch (error) {
    return { path: check.path, reason: `到達できない: ${(error as Error).message}` };
  }
  if (!response.ok) {
    return { path: check.path, reason: `status ${response.status}` };
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (check.minBytes && buffer.byteLength < check.minBytes) {
    return {
      path: check.path,
      reason: `本文が小さすぎる ${buffer.byteLength}B < ${check.minBytes}B（旧デプロイの可能性）`,
    };
  }
  if (check.image) {
    const type = response.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) {
      return { path: check.path, reason: `画像ではない content-type=${type}` };
    }
    return null;
  }

  const body = buffer.toString("utf8");
  const missing = (check.contains ?? []).filter((needle) => !body.includes(needle));
  if (missing.length > 0) {
    const head = missing.slice(0, 3).join(" / ");
    return {
      path: check.path,
      reason: `内容が古い（${missing.length}件欠落: ${head}${missing.length > 3 ? " …" : ""}）`,
    };
  }
  return null;
};

const main = async () => {
  console.log(`対象: ${BASE}`);
  console.log(`チェック数: ${checks.length}（最大 ${WAIT_SECONDS} 秒まで再試行）\n`);

  const deadline = Date.now() + WAIT_SECONDS * 1000;
  let pending = checks;
  let round = 0;

  while (pending.length > 0) {
    round += 1;
    const results = await Promise.all(pending.map(runCheck));
    const failures = results
      .map((failure, index) => ({ failure, check: pending[index] }))
      .filter((entry) => entry.failure !== null);

    const passed = pending.length - failures.length;
    console.log(`[${round}回目] 通過 ${passed} / ${pending.length}`);

    if (failures.length === 0) break;
    if (Date.now() >= deadline) {
      console.log("\n落ちたチェック:");
      for (const entry of failures) {
        console.log(`  ✗ ${entry.failure!.path}  ${entry.failure!.reason}`);
      }
      console.log(`\nFAIL: ${failures.length} 件`);
      process.exitCode = 1;
      return;
    }
    for (const entry of failures.slice(0, 5)) {
      console.log(`    待機中: ${entry.failure!.path} — ${entry.failure!.reason}`);
    }
    pending = failures.map((entry) => entry.check);
    await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL_MS));
  }

  console.log(`\nPASS: ${checks.length} 件すべて到達・内容も最新`);
};

void main();
