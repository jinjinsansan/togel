import Link from "next/link";

import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/diagnosis/select", label: "診断" },
  { href: "/result", label: "マッチング" },
  { href: "/types", label: "Togel一覧" },
  { href: "/types/distribution", label: "Togel分布" },
  { href: "/mypage", label: "マイページ" },
  { href: "/settings", label: "設定" },
];

export const SiteHeader = () => {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-white/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="font-heading text-xl font-semibold text-primary">
          Matching診断
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="text-muted-foreground hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild className="hidden md:flex">
            <Link href="/diagnosis/select">診断をはじめる</Link>
          </Button>
          <Button className="md:hidden" asChild>
            <Link href="/diagnosis/select">診断</Link>
          </Button>
        </div>
      </div>
    </header>
  );
};
