import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

import { SiteHeader } from "@/components/layout/site-header";
import { SupabaseAuthProvider } from "@/providers/supabase-auth-provider";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-jp",
});

export const metadata: Metadata = {
  title: "Togel診断 | 性格診断マッチングサービス",
  description:
    "性格診断から相性の良い異性5名を紹介するカジュアルなマッチングサービス",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`min-h-screen bg-background text-foreground antialiased ${notoSansJP.className} ${notoSansJP.variable}`}>
        <SupabaseAuthProvider>
          <SiteHeader />
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        </SupabaseAuthProvider>
      </body>
    </html>
  );
}
