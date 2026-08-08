import type { Metadata, Viewport } from "next";
import "./globals.css";
import "@fontsource/noto-sans-jp/400.css";
import "@fontsource/noto-sans-jp/500.css";
import "@fontsource/noto-sans-jp/700.css";

import { ConditionalHeader } from "@/components/layout/conditional-header";
import { ConditionalFooter } from "@/components/layout/conditional-footer";
import { LineExternalBrowserRedirect } from "@/components/line-external-browser-redirect";
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
        <LineExternalBrowserRedirect />
        <AgeGate />
        <ConditionalHeader />
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        <ConditionalFooter />
      </body>
    </html>
  );
}
