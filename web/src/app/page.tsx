"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const videos = ["/hero-movie.mp4", "/hero-movie-v3.mp4", "/hero-movie-v4.mp4"];
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentVideoIndex((prevIndex) => (prevIndex + 1) % videos.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [videos.length]);

  return (
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
             <p className="text-lg md:text-xl font-medium tracking-wide">
              あなたの本音と相性が一瞬でわかる　<br className="md:hidden" />24タイプTogel型診断+AIマッチング
            </p>
            <Button size="lg" className="h-16 px-12 text-xl">
              LINEで始める
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
            <h1 className="font-heading text-[clamp(6rem,35vw,20rem)] font-bold leading-none tracking-tighter text-black mix-blend-destination-out [-webkit-text-stroke:1px_#E91E63]">
              Togel
            </h1>
            <p className="mt-16 text-[clamp(1.2rem,4vw,4rem)] font-medium tracking-widest text-black mix-blend-destination-out [-webkit-text-stroke:0.5px_#E91E63]">
              トゥゲル
            </p>
          </div>
          
          {/* Description & Button SPACER (INVISIBLE) */}
          <div className="flex flex-col items-center gap-8 opacity-0">
             <p className="text-xl md:text-3xl font-bold tracking-wide leading-relaxed">
              あなたの本音と相性が一瞬でわかる<br />
              24タイプTogel型診断+AIマッチング
            </p>
            <Button size="lg" className="h-16 rounded-full px-12 text-xl">
              LINEで始める
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
             <p className="text-xl md:text-3xl text-[#E91E63] font-bold tracking-wide drop-shadow-sm leading-relaxed">
              あなたの本音と相性が一瞬でわかる<br />
              24タイプTogel型診断+AIマッチング
            </p>

            <Button
              size="lg"
              className="h-16 rounded-full bg-[#06C755] px-12 text-xl font-bold text-white hover:bg-[#05b34c] shadow-xl transition-all hover:scale-105"
              asChild
            >
              <Link href="/diagnosis/select">LINEで始める</Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
