import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* 1. Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover z-0"
      >
        <source src="/hero-movie-v2.mp4" type="video/mp4" />
      </video>

      {/* 2. Pink Background Layer with Cutout Text (SVG Mask Implementation) */}
      {/* This ensures robust cutout effect regardless of CSS blend mode support */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <svg width="100%" height="100%" className="h-full w-full">
          <defs>
            <mask id="text-mask">
              {/* White background = opaque part of the mask */}
              <rect width="100%" height="100%" fill="white" />
              
              {/* Black text = transparent part of the mask (the hole) */}
              {/* Using foreignObject to leverage CSS typography and layout */}
              <foreignObject x="0" y="0" width="100%" height="100%">
                <div className="flex h-full w-full flex-col items-center justify-center">
                  <div className="container flex flex-col items-center gap-12 py-24 text-center">
                    <div className="flex flex-col items-center">
                      <h1 className="font-heading text-[clamp(6rem,35vw,20rem)] font-bold leading-none tracking-tighter text-black">
                        Togel
                      </h1>
                      <p className="mt-16 text-[clamp(1.2rem,4vw,4rem)] font-medium tracking-widest text-black">
                        トゥゲル
                      </p>
                    </div>
                    
                    {/* Spacer for layout consistency */}
                    <div className="flex flex-col items-center gap-8 opacity-0">
                       <p className="text-lg md:text-xl font-medium tracking-wide">Spacer</p>
                       <div className="h-16 px-12 text-xl">Button Spacer</div>
                    </div>
                  </div>
                </div>
              </foreignObject>
            </mask>
          </defs>
          
          {/* The Pink Background, masked by the text */}
          <rect width="100%" height="100%" fill="#FFD1DC" mask="url(#text-mask)" />
        </svg>
      </div>

      {/* 3. Foreground Content Layer (Description & Button) */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
        <div className="container flex flex-col items-center gap-12 py-24 text-center">
          {/* Title Spacer (Invisible) */}
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
             <p className="text-lg md:text-xl text-[#E91E63] font-medium tracking-wide">
              あなたの本音と相性が一瞬でわかる、<br className="md:hidden" />24タイプ性格診断。
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
