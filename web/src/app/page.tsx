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
  const [authError, setAuthError] = useState<string | null>(null);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentVideoIndex((prevIndex) => (prevIndex + 1) % videos.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [videos.length]);

  // OAuthコールバックからのエラーをユーザーに表示する（従来は無言で失敗していた）
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (!err) return;
    const messages: Record<string, string> = {
      oauth_error: "ログインに失敗しました。もう一度お試しください。",
      session_error: "セッションの作成に失敗しました。もう一度お試しください。",
      no_code: "認証情報が取得できませんでした。もう一度お試しください。",
    };
    setAuthError(messages[err] ?? "ログイン中にエラーが発生しました。もう一度お試しください。");
    // URLからエラーパラメータを除去
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  const handleLogin = async () => {
    setIsLoading(true);
    const redirectTo = `${window.location.origin}/auth/callback`;

    console.log("[Landing Login] Starting OAuth flow", {
      redirectTo,
      origin: window.location.origin,
      userAgent: navigator.userAgent,
    });

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
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
      {authError && (
        <div className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
          <div
            role="alert"
            className="flex w-full max-w-md items-start gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm text-white shadow-lg"
          >
            <span className="flex-1">{authError}</span>
            <button
              type="button"
              onClick={() => setAuthError(null)}
              aria-label="閉じる"
              className="shrink-0 font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}
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
      LANDING: HOW IT WORKS → STEP 01-04 → CTA
      （リデザイン: Togel.dc.html プロトタイプ準拠 / モバイルファースト）
      =============================================
    */}
    <div className="relative z-50 bg-[#0d0f14] text-white selection:bg-pink-500 selection:text-white">

      {/* Hook */}
      <section className="relative overflow-hidden px-6 py-16 text-center">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(233,30,99,0.18),_transparent_60%)]" />
        <p className="animate-pulse text-xs font-extrabold uppercase tracking-[0.45em] text-[#E91E63]">
          HOW IT WORKS
        </p>
        <h2 className="mt-5 font-heading text-3xl font-black leading-[1.15] md:text-5xl">
          運命なんて、
          <br />
          <span className="bg-gradient-to-r from-[#ff5a96] to-[#a86bff] bg-clip-text text-transparent">
            計算できる。
          </span>
        </h2>
        <p className="mx-auto mt-5 max-w-sm text-sm leading-[1.9] text-gray-400 md:text-base">
          Togelは、あなたの「本性」を暴き出し、最高の相性と最悪の結末を予言するAIマッチングサービス。
        </p>
      </section>

      {/* Steps */}
      {[
        { step: "STEP 01", emoji: "🧠", titleA: "まずは", titleB: "診断", accent: "#E91E63", bg: "#0d0f14", body: "独自Togel型理論に基づく本格診断。質問に答えるだけで、考え方のクセ・恋愛傾向・隠れた本性が丸裸に。" },
        { step: "STEP 02", emoji: "🐯", titleA: "24タイプ", titleB: "に分類", accent: "#a86bff", bg: "#101319", body: "診断結果から、あなたを24種類の「Togel型」に分類。強み・弱み・相性の良いタイプが明確に。" },
        { step: "STEP 03", emoji: "💘", titleA: "AIが", titleB: "導き出す", accent: "#4A90E2", bg: "#0d0f14", body: "相性の良い異性5名をピックアップ。「なぜ合うのか」「どんなデートをすべきか」まで具体提案。", hasCard: true },
        { step: "STEP 04", emoji: "💀", titleA: "地獄を", titleB: "回避せよ", accent: "#ff5252", bg: "#1a0e12", body: "最大の特徴は「ミスマッチランキング」。絶対に合わない、付き合うと不幸になる相手も教えます。" },
      ].map((s) => (
        <section
          key={s.step}
          className="border-t border-white/5 px-6 py-12 text-center"
          style={{ background: s.bg }}
        >
          <div className="inline-block rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1 text-xs font-extrabold tracking-wide text-gray-400">
            {s.step}
          </div>
          <div className="my-4 animate-bounce text-6xl">{s.emoji}</div>
          <h3 className="text-3xl font-black leading-[1.15]">
            {s.titleA}
            <span style={{ color: s.accent }}>{s.titleB}</span>
          </h3>
          <p className="mx-auto mt-3.5 max-w-sm text-sm leading-[1.9] text-gray-400">
            {s.body}
          </p>

          {s.hasCard && (
            <div className="mx-auto mt-6 max-w-[280px] rounded-[22px] bg-gradient-to-br from-white to-[#f4f5f7] p-[18px] text-left text-black shadow-[0_20px_40px_-16px_rgba(233,30,99,0.5)]">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[34px]">👩</span>
                <span className="text-[26px] font-black text-[#E91E63]">98%</span>
              </div>
              <div className="text-[17px] font-extrabold">運命の相手候補</div>
              <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
                あなたのアクティブさと、相手の慎重さが完璧に補完し合う関係。
              </p>
              <div className="mt-3 border-t border-gray-200 pt-3">
                <div className="text-[10px] font-extrabold tracking-wider text-gray-400">ADVICE</div>
                <div className="mt-0.5 text-[13px] font-extrabold">初デートは静かなカフェで ☕️</div>
              </div>
            </div>
          )}
        </section>
      ))}

      {/* CTA */}
      <section className="relative overflow-hidden px-6 py-20 text-center">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(100%_80%_at_50%_0%,_rgba(233,30,99,0.4),_#0d0f14_60%)]" />
        <h2 className="mb-7 text-3xl font-black md:text-4xl">準備はいいですか？</h2>
        <div className="flex justify-center">
          <Button
            asChild
            size="lg"
            className="h-16 w-full max-w-[320px] rounded-full bg-white text-xl font-black text-[#E91E63] shadow-[0_0_50px_-8px_rgba(255,255,255,0.6)] transition-all hover:scale-105 hover:bg-gray-100"
          >
            <Link href="/diagnosis/select">今すぐ診断する</Link>
          </Button>
        </div>
        <p className="mt-4 text-[11px] text-white/50">※ エンタメ目的の診断です</p>
      </section>

    </div>
    </>
  );
}
