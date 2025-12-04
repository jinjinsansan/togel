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
      <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-10 sm:gap-12 lg:grid lg:grid-cols-4 lg:gap-8">
          {/* ブランディングエリア */}
          <div className="space-y-4 sm:space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#E91E63] to-[#C2185B] shadow-lg shadow-[#E91E63]/30">
                <span className="font-heading text-xl sm:text-2xl font-bold text-white">T</span>
              </div>
              <div>
                <p className="font-heading text-2xl sm:text-3xl font-semibold text-white">Togel</p>
                <p className="text-xs text-white/50">24タイプ性格診断AI</p>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
              あなたの本音と相性が一瞬でわかる<br />24タイプTogel型診断+AIマッチング
            </p>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 sm:px-4 py-1 text-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-300" aria-hidden />
                稼働中
              </span>
              <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 sm:px-4 py-1 text-white/70">
                <ShieldCheck className="h-3 w-3 sm:h-4 sm:w-4" /> SLA 99.9%
              </span>
            </div>
            <a
              href="https://lin.ee/T7OYAGQ"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-[#06C755] to-[#00B900] px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-[#06C755]/20 hover:shadow-xl hover:shadow-[#06C755]/30 transition-all active:scale-[0.98]"
            >
              <MessageCircle className="h-4 w-4" /> LINEでお問い合わせ
            </a>
          </div>

          {/* ナビゲーションリンク */}
          {footerLinks.map((section) => (
            <div key={section.title}>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/50 mb-4">{section.title}</p>
              <ul className="space-y-3 text-sm text-white/70">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="hover:text-white transition-colors"
                      target={link.href.startsWith("http") ? "_blank" : undefined}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* コンタクト */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/50 mb-4">Contact</p>
            <div className="space-y-3 text-sm text-white/70">
              <a href="mailto:info@to-gel.com" className="flex items-center gap-2 hover:text-white transition-colors">
                <Mail className="h-4 w-4 flex-shrink-0" /> 
                <span className="truncate">info@to-gel.com</span>
              </a>
              <a
                href="https://lin.ee/T7OYAGQ"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 hover:text-white transition-colors"
              >
                <MessageCircle className="h-4 w-4 flex-shrink-0" /> LINEで相談
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 sm:mt-10 flex flex-col gap-3 sm:gap-4 border-t border-white/10 pt-5 sm:pt-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
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
