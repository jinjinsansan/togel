"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-6 w-6">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6 1.54 7.38 2.83l5.35-5.22C33.64 3.64 29.27 1.5 24 1.5 14.96 1.5 6.94 6.94 3.54 15.01l6.62 5.14C11.53 13.12 17.2 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.5c0-1.57-.14-3.09-.4-4.56H24v8.66h12.7c-.55 2.82-2.2 5.2-4.7 6.8l7.4 5.73c4.33-3.99 7.1-9.88 7.1-16.63z" />
    <path fill="#FBBC05" d="M10.16 27.15A14.5 14.5 0 0 1 9.5 24c0-1.1.18-2.17.49-3.18l-6.6-5.13A23.94 23.94 0 0 0 2 24c0 3.85.92 7.49 2.54 10.68l6.62-5.53z" />
    <path fill="#34A853" d="M24 46.5c6.27 0 11.53-2.06 15.37-5.62l-7.4-5.73c-2.07 1.39-4.73 2.21-7.97 2.21-6.8 0-12.47-3.62-15.35-9.08l-6.62 5.53C6.94 41.06 14.96 46.5 24 46.5z" />
    <path fill="none" d="M2 2h44v44H2z" />
  </svg>
);

export default function Home() {
  const videos = [
    "https://assets.to-gel.com/hero-movie-optimized.mp4",
    "https://assets.to-gel.com/hero-movie-v3-optimized.mp4",
    "https://assets.to-gel.com/hero-movie-v4-optimized.mp4",
  ];
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentVideoIndex((prevIndex) => (prevIndex + 1) % videos.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [videos.length]);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        console.error("Login error:", error);
        alert("ログインに失敗しました");
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#FFD1DC]">
        {/* 1. Video Background (Carousel) */}
        {videos.map((src, index) => (
          <video
            key={src}
            autoPlay
            loop
            muted
            playsInline
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
              index === currentVideoIndex ? "opacity-100" : "opacity-0"
            }`}
          >
            <source src={src} type="video/mp4" />
          </video>
        ))}

      {/* 2. Pink Background Layer (Screen Blend) */}
      {/* This creates the base pink tint over the video where text isn't present */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#FFD1DC] mix-blend-screen">
        <div className="container flex flex-col items-center gap-12 py-24 text-center">
          {/* Title Block (VISIBLE) - Determines layout */}
          <div className="flex flex-col items-center">
            <h1 className="font-heading text-[clamp(6rem,35vw,20rem)] font-bold leading-none tracking-tighter text-black">
              Togel
            </h1>
            <p className="mt-16 text-[clamp(1.2rem,4vw,4rem)] font-medium tracking-widest text-black">
              トゥゲル
            </p>
          </div>

          {/* Description & Button SPACER (INVISIBLE) - Keeps layout identical to foreground */}
          <div className="flex flex-col items-center gap-8 opacity-0">
             <p className="text-lg md:text-2xl font-bold tracking-wide leading-relaxed">
              あなたの本音と相性が一瞬でわかる<br />
              24タイプTogel型診断+AIマッチング
            </p>
            <Button
              size="lg"
              className="h-16 rounded-full border border-black/10 bg-white px-10 text-xl font-semibold text-[#0f172a] shadow-xl shadow-black/10 transition hover:-translate-y-0.5"
              onClick={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                "接続中..."
              ) : (
                <span className="flex items-center gap-3">
                  <GoogleIcon />
                  Googleで始める
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 3. Cutout Title Layer (Lighten Blend) */}
      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none bg-[#FFD1DC] mix-blend-lighten">
        <div className="container flex flex-col items-center gap-12 py-24 text-center">
          {/* Title Block (VISIBLE with Stroke) */}
          <div className="flex flex-col items-center">
            {/* Text is transparent (destination-out) to show video through, stroke remains */}
            <h1 className="font-heading text-[clamp(6rem,35vw,20rem)] font-bold leading-none tracking-tighter text-black mix-blend-destination-out">
              Togel
            </h1>
            <p className="mt-16 text-[clamp(1.2rem,4vw,4rem)] font-medium tracking-widest text-black mix-blend-destination-out">
              トゥゲル
            </p>
          </div>
          
          {/* Description & Button SPACER (INVISIBLE) */}
          <div className="flex flex-col items-center gap-8 opacity-0">
             <p className="text-lg md:text-2xl text-[#E91E63] font-medium tracking-wide">
              あなたの本音と相性が一瞬でわかる<br />
              24タイプTogel型診断+AIマッチング
            </p>
            <Button
              size="lg"
              className="h-16 rounded-full border border-black/10 bg-white px-10 text-xl font-semibold text-[#0f172a] shadow-xl shadow-black/10"
              onClick={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                "接続中..."
              ) : (
                <span className="flex items-center gap-3">
                  <GoogleIcon />
                  Googleで始める
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 4. Foreground Content Layer (Normal Blend) - For Description & Button */}
      <div className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-none">
        <div className="container flex flex-col items-center gap-12 py-24 text-center">
          {/* Title Block SPACER (INVISIBLE) */}
          <div className="flex flex-col items-center opacity-0">
            <h1 className="font-heading text-[clamp(6rem,35vw,20rem)] font-bold leading-none tracking-tighter">
              Togel
            </h1>
            <p className="mt-16 text-[clamp(1.2rem,4vw,4rem)] font-medium tracking-widest">
              トゥゲル
            </p>
          </div>

          {/* Visible Description & Button */}
          <div className="flex flex-col items-center gap-8 pointer-events-auto">
             <p className="text-lg md:text-2xl text-[#E91E63] font-bold tracking-wide drop-shadow-sm leading-relaxed">
              あなたの本音と相性が一瞬でわかる<br />
              24タイプTogel型診断+AIマッチング
            </p>

            <Button
              size="lg"
              className="h-16 rounded-full border border-black/10 bg-white px-10 text-xl font-semibold text-[#0f172a] shadow-[0_15px_35px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5"
              onClick={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                "接続中..."
              ) : (
                <span className="flex items-center gap-3">
                  <GoogleIcon />
                  Googleで始める
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* SCROLL INDICATOR (New) */}
      <div className="absolute bottom-10 left-1/2 z-50 -translate-x-1/2 animate-bounce text-white/80">
        <span className="text-xs tracking-widest">SCROLL</span>
        <div className="mx-auto mt-2 h-12 w-[1px] bg-white/50">
          <div className="h-full w-full bg-gradient-to-b from-transparent to-white"></div>
        </div>
      </div>

      {/* FADE TO BLACK OVERLAY (New) */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent z-[60] pointer-events-none"></div>
    </main>

    {/* 
      =============================================
      LANDING PAGE CONTENT (from AboutPage)
      =============================================
    */}
    <div className="relative z-50 bg-black text-white selection:bg-pink-500 selection:text-white">
      
      {/* Connecting Section: The Hook */}
      <section className="relative flex min-h-[50vh] flex-col items-center justify-center overflow-hidden px-4 text-center py-24">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-pink-900/20 via-black to-black"></div>
        
        <div className="space-y-6">
          <p className="text-sm font-bold tracking-[0.5em] text-pink-500 uppercase animate-pulse">HOW IT WORKS</p>
          <h2 className="font-heading text-4xl font-black leading-none tracking-tight md:text-6xl lg:text-7xl">
            運命なんて、<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
              計算できる。
            </span>
          </h2>
          <p className="mx-auto max-w-md text-lg text-gray-400 md:text-xl leading-relaxed [text-wrap:balance]">
            Togelは、あなたの「本性」を暴き出し、<br className="hidden md:block" />
            最高の相性と最悪の結末を予言する<br className="hidden md:block" />
            AIマッチングサービスです。
          </p>
        </div>
      </section>

      {/* Step 1: Diagnosis */}
      <section className="relative py-16 md:py-32">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:gap-12 md:grid-cols-2 md:items-center">
            <div className="relative aspect-square w-full max-w-[300px] md:max-w-md mx-auto rounded-3xl bg-gradient-to-br from-gray-900 to-black border border-gray-800 p-8 flex items-center justify-center shadow-2xl shadow-pink-900/20">
              <div className="text-7xl md:text-9xl animate-pulse">🧠</div>
              <div className="absolute -top-4 -right-4 bg-pink-600 text-white px-4 py-1 md:px-6 md:py-2 text-lg md:text-xl font-bold rounded-full transform rotate-12">
                5分で完了
              </div>
            </div>
            <div className="space-y-4 md:space-y-6 text-center md:text-left flex flex-col items-center md:items-start">
              <div className="inline-block rounded-full bg-gray-900 px-4 py-1 text-sm font-bold text-gray-400 border border-gray-800">
                STEP 01
              </div>
              <h2 className="text-3xl font-black md:text-6xl">
                まずは<br />
                <span className="text-pink-500">診断</span>する。
              </h2>
              <p className="text-lg md:text-xl text-gray-400 leading-relaxed [text-wrap:balance]">
                独自Togel型理論に基づいた<br className="inline md:hidden" />本格的な性格診断。<br className="hidden md:inline" />
                質問に答えるだけで、<br className="inline md:hidden" />あなたの考え方のクセ、恋愛傾向、<br className="inline md:hidden" />隠れた本性が丸裸に。
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
      <section className="relative py-16 md:py-32 bg-gray-950/50">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:gap-12 md:grid-cols-2 md:items-center md:flex-row-reverse">
            <div className="md:order-2 relative aspect-square w-full max-w-[300px] md:max-w-md mx-auto rounded-3xl bg-gradient-to-br from-gray-900 to-black border border-gray-800 p-8 flex flex-col items-center justify-center shadow-2xl text-center">
              <div className="text-7xl md:text-8xl mb-4">🐯</div>
              <div className="text-xl md:text-2xl font-bold text-white">Togel 05型</div>
              <div className="text-pink-500 font-black text-3xl md:text-4xl">情熱的リーダー</div>
            </div>
            <div className="space-y-4 md:space-y-6 md:order-1 text-center md:text-left flex flex-col items-center md:items-start">
              <div className="inline-block rounded-full bg-gray-900 px-4 py-1 text-sm font-bold text-gray-400 border border-gray-800">
                STEP 02
              </div>
              <h2 className="text-3xl font-black md:text-6xl">
                <span className="text-purple-500">24タイプ</span><br />
                に分類。
              </h2>
              <p className="text-lg md:text-xl text-gray-400 leading-relaxed [text-wrap:balance]">
                診断結果から、あなたを<br className="inline md:hidden" />24種類の「Togel型」に分類。<br />
                自分でも気づいていなかった<br className="inline md:hidden" />強みや弱み、相性の良いタイプが<br className="inline md:hidden" />明確になります。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Step 3: Matching */}
      <section className="relative py-16 md:py-32">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:gap-12 md:grid-cols-2 md:items-center">
            <div className="relative w-full max-w-[300px] md:max-w-md mx-auto">
              {/* Card Stack Effect */}
              <div className="absolute top-0 left-0 w-full h-full bg-gray-800 rounded-3xl transform rotate-6 opacity-30"></div>
              <div className="absolute top-0 left-0 w-full h-full bg-gray-800 rounded-3xl transform -rotate-3 opacity-60"></div>
              <div className="relative rounded-3xl bg-gradient-to-br from-white to-gray-100 p-6 text-black shadow-2xl transform transition-transform hover:scale-105">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-4xl">👩</div>
                  <div className="text-3xl font-black text-pink-600">98%</div>
                </div>
                <h3 className="text-xl md:text-2xl font-bold">運命の相手候補</h3>
                <p className="text-xs md:text-sm text-gray-600 mt-2 [text-wrap:balance]">
                  あなたのアクティブさと、相手の慎重さが完璧に補完し合う関係です。
                </p>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-xs font-bold text-gray-400 uppercase">ADVICE</div>
                  <p className="font-bold mt-1 text-sm md:text-base">初デートは静かなカフェで☕️</p>
                </div>
              </div>
            </div>
            <div className="space-y-4 md:space-y-6 text-center md:text-left flex flex-col items-center md:items-start">
              <div className="inline-block rounded-full bg-gray-900 px-4 py-1 text-sm font-bold text-gray-400 border border-gray-800">
                STEP 03
              </div>
              <h2 className="text-3xl font-black md:text-6xl">
                AIが<br />
                <span className="text-blue-500">導き出す。</span>
              </h2>
              <p className="text-lg md:text-xl text-gray-400 leading-relaxed [text-wrap:balance]">
                相性の良い異性5名をピックアップ。<br />
                単なるスコアだけでなく、<br className="inline md:hidden" />「なぜ合うのか」<br className="inline md:hidden" />「どんなデートをすべきか」まで<br className="inline md:hidden" />具体的に提案します。
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
            <p className="text-xl text-red-200/80 leading-relaxed [text-wrap:balance]">
              このサイトの最大の特徴は<br className="inline md:hidden" />「ミスマッチランキング」。<br />
              あなたと絶対に合わない、<br className="inline md:hidden" />付き合うと不幸になる相手も教えます。<br />
              失敗しない恋愛のために、<br className="inline md:hidden" />これも必ずチェックしてください。
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
          <div className="flex justify-center">
            <Button 
              asChild 
              size="lg" 
              className="h-20 rounded-full bg-white px-12 text-2xl font-black text-[#E91E63] hover:bg-gray-200 hover:scale-105 transition-all shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)]"
            >
              <Link href="/diagnosis/select">
                今すぐ診断する
              </Link>
            </Button>
          </div>
        </div>
      </section>

    </div>
    </>
  );
}
