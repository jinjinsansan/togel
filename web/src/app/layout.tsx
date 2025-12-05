import type { Metadata, Viewport } from "next";
import "./globals.css";
import "@fontsource/noto-sans-jp/400.css";
import "@fontsource/noto-sans-jp/500.css";
import "@fontsource/noto-sans-jp/700.css";

import { ConditionalHeader } from "@/components/layout/conditional-header";
import { ConditionalFooter } from "@/components/layout/conditional-footer";
import { LineExternalBrowserRedirect } from "@/components/line-external-browser-redirect";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
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
  },
  twitter: {
    card: "summary_large_image",
    title: "Togel型AI性格診断によるマッチングサービス",
    description: "Togel型AI性格診断によるマッチングサービス。あなたの性格を分析し、相性の良い異性をご紹介します。",
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
        <ConditionalHeader />
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        <ConditionalFooter />
      </body>
    </html>
  );
}
