import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-primary">
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

      {/* 2. Pink Overlay (Multiply) - Turns white background to pink */}
      <div className="pointer-events-none absolute inset-0 z-20 bg-primary mix-blend-multiply" />

      {/* 3. Content Mask Layer (White Background + Screen Blend) */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white mix-blend-screen">
        <div className="container flex flex-col items-center gap-12 py-24 text-center">
          {/* Title Block (VISIBLE) */}
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
              あなたの本音と相性が一瞬でわかる、<br className="md:hidden" />24タイプ性格診断。
            </p>
            <Button size="lg" className="h-16 px-12 text-xl">
              LINEで始める
            </Button>
          </div>
        </div>
      </div>

      {/* 4. Foreground Content Layer (Normal Blend) - Stays White */}
      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none">
        <div className="container flex flex-col items-center gap-12 py-24 text-center">
          {/* Title Block SPACER (INVISIBLE) - Keeps layout identical to background */}
          <div className="flex flex-col items-center opacity-0">
            <h1 className="font-heading text-[clamp(6rem,35vw,20rem)] font-bold leading-none tracking-tighter">
              Togel
            </h1>
            <p className="mt-16 text-[clamp(1.2rem,4vw,4rem)] font-medium tracking-widest">
              トゥゲル
            </p>
          </div>
          
          {/* Description & Button (VISIBLE) */}
          <div className="flex flex-col items-center gap-8 pointer-events-auto">
             <p className="text-lg md:text-xl text-white font-medium drop-shadow-md tracking-wide">
              あなたの本音と相性が一瞬でわかる、<br className="md:hidden" />24タイプ性格診断。
            </p>

            <Button
              size="lg"
              className="h-16 rounded-full bg-white px-12 text-xl font-bold text-[#E91E63] hover:bg-white/90 shadow-xl transition-all hover:scale-105"
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
