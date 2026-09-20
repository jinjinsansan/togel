import type { MetadataRoute } from "next";

import { personalityTypes } from "@/lib/personality";

/**
 * サイトマップ。
 *
 * タイプ別の攻略ページ（/coaching/[typeId]）は24本の着地ページとして作ってある。
 * 投稿から飛んでくる経路と、検索から拾われる経路の両方を想定しているので、
 * 24本が漏れなく入っていることが要件（tests/sitemap.test.ts で固定）。
 *
 * 入れないもの:
 * - 認証が要る画面（/mypage /result /diagnosis /profile /michelle /admin）
 * - /share/[typeId] … SNSのプレビュー用の着地で、中身は /coaching/[typeId] の要約。
 *   検索に両方出すと同じ内容で競合するため、本体だけを載せる
 * - /api/* … robots.txt でも除外済み
 */

const BASE_URL = "https://www.to-gel.com";

const staticPaths: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/coaching", priority: 0.9, changeFrequency: "weekly" },
  { path: "/types", priority: 0.8, changeFrequency: "monthly" },
  { path: "/compatibility", priority: 0.8, changeFrequency: "monthly" },
  { path: "/types/distribution", priority: 0.5, changeFrequency: "monthly" },
  { path: "/about", priority: 0.5, changeFrequency: "monthly" },
  { path: "/diagnosis/select", priority: 0.7, changeFrequency: "monthly" },
  { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
  { path: "/tokushoho", priority: 0.2, changeFrequency: "yearly" },
];

const sitemap = (): MetadataRoute.Sitemap => {
  const lastModified = new Date();

  return [
    ...staticPaths.map((entry) => ({
      url: `${BASE_URL}${entry.path}`,
      lastModified,
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
    })),
    // 24タイプの攻略ページ（着地ページ本体）
    ...personalityTypes.map((type) => ({
      url: `${BASE_URL}/coaching/${type.id}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
};

export default sitemap;
