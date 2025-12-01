import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

import { SiteHeader } from "@/components/layout/site-header";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-jp",
});

export const metadata: Metadata = {
  title: "Togel型AI性格診断によるマッチングサービス",
  description:
    "Togel型AI性格診断によるマッチングサービス。あなたの性格を分析し、相性の良い異性をご紹介します。",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
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
      <body className={`min-h-screen bg-background text-foreground antialiased ${notoSansJP.className} ${notoSansJP.variable}`}>
        <SiteHeader />
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      </body>
    </html>
  );
}
