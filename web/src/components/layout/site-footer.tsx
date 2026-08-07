import Link from "next/link";
import { Mail, MessageCircle } from "lucide-react";

import { TogelMark } from "@/components/brand/togel-mark";
import { MICHELLE_AI_ENABLED, MICHELLE_ATTRACTION_AI_ENABLED } from "@/lib/feature-flags";

const footerLinks = [
  {
    title: "診断",
    links: [
      { label: "診断をはじめる", href: "/diagnosis/select" },
      { label: "ミスマッチランキング", href: "/result/mismatch" },
      { label: "診断結果", href: "/result" },
      { label: "地雷回避ガイド", href: "/coaching" },
    ],
  },
  {
    title: "タイプ",
    links: [
      { label: "24タイプ図鑑", href: "/types" },
      { label: "タイプ分布図", href: "/types/distribution" },
      { label: "Togelについて", href: "/about" },
      ...(MICHELLE_AI_ENABLED ? [{ label: "心理カウンセリング", href: "/michelle" }] : []),
      ...(MICHELLE_ATTRACTION_AI_ENABLED
        ? [{ label: "引き寄せ講座", href: "/michelle/attraction" }]
        : []),
    ],
  },
  {
    title: "規約",
    links: [
      { label: "利用規約", href: "/terms" },
      { label: "プライバシーポリシー", href: "/privacy" },
      { label: "特定商取引法に基づく表記", href: "/tokushoho" },
    ],
  },
];

export const SiteFooter = () => {
  return (
    <footer className="bg-base text-white">
      <div className="mx-auto max-w-6xl px-5.5 py-12 sm:py-14">
        <div className="flex flex-col gap-10 lg:grid lg:grid-cols-4 lg:gap-8">
          {/* ブランディングエリア */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <TogelMark size={40} />
              <div>
                <p className="font-heading text-2xl font-black text-white">Togel</p>
                <p className="mt-0.5 text-[10px] font-bold tracking-[0.16em] text-txt-subtle">
                  運命の人は教えない。地雷なら教える。
                </p>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-txt-muted">
              ビッグファイブ診断で24タイプに分類。
              <br />
              あなたと「絶対に合わない相手」を告げます。
            </p>
            <a
              href="https://lin.ee/T7OYAGQ"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-input bg-linegreen px-5 py-2.5 text-xs font-black text-white transition-all hover:opacity-90 active:scale-[0.98]"
            >
              <MessageCircle className="h-4 w-4" /> LINEでお問い合わせ
            </a>
          </div>

          {/* ナビゲーションリンク */}
          {footerLinks.map((section) => (
            <div key={section.title}>
              <p className="mb-4 text-[10px] font-black uppercase tracking-[0.22em] text-txt-subtle">
                {section.title}
              </p>
              <ul className="space-y-3 text-[11px] font-bold text-txt-subtle">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="transition-colors hover:text-white"
                      target={link.href.startsWith("http") ? "_blank" : undefined}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                {section.title === "規約" && (
                  <li>
                    <a
                      href="mailto:support@to-gel.com"
                      className="flex items-center gap-1.5 transition-colors hover:text-white"
                    >
                      <Mail className="h-3 w-3 flex-shrink-0" /> support@to-gel.com
                    </a>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-line-soft pt-5 text-[11px] text-txt-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Togel. All rights reserved.</p>
          <p className="leading-relaxed">
            本サービスの診断・相性表現はエンターテイメント目的です。18歳以上の方のみご利用いただけます。
          </p>
        </div>
      </div>
      {/* 最下部のハザードテープ */}
      <div className="h-[10px] bg-hazard-sm opacity-50" aria-hidden="true" />
    </footer>
  );
};
