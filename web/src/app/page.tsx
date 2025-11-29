import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#FFD1DC]">
      {/* 1. Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src="/hero-movie.mp4" type="video/mp4" />
      </video>

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

      {/* 3. Foreground Content Layer (Lighten Blend) */}
      {/* This handles the text cutout effect and stroke */}
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
          
          {/* Description & Button (VISIBLE) */}
          <div className="flex flex-col items-center gap-8 pointer-events-auto">
             <p className="text-lg md:text-xl text-[#E91E63] font-medium tracking-wide">
              あなたの本音と相性が一瞬でわかる　<br className="md:hidden" />24タイプTogel型診断+AIマッチング
            </p>

            <Button
              size="lg"
              className="h-16 rounded-full bg-[#E91E63] px-12 text-xl font-bold text-white hover:bg-[#d81b60] shadow-xl transition-all hover:scale-105"
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
