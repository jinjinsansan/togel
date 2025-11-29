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

      {/* 2. Pink Background Layer with Cutout Text */}
      {/* isolate creates a stacking context. The background color is at the bottom of this context. */}
      {/* mix-blend-destination-out on the text cuts a hole through this background. */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center isolate bg-[#FFD1DC]">
        <div className="container flex flex-col items-center gap-12 py-24 text-center">
          
          {/* Title Block - Cuts through the pink background */}
          <div className="flex flex-col items-center mix-blend-destination-out">
            <h1 className="font-heading text-[clamp(6rem,35vw,20rem)] font-bold leading-none tracking-tighter text-black">
              Togel
            </h1>
            <p className="mt-16 text-[clamp(1.2rem,4vw,4rem)] font-medium tracking-widest text-black">
              トゥゲル
            </p>
          </div>

          {/* Description & Button - Normal rendering on top of pink background */}
          <div className="flex flex-col items-center gap-8">
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
