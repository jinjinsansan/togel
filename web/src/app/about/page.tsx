"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

// Framer Motionが入っていない可能性が高いので、一旦標準のCSS/Tailwindアニメーションと
// スクロールスナップなどを活用した実装にします。

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-pink-500 selection:text-white">
      
      {/* Hero Section */}
      <section className="relative flex h-screen flex-col items-center justify-center overflow-hidden px-4 text-center">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-pink-900/20 via-black to-black"></div>
        
        <div className="animate-fade-in-up space-y-6">
          <p className="text-sm font-bold tracking-[0.5em] text-pink-500 uppercase">HOW TO USE</p>
          <h1 className="font-heading text-5xl font-black leading-none tracking-tight md:text-7xl lg:text-8xl">
            運命なんて、<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
              計算できる。
            </span>
          </h1>
          <p className="mx-auto max-w-md text-lg text-gray-400 md:text-xl">
            Togelは、あなたの「本性」を暴き出し、<br />
            最高の相性と最悪の結末を予言する<br />
            AIマッチングサービスです。
          </p>
        </div>

        <div className="absolute bottom-10 animate-bounce text-gray-500">
          <span className="text-xs tracking-widest">SCROLL</span>
          <div className="mx-auto mt-2 h-12 w-[1px] bg-gray-800">
            <div className="h-full w-full bg-gradient-to-b from-transparent to-pink-500"></div>
          </div>
        </div>
      </section>

      {/* Step 1: Diagnosis */}
      <section className="relative py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div className="relative aspect-square w-full max-w-md mx-auto rounded-3xl bg-gradient-to-br from-gray-900 to-black border border-gray-800 p-8 flex items-center justify-center shadow-2xl shadow-pink-900/20">
              <div className="text-9xl animate-pulse">🧠</div>
              <div className="absolute -top-4 -right-4 bg-pink-600 text-white px-6 py-2 text-xl font-bold rounded-full transform rotate-12">
                5分で完了
              </div>
            </div>
            <div className="space-y-6">
              <div className="inline-block rounded-full bg-gray-900 px-4 py-1 text-sm font-bold text-gray-400 border border-gray-800">
                STEP 01
              </div>
              <h2 className="text-4xl font-black md:text-6xl">
                まずは<br />
                <span className="text-pink-500">診断</span>する。
              </h2>
              <p className="text-xl text-gray-400 leading-relaxed">
                ビッグファイブ理論に基づいた本格的な性格診断。<br />
                質問に答えるだけで、あなたの考え方のクセ、恋愛傾向、隠れた本性が丸裸に。
              </p>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-center gap-3">
                  <span className="text-pink-500 text-xl">✓</span>
                  <span>面倒な登録は不要</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-pink-500 text-xl">✓</span>
                  <span>直感で選ぶだけ</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Step 2: Result */}
      <section className="relative py-24 md:py-32 bg-gray-950/50">
        <div className="container mx-auto px-4">
          <div className="grid gap-12 md:grid-cols-2 md:items-center md:flex-row-reverse">
            <div className="md:order-2 relative aspect-square w-full max-w-md mx-auto rounded-3xl bg-gradient-to-br from-gray-900 to-black border border-gray-800 p-8 flex flex-col items-center justify-center shadow-2xl text-center">
              <div className="text-8xl mb-4">🐯</div>
              <div className="text-2xl font-bold text-white">TOGEL 05型</div>
              <div className="text-pink-500 font-black text-4xl">情熱的リーダー</div>
            </div>
            <div className="space-y-6 md:order-1">
              <div className="inline-block rounded-full bg-gray-900 px-4 py-1 text-sm font-bold text-gray-400 border border-gray-800">
                STEP 02
              </div>
              <h2 className="text-4xl font-black md:text-6xl">
                <span className="text-purple-500">24タイプ</span><br />
                に分類。
              </h2>
              <p className="text-xl text-gray-400 leading-relaxed">
                診断結果から、あなたを24種類の「TOGEL型」に分類。<br />
                自分でも気づいていなかった強みや弱み、相性の良いタイプが明確になります。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Step 3: Matching */}
      <section className="relative py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div className="relative w-full max-w-md mx-auto">
              {/* Card Stack Effect */}
              <div className="absolute top-0 left-0 w-full h-full bg-gray-800 rounded-3xl transform rotate-6 opacity-30"></div>
              <div className="absolute top-0 left-0 w-full h-full bg-gray-800 rounded-3xl transform -rotate-3 opacity-60"></div>
              <div className="relative rounded-3xl bg-gradient-to-br from-white to-gray-100 p-6 text-black shadow-2xl transform transition-transform hover:scale-105">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-4xl">👩</div>
                  <div className="text-3xl font-black text-pink-600">98%</div>
                </div>
                <h3 className="text-2xl font-bold">運命の相手候補</h3>
                <p className="text-sm text-gray-600 mt-2">
                  あなたのアクティブさと、相手の慎重さが完璧に補完し合う関係です。
                </p>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-xs font-bold text-gray-400 uppercase">ADVICE</div>
                  <p className="font-bold mt-1">初デートは静かなカフェで☕️</p>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="inline-block rounded-full bg-gray-900 px-4 py-1 text-sm font-bold text-gray-400 border border-gray-800">
                STEP 03
              </div>
              <h2 className="text-4xl font-black md:text-6xl">
                AIが<br />
                <span className="text-blue-500">導き出す。</span>
              </h2>
              <p className="text-xl text-gray-400 leading-relaxed">
                相性の良い異性5名をピックアップ。<br />
                単なるスコアだけでなく、「なぜ合うのか」「どんなデートをすべきか」まで具体的に提案します。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Step 4: Mismatch (Warning) */}
      <section className="relative py-24 md:py-32 bg-red-950/20 border-y border-red-900/20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-red-900/30 px-6 py-2 text-sm font-bold text-red-500 border border-red-900/50">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              WARNING FEATURE
            </div>
            <h2 className="text-4xl font-black md:text-7xl">
              <span className="text-red-600">地獄</span>を<br />
              回避せよ。
            </h2>
            <p className="text-xl text-red-200/80 leading-relaxed">
              このサイトの最大の特徴は「ミスマッチランキング」。<br />
              あなたと絶対に合わない、付き合うと不幸になる相手も教えます。<br />
              失敗しない恋愛のために、これも必ずチェックしてください。
            </p>
            <div className="pt-8">
              <div className="text-6xl md:text-8xl animate-bounce">💀</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-32 text-center overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-pink-900/40 via-black to-black"></div>
        
        <div className="container mx-auto px-4 space-y-10">
          <h2 className="text-4xl font-black md:text-6xl">
            準備はいいですか？
          </h2>
          <p className="text-xl text-gray-400">
            あなたの本当の姿と、運命の相手を知る旅へ。
          </p>
          
          <div className="flex justify-center">
            <Button 
              asChild 
              size="lg" 
              className="h-20 rounded-full bg-white px-12 text-2xl font-black text-black hover:bg-gray-200 hover:scale-105 transition-all shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)]"
            >
              <Link href="/diagnosis/select">
                今すぐ診断する
              </Link>
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            ※ 完全無料・登録不要
          </p>
        </div>
      </section>

    </div>
  );
}
