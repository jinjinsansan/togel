import Link from "next/link";
import { CheckCircle2, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MICHELLE_AI_ENABLED } from "@/lib/feature-flags";

export default function MichelleLandingPage() {
  if (!MICHELLE_AI_ENABLED) {
    return (
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h1 className="text-3xl font-black text-slate-900">ミシェル心理学は準備中です</h1>
        <p className="mt-4 text-sm text-slate-500">
          現在ミシェルAIの統合を準備しています。公開までしばらくお待ちください。
        </p>
      </section>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16 lg:pt-32">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="flex flex-col lg:flex-row gap-12 lg:items-start">
            {/* Left Column: Content */}
            <div className="lg:w-1/2 space-y-8">
              <div>
                <p className="text-xs font-bold tracking-[0.3em] text-[#E91E63] mb-4 uppercase">
                  New Feature
                </p>
                <h1 className="font-heading text-4xl md:text-6xl font-black text-slate-900 leading-tight mb-6">
                  ミシェル心理学<br />
                  <span className="text-3xl md:text-5xl text-slate-700">×</span><br />
                  <span className="text-[#E91E63]">AIカウンセリング</span>
                </h1>
                <p className="text-lg text-slate-600 leading-relaxed">
                  ミシェル心理学で培ったカウンセリング知見と最先端のLLMを掛け合わせ、単なる占いや診断ではなく「気づき」と「伴走」を提供するAIを搭載しました。
                  状況の整理から感情の分解、次のアクション設計まで、あなたのペースで寄り添います。
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="h-14 px-8 rounded-full bg-[#E91E63] hover:bg-[#D81B60] text-white text-base font-bold shadow-lg shadow-pink-200 transition-all hover:scale-105" asChild>
                  <Link href="/michelle/chat">
                    <MessageCircle className="mr-2 h-5 w-5" />
                    カウンセリングを始める
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 rounded-full border-2 border-slate-200 bg-white hover:bg-slate-50 hover:text-[#E91E63] text-base font-bold text-slate-700 transition-all" asChild>
                  <Link href="#features">ミシェル心理学とは？</Link>
                </Button>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  "苦しい感情の原因は心の中にある",
                  "ミシェルAIの知識は講義動画100本分",
                  "秘匿性守秘義務完備",
                  "Togel型診断と連携予定",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 bg-white/60 p-3 rounded-xl border border-slate-100 shadow-sm">
                    <CheckCircle2 className="h-5 w-5 text-[#E91E63] flex-shrink-0" />
                    <span className="text-sm font-bold text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Visual/Card */}
            <div className="lg:w-1/2 relative mt-8 lg:mt-0">
              <div className="relative z-10 rounded-3xl bg-white p-8 shadow-2xl shadow-slate-200/50 border border-slate-100">
                <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                  <span className="text-xs font-bold tracking-[0.3em] text-slate-400 uppercase">MICHELLE AI</span>
                  <span className="inline-flex items-center rounded-full bg-pink-50 px-3 py-1 text-xs font-bold text-[#E91E63]">
                    BETA
                  </span>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 mb-3">
                      「そのモヤモヤ、<br/>どこから来ていますか？」
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      ミシェルAIは問いかけと要約を繰り返しながら、心の奥にある“思い込み”を優しくほどいていきます。
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    <p className="text-sm font-bold text-[#E91E63] mb-4 flex items-center gap-2">
                      <span className="block w-1.5 h-4 bg-[#E91E63] rounded-full"></span>
                      カウンセリングフロー
                    </p>
                    <div className="space-y-4">
                      {[
                        { step: "01", text: "現在の状況ヒアリング" },
                        { step: "02", text: "感情の整理整頓" },
                        { step: "03", text: "意味づけを探る" },
                        { step: "04", text: "気づきを促すフェーズ" },
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
              
              {/* Decorative elements matching /types/page style */}
              <div className="absolute -top-10 -right-10 w-64 h-64 bg-[#E91E63]/5 rounded-full blur-3xl -z-10" />
              <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Text Section */}
      <section className="py-16 bg-white border-y border-slate-100">
        <div className="container px-4 mx-auto max-w-4xl">
          <div className="bg-slate-50 rounded-3xl p-8 md:p-12 text-center border border-slate-100 shadow-inner">
            <h2 className="font-heading text-2xl md:text-3xl font-black text-slate-900 mb-8">
              他のAIとの<span className="text-[#E91E63]">決定的な違い</span>
            </h2>
            <div className="space-y-6 text-slate-700 font-medium leading-loose">
              <p>
                通常のchatGPTやGeminiなどの大規模自然言語モデルのAIでも
                占い、心理カウンセリング、愚痴聞きなどを行えますが、
                それらは全てユーザーに忖度した形で耳障りの良い言葉の羅列です。
              </p>
              <p className="text-lg">
                ミシェル心理学では一般的な心理学やAIとは全く異なる視点で
                心理学を論理化しています。<br className="hidden md:block"/>
                お気軽にミシェルに語りかけてみてください。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 container px-4 mx-auto">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {[
            {
              phase: "Phase 1",
              title: "思考を整える",
              desc: "出来事・言葉・事実を丁寧に分解し、混ざった感情を整理します。",
              icon: "🧠"
            },
            {
              phase: "Phase 2",
              title: "感情を受け止める",
              desc: "感情の根っこにある“思い込み”を仮説として提示し、新しい視点を提案します。",
              icon: "❤️"
            },
            {
              phase: "Phase 3",
              title: "行動につなげる",
              desc: "すぐ試せる具体的な行動やセルフワークを提案し、次の一歩をサポートします。",
              icon: "👣"
            }
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
                <h3 className="font-heading text-2xl font-black text-slate-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-slate-600 leading-relaxed font-medium">
                  {feature.desc}
                </p>
              </div>
              <div className="mt-auto h-1.5 w-full bg-gradient-to-r from-slate-100 via-[#E91E63]/20 to-slate-100 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
