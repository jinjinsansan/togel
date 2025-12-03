import Link from "next/link";
import { CheckCircle2, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MICHELLE_ATTRACTION_AI_ENABLED } from "@/lib/feature-flags";

export default function MichelleAttractionLandingPage() {
  if (!MICHELLE_ATTRACTION_AI_ENABLED) {
    return (
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h1 className="text-3xl font-black text-slate-900">ミシェル引き寄せは準備中です</h1>
        <p className="mt-4 text-sm text-slate-500">公開までしばらくお待ちください。</p>
      </section>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-slate-100">
      <section className="relative overflow-hidden pt-20 pb-16 lg:pt-32">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="flex flex-col lg:flex-row gap-12 lg:items-start">
            <div className="lg:w-1/2 space-y-8">
              <div>
                <p className="text-xs font-bold tracking-[0.3em] text-sky-500 mb-4 uppercase">Manifest</p>
                <h1 className="font-heading text-4xl md:text-6xl font-black text-slate-900 leading-tight mb-6">
                  ミシェル引き寄せ<br />
                  <span className="text-3xl md:text-5xl text-slate-700">×</span><br />
                  <span className="text-sky-500">AIカウンセリング</span>
                </h1>
                <p className="text-lg text-slate-600 leading-relaxed">
                  日々揺らぐ感情や思考を整え、望む未来を現実へと引き寄せるためのAI伴走チャットです。
                  ミシェル心理学の問いかけ力に、引き寄せの法則に特化したRAGを掛け合わせました。
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="h-14 px-8 rounded-full bg-sky-500 hover:bg-sky-400 text-white text-base font-bold shadow-lg shadow-sky-200 transition-all hover:scale-105"
                  asChild
                >
                  <Link href="/michelle/attraction/chat">
                    <MessageCircle className="mr-2 h-5 w-5" />
                    チャットを始める
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 px-8 rounded-full border-2 border-slate-200 bg-white hover:bg-slate-50 hover:text-sky-500 text-base font-bold text-slate-700 transition-all"
                  asChild
                >
                  <Link href="#features">ミシェル引き寄せとは？</Link>
                </Button>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  "願望を心の中心に据えるガイドライン",
                  "100本以上の引き寄せレクチャーをLLMに埋め込み",
                  "感情と波動を整える即席ワーク",
                  "目標の再定義と行動計画まで伴走",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 bg-white/60 p-3 rounded-xl border border-slate-100 shadow-sm"
                  >
                    <CheckCircle2 className="h-5 w-5 text-sky-500 flex-shrink-0" />
                    <span className="text-sm font-bold text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:w-1/2 relative mt-8 lg:mt-0">
              <div className="relative z-10 rounded-3xl bg-white p-8 shadow-2xl shadow-slate-200/50 border border-slate-100">
                <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                  <span className="text-xs font-bold tracking-[0.3em] text-slate-400 uppercase">MICHELLE ATTRACT</span>
                  <span className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-600">
                    BETA
                  </span>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 mb-3">「叶えたい未来、何度でも描き直そう」</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      思考・感情・行動の波長を揃えるステップをAIが提示。迷った時に戻れる自分専用マニュアルをその場で生成します。
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    <p className="text-sm font-bold text-sky-600 mb-4 flex items-center gap-2">
                      <span className="block w-1.5 h-4 bg-sky-500 rounded-full"></span>
                      マニフェストフロー
                    </p>
                    <div className="space-y-4">
                      {[
                        { step: "01", text: "願望と背景ストーリーを言語化" },
                        { step: "02", text: "制限的思考を書き換える" },
                        { step: "03", text: "波動を整えるセルフワーク" },
                        { step: "04", text: "行動・受け取りのシグナル設計" },
                      ].map((flow) => (
                        <div key={flow.step} className="flex items-center gap-4">
                          <span className="text-xs font-black text-slate-300 font-mono">{flow.step}</span>
                          <span className="text-sm font-bold text-slate-700">{flow.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -top-10 -right-10 w-64 h-64 bg-sky-200/30 rounded-full blur-3xl -z-10" />
              <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-indigo-200/30 rounded-full blur-3xl -z-10" />
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white border-y border-slate-100">
        <div className="container px-4 mx-auto max-w-4xl">
          <div className="bg-slate-50 rounded-3xl p-8 md:p-12 text-center border border-slate-100 shadow-inner">
            <h2 className="font-heading text-2xl md:text-3xl font-black text-slate-900 mb-8">
              ミシェル心理学との<span className="text-sky-500">ハイブリッドAI</span>
            </h2>
            <div className="space-y-6 text-slate-700 font-medium leading-loose">
              <p>
                心理的課題を分析する「ミシェル心理学」と、現実創造にフォーカスする「引き寄せ」は両輪です。
                どちらか一方ではなく、両方を切り替えながら使うことで心も現実も整っていきます。
              </p>
              <p className="text-lg">
                ミシェル引き寄せでは、願望設定・波動調整・アファメーション設計などをAIが即時に提案。
                今日からできる小さな習慣も一緒にデザインします。
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 container px-4 mx-auto">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {[
            {
              phase: "Phase 1",
              title: "意図を定める",
              desc: "本当に叶えたいものを確認し、願望・感情・背景を丁寧に分解します。",
              icon: "✨",
            },
            {
              phase: "Phase 2",
              title: "波動を整える",
              desc: "制限的信念の書き換えやアファメーション生成で心の周波数を整えます。",
              icon: "🌊",
            },
            {
              phase: "Phase 3",
              title: "受け取る準備",
              desc: "小さな行動計画と受信サインを明確化し、行動と感情をリンクさせます。",
              icon: "🎯",
            },
          ].map((feature) => (
            <div
              key={feature.phase}
              className="group relative flex flex-col overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-200/50 transition-all hover:-translate-y-1 hover:shadow-2xl border border-slate-100"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                    {feature.phase}
                  </span>
                  <span className="text-2xl">{feature.icon}</span>
                </div>
                <h3 className="font-heading text-2xl font-black text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed font-medium">{feature.desc}</p>
              </div>
              <div className="mt-auto h-1.5 w-full bg-gradient-to-r from-slate-100 via-sky-300/40 to-slate-100 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
