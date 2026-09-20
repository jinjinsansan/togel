import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";

import { serializeJsonLd, websiteJsonLd } from "@/lib/seo/json-ld";
import "./globals.css";
/*
 * 読み込む太さは、実際に使っている太さに合わせる。
 *
 * 900 は `font-black` として342箇所で使われており、全太さの中で最多。
 * にもかかわらず読み込んでいなかった。CSSのフォント照合規則では、500を超える
 * 太さを要求すると「それ以上を昇順 → 無ければそれ未満を降順」で探すので、
 * **900の指定は700で描かれていた**（合成ではなく置き換え）。
 * つまり設計は900を指しているのに、利用者は700を見ていた。
 *
 * さらに OG画像は 900 の実ファイル（src/assets/fonts）を同梱して使っている。
 * **シェア画像は900、サイトは700**で、同じ「〜型」が別の太さで描かれていた。
 * 画像とページを揃えるのが、この変更の第一の目的。
 *
 * 500 は18箇所しか使っておらず、しかも全部が刷新の対象外（admin / michelle /
 * certificate と、adminでしか使わない ui の input・label・tabs）だった。
 * 外しても利用者が見る画面には影響しない。
 *
 * 600 は読み込まない。109箇所のうち98箇所が対象外の画面（admin / michelle /
 * points）にあり、11箇所のために全ページへ33KBを足すのは割に合わない。
 * 対象外でない11箇所は `font-bold`（700）に変えた。上の照合規則により
 * 600は元から700で描かれていたので、見た目は変わらず、
 * **コードが持っていない太さを指定している状態だけが解消する。**
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
