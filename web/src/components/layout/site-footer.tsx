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
    <footer className="relative bg-[radial-gradient(circle_at_top,_#0f1c30,_#050811)] text-white">
      <div className="absolute inset-x-0 -top-8 h-8 bg-gradient-to-b from-transparent to-[#050811]" aria-hidden />
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-4 lg:gap-8">
          <div className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <p className="font-heading text-3xl font-semibold text-white">Togel</p>
            <p className="text-sm text-white/70 leading-relaxed">
              あなたの本音と相性が一瞬でわかる<br />24タイプTogel型診断+AIマッチング
            </p>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="flex items-center gap-2 rounded-full bg-emerald-400/15 px-4 py-1 text-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-300" aria-hidden />
                稼働中
              </span>
              <span className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-white/70">
                <ShieldCheck className="h-4 w-4" /> SLA 99.9%
              </span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
              <p className="font-semibold text-white">無料サポート</p>
              <p className="mt-2 text-white/70">LINE公式で24h AIが応答、担当者が翌営業日以内にフォローします。</p>
              <a
                href="https://lin.ee/T7OYAGQ"
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#38bdf8] to-[#e91e63] py-2 text-sm font-semibold shadow-lg shadow-[#e91e63]/30"
              >
                <MessageCircle className="h-4 w-4" /> LINEでお問い合わせ
              </a>
            </div>
          </div>

          {footerLinks.map((section) => (
            <div key={section.title} className="rounded-3xl border border-white/5 bg-white/5 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.5em] text-white/60">{section.title}</p>
              <ul className="mt-4 space-y-3 text-sm text-white/80">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="transition hover:text-white"
                      target={link.href.startsWith("http") ? "_blank" : undefined}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="rounded-3xl border border-white/5 bg-white/5 p-5 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.5em] text-white/60">Contact</p>
            <div className="mt-4 space-y-3 text-sm text-white/80">
              <a href="mailto:info@to-gel.com" className="flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2 transition hover:border-white/40">
                <Mail className="h-4 w-4" /> info@to-gel.com
              </a>
              <a
                href="https://lin.ee/T7OYAGQ"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2 transition hover:border-white/40"
              >
                <MessageCircle className="h-4 w-4" /> LINEで相談
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Togel. All rights reserved.</p>
          <div className="flex flex-col gap-2 text-white/70 sm:flex-row sm:items-center sm:gap-4">
            <span>D-powerAIチーム</span>
            <span className="hidden h-1 w-1 rounded-full bg-white/30 sm:inline-block" aria-hidden />
            <span>全てのサービスにAIを</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
