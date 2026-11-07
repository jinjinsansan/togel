import type { NextConfig } from "next";

import { newsletterStatus } from "./src/lib/newsletter/status";

const nextConfig: NextConfig = {
  // メルマガ配信が有効かを、**true/false だけ**画面へ渡す（秘密の値は渡さない）。
  // 判定は src/lib/newsletter/status.ts の1か所。cron ルートも同じ関数を使う。
  // 無効のあいだは画面が「週1通」「全15通」を約束しないようにするため。
  env: {
    NEXT_PUBLIC_NEWSLETTER_ENABLED: String(newsletterStatus(process.env).enabled),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "assets.to-gel.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
    ],
  },
  async headers() {
    return [
      {
        // publicフォルダ内の静的アセット（画像、動画など）に対するキャッシュ設定
        source: '/:all*(svg|jpg|png|mp4|webp)',
        locale: false,
        headers: [
          {
            key: 'Cache-Control',
            // public: 共有キャッシュ（CDN）に保存可能
            // max-age=3600: ブラウザキャッシュは1時間（短めにして即時反映しやすくする）
            // s-maxage=86400: CDNキャッシュは1日（サーバー負荷軽減）
            // stale-while-revalidate=604800: キャッシュ切れ後も1週間は古いコンテンツを表示しつつ裏で更新
            value: 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
          }
        ],
      },
    ];
  },
};

export default nextConfig;
