import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";

import { serializeJsonLd, websiteJsonLd } from "@/lib/seo/json-ld";
import "./globals.css";
/*
 * 読み込む太さは、実際に使っている太さに合わせる。
 *
 * 900 は `font-black` として342箇所で使われており、全太さの中で最多。
 * にもかかわらず読み込んでいなかったため、ブラウザが700から合成していた
 * （synthetic bold）。日本語は画数が多いので線が潰れる。
 * さらに OG画像は 900 の実ファイルを同梱しているので、
 * **シェア画像は本物の900、サイトは合成の900**という食い違いが起きていた。
 *
 * 500 は18箇所しか使っておらず、しかも全部が刷新の対象外（admin / michelle /
 * certificate）だった。外しても利用者が見る画面には影響しない。
 *
 * 600（`font-semibold`・109箇所）は読み込んでいない。90%が対象外の画面にあり、
 * ブランド面に出るのはヘッダーのボタンなど少数のため、判断待ちで据え置き。
 */
import "@fontsource/noto-sans-jp/400.css";
import "@fontsource/noto-sans-jp/700.css";
import "@fontsource/noto-sans-jp/900.css";

import { ConditionalHeader } from "@/components/layout/conditional-header";
import { ConditionalFooter } from "@/components/layout/conditional-footer";
import { AgeGate } from "@/components/age-gate";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // ピンチズームを許可（WCAG 1.4.4 アクセシビリティ対応のため maximumScale 制限を撤廃）
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.to-gel.com"),
  title: "Togel型AI性格診断によるマッチングサービス",
  description:
    "Togel型AI性格診断によるマッチングサービス。あなたの性格を分析し、相性の良い異性をご紹介します。",
  openGraph: {
    title: "Togel型AI性格診断によるマッチングサービス",
    description: "Togel型AI性格診断によるマッチングサービス。あなたの性格を分析し、相性の良い異性をご紹介します。",
    url: "https://www.to-gel.com",
    siteName: "Togel",
    locale: "ja_JP",
    type: "website",
    images: [{ url: "/og.png", width: 1024, height: 1024, alt: "Togel" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Togel型AI性格診断によるマッチングサービス",
    description: "Togel型AI性格診断によるマッチングサービス。あなたの性格を分析し、相性の良い異性をご紹介します。",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(websiteJsonLd()) }}
        />
        <AgeGate />
        <ConditionalHeader />
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        {/* アクセス解析（クッキーレス・個人を特定しない）。/privacy §6 に記載 */}
        <Analytics />
        <ConditionalFooter />
      </body>
    </html>
  );
}
