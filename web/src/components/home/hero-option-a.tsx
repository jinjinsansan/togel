"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function HeroOptionA() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-zinc-950 text-zinc-50">
      {/* Background Noise/Texture Effect */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat opacity-20"></div>
      </div>

      <div className="z-10 flex flex-col items-center space-y-8 text-center px-4">
        {/* Provocative Badge */}
        <div className="inline-block rounded-none border border-red-600 bg-red-950/30 px-3 py-1 text-xs font-mono text-red-500 tracking-widest uppercase">
          ⚠️ Warning: Brutal Honesty Inside
        </div>

        {/* Glitchy Giant Text */}
        <h1 className="font-heading text-[clamp(3rem,10vw,8rem)] font-black leading-none tracking-tighter text-white mix-blend-difference">
          <span className="block text-red-600">恋愛</span>
          <span className="block">不適合？</span>
        </h1>

        <p className="max-w-lg text-lg text-zinc-400 font-mono">
          なぜいつも同じ失敗を繰り返すのか？<br/>
          推測はやめて、アルゴリズムに現実を突きつけられよう。
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <Button 
            asChild 
            size="lg" 
            className="rounded-none border-2 border-white bg-white text-black hover:bg-zinc-200 hover:text-black h-14 px-8 text-lg font-bold uppercase tracking-wider"
          >
            <Link href="/diagnosis/select">
              診断を受ける
            </Link>
          </Button>
          <Button 
            asChild 
            variant="outline" 
            size="lg" 
            className="rounded-none border-2 border-zinc-800 bg-transparent text-zinc-400 hover:bg-zinc-900 hover:text-white h-14 px-8 text-lg font-bold uppercase tracking-wider"
          >
            <Link href="/result/mismatch">
              絶望を見る
            </Link>
          </Button>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-10 left-10 font-mono text-xs text-zinc-600">
        SYSTEM_STATUS: <span className="text-red-500">CRITICAL</span>
      </div>
      <div className="absolute top-10 right-10 font-mono text-xs text-zinc-600">
        ERR_CODE: LONELY_404
      </div>
    </div>
  );
}
