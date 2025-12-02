import Link from "next/link";

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
    <div className="bg-gradient-to-b from-white via-pink-50/40 to-white">
      <section className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-20 lg:flex-row lg:items-center">
        <div className="space-y-6 lg:w-1/2">
          <span className="inline-flex items-center rounded-full border border-pink-200 bg-white px-4 py-1 text-xs font-semibold text-pink-600">
            新機能
          </span>
          <h1 className="text-4xl font-black leading-tight text-slate-900 lg:text-5xl">
            ミシェル心理学 × Togel<br />心の思い込みをほどくAIカウンセリング
          </h1>
          <p className="text-base leading-relaxed text-slate-600">
            ミシェル心理学で培ったカウンセリング知見と最先端のLLMを掛け合わせ、単なる占いや診断ではなく「気づき」と「伴走」を提供するAIを搭載しました。
            状況の整理から感情の分解、次のアクション設計まで、あなたのペースで寄り添います。
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="h-14 rounded-2xl bg-gradient-to-r from-[#E91E63] to-[#D81B60] text-base font-bold shadow-lg" asChild>
              <Link href="/michelle/chat">カウンセリングを始める</Link>
            </Button>
            <Button size="lg" variant="outline" className="h-14 rounded-2xl border-slate-300 text-base font-semibold text-slate-700" asChild>
              <Link href="#features">ミシェル心理学とは？</Link>
            </Button>
          </div>
          <ul className="grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
            {[
              "思考・感情・行動の3層分析",
              "独自のRAGで3万字以上の知識を参照",
              "毎セッションの記録を安全に保存",
              "相性診断データとも連携予定",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 rounded-xl border border-white/40 bg-white/70 px-4 py-3 shadow-sm">
                <span className="text-pink-500">●</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative lg:w-1/2">
          <div className="relative overflow-hidden rounded-[32px] border border-white/60 bg-white/70 shadow-2xl">
            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#E91E63]/10 to-transparent" />
            <div className="overflow-hidden rounded-[32px] border border-pink-100 bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-pink-400">MICHELLE AI</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                「そのモヤモヤ、どこから来ていますか？」
                <br />
                ミシェルAIは問いかけと要約を繰り返しながら、心の奥にある“思い込み”を優しくほどいていきます。
              </p>
              <div className="mt-6 rounded-2xl border border-pink-100 bg-gradient-to-br from-white to-pink-50/80 p-4 text-sm text-slate-700">
                <p className="font-semibold text-pink-600">想定フロー</p>
                <ol className="mt-3 space-y-2 text-xs text-slate-600">
                  <li>1. 状況の棚卸し（問いかけ）</li>
                  <li>2. 感情の分解と命名</li>
                  <li>3. 思い込み仮説の提示</li>
                  <li>4. 日常で試せるワークの提案</li>
                </ol>
              </div>
            </div>
          </div>
          <div className="absolute -top-8 -right-6 h-32 w-32 rounded-full bg-pink-200/40 blur-3xl" />
          <div className="absolute -bottom-8 -left-4 h-24 w-24 rounded-full bg-purple-200/30 blur-2xl" />
        </div>
      </section>

      <section id="features" className="mx-auto grid max-w-6xl gap-8 px-6 pb-24 lg:grid-cols-3">
        {["思考を整える","感情を受け止める","行動につなげる"].map((title, index) => (
          <div key={title} className="rounded-3xl border border-white/50 bg-white/80 p-6 shadow-lg">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-pink-400">Phase {index + 1}</p>
            <h2 className="mt-4 text-2xl font-bold text-slate-900">{title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {index === 0 && "出来事・言葉・事実を丁寧に分解し、混ざった感情を整理します。"}
              {index === 1 && "感情の根っこにある“思い込み”を仮説として提示し、新しい視点を提案します。"}
              {index === 2 && "すぐ試せる具体的な行動やセルフワークを提案し、次の一歩をサポートします。"}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
