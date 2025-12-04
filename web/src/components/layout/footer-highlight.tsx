import Link from "next/link";
import { ArrowRight, HeartHandshake, MessageCircleHeart, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

const featureHighlights = [
  {
    title: "ミシェル引き寄せAI",
    description: "家庭教師スタイルで意図→実践→内省を並走。進捗と感情を自動保存し、学びの継続をサポートします。",
    accent: "#38bdf8",
    icon: Sparkles,
    href: "/michelle/attraction",
    tags: ["レベル診断", "感情ログ", "自動復元"],
  },
  {
    title: "心理カウンセリング",
    description: "ネガティブ感情の解放やインナーチャイルドケアをAIカウンセラーが伴走し、引き寄せとの架け橋をつくります。",
    accent: "#e11d48",
    icon: HeartHandshake,
    href: "/michelle",
    tags: ["感情トリアージ", "心理学連携", "すぐ相談"],
  },
  {
    title: "Togel診断",
    description: "16タイプのAI性格診断が相性マッチングやキャリア提案まで可視化。結果はマイページで何度でも振り返れます。",
    accent: "#a855f7",
    icon: MessageCircleHeart,
    href: "/diagnosis/select",
    tags: ["16タイプ", "マッチング", "セルフケア"],
  },
];

export const FooterHighlight = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#fff5fb] via-[#f4f7ff] to-white text-[#0f2f4d]">
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/60 to-transparent" aria-hidden />
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.5em] text-[#e91e63]">Journey</p>
          <h2 className="mt-3 text-3xl font-bold text-[#0f2f4d] sm:text-4xl">
            あなたの状態に寄り添う3つの導線
          </h2>
          <p className="mt-3 text-base text-[#4a6076]">
            診断→カウンセリング→引き寄せ講座まで、TogelのAI達が感情と進捗を共有しながらワンストップで伴走します。
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {featureHighlights.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lg shadow-[#e91e63]/5 transition duration-200 hover:-translate-y-1 hover:shadow-2xl"
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${feature.accent}14` }}
              >
                <feature.icon className="h-6 w-6" style={{ color: feature.accent }} />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-[#101828]">{feature.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#4a5667]">{feature.description}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                {feature.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-[#f7f9ff] px-3 py-1 text-[#42506a]">
                    {tag}
                  </span>
                ))}
              </div>
              <Button
                asChild
                variant="ghost"
                className="mt-6 h-11 rounded-2xl border border-[#e4e7ec] px-4 text-sm font-semibold text-[#0f2f4d] hover:bg-[#fef1f7]"
              >
                <Link href={feature.href}>
                  詳しく見る
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Button
            asChild
            className="h-12 rounded-full bg-gradient-to-r from-[#38bdf8] via-[#6c5ce7] to-[#e91e63] px-8 text-base font-semibold text-white shadow-lg shadow-[#38bdf8]/20"
          >
            <Link href="/diagnosis/select">無料で診断を受ける</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-12 rounded-full border-[#f3c5d7] bg-white/70 px-8 text-base font-semibold text-[#c2185b] hover:bg-white"
          >
            <Link href="https://lin.ee/T7OYAGQ">お問い合わせ</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};
