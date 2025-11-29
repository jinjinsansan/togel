/** @type {import('next').NextConfig} */
const nextConfig = {
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

module.exports = nextConfig;
