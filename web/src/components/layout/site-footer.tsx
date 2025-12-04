import Link from "next/link";
import { Mail, MessageCircle, ShieldCheck } from "lucide-react";

const footerLinks = [
  {
    title: "プロダクト",
    links: [
      { label: "AI診断", href: "/diagnosis/select" },
      { label: "型一覧", href: "/types" },
      { label: "マッチング結果", href: "/result" },
      { label: "ポイント", href: "/points" },
    ],
  },
  {
    title: "サポート",
    links: [
      { label: "心理カウンセリング", href: "/michelle" },
      { label: "引き寄せ講座", href: "/michelle/attraction" },
      { label: "プロフィール編集", href: "/profile/edit" },
      { label: "お問い合わせ", href: "https://lin.ee/T7OYAGQ" },
    ],
  },
  {
    title: "リソース",
    links: [
      { label: "型分布図", href: "/types/distribution" },
      { label: "FAQ", href: "/about" },
      { label: "利用規約", href: "/terms" },
      { label: "プライバシー", href: "/privacy" },
    ],
  },
];

export const SiteFooter = () => {
  return (
    <footer className="relative bg-[radial-gradient(circle_at_top,_#13213a,_#070d1b)] text-white">
      <div className="absolute inset-x-0 -top-8 h-8 bg-gradient-to-b from-transparent to-[#070d1b]" aria-hidden />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 divide-y divide-white/10 rounded-3xl border border-white/5 bg-white/5 p-6 backdrop-blur md:grid md:grid-cols-5 md:gap-12 md:divide-y-0 md:rounded-3xl md:border-white/10 md:bg-white/5 md:p-8">
          <div className="md:col-span-2 space-y-6">
            <p className="font-heading text-2xl font-semibold text-white">Togel</p>
            <p className="mt-3 text-sm text-white/70">
              あなたの本音と相性が一瞬でわかる<br />24タイプTogel型診断+AIマッチング
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-xs font-semibold">
              <span className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
                稼働中
              </span>
              <span className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-1 text-white/70">
                <ShieldCheck className="h-4 w-4" /> SLA 99.9%
              </span>
            </div>
          </div>

          {footerLinks.map((section) => (
            <div key={section.title} className="pt-6 first:pt-0 md:pt-0">
              <p className="text-sm font-semibold uppercase tracking-[0.4em] text-white/60">{section.title}</p>
              <ul className="mt-4 space-y-2 text-sm text-white/70">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="transition hover:text-white" target={link.href.startsWith("http") ? "_blank" : undefined}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="space-y-4 pt-6 md:pt-0">
            <p className="text-sm font-semibold uppercase tracking-[0.4em] text-white/60">Contact</p>
            <div className="space-y-3 text-sm text-white/80">
              <a href="mailto:info@to-gel.com" className="flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2 transition hover:border-white/40">
                <Mail className="h-4 w-4" /> info@to-gel.com
              </a>
              <a href="https://lin.ee/T7OYAGQ" target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2 transition hover:border-white/40">
                <MessageCircle className="h-4 w-4" /> LINEで相談
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Togel. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-3 text-white/70">
            <span>D-powerAIチーム</span>
            <span className="h-1 w-1 rounded-full bg-white/30" aria-hidden />
            <span>全てのサービスにAIを</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
