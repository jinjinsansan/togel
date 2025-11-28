"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export function HeroOptionC() {
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-rose-50 via-white to-sky-50">
      <div className="container mx-auto flex min-h-screen flex-col-reverse items-center justify-center gap-12 px-4 lg:flex-row lg:justify-between">
        
        {/* Left Content */}
        <div className="flex flex-col items-center space-y-6 text-center lg:items-start lg:text-left lg:w-1/2">
          <h1 className="font-heading text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
            本当に合う人を<br />
            <span className="text-rose-500">見つけよう。</span>
          </h1>
          
          <p className="max-w-xl text-lg text-gray-600">
            Togelはただのマッチングアプリではありません。<br/>
            まずは自分を知ることから。あなたの個性にぴったりのパートナーを見つけましょう。
          </p>
          
          <div className="flex flex-col w-full gap-4 sm:flex-row sm:w-auto">
            <Button 
              asChild 
              size="lg" 
              className="h-14 rounded-full bg-rose-500 px-8 text-lg font-semibold text-white shadow-lg shadow-rose-500/25 hover:bg-rose-600 transition-all hover:scale-105"
            >
              <Link href="/diagnosis/select">
                無料診断をスタート
              </Link>
            </Button>
            <Button 
              asChild 
              variant="ghost" 
              size="lg" 
              className="h-14 rounded-full px-8 text-lg text-gray-600 hover:bg-white/50"
            >
              <Link href="/about">
                使い方を見る
              </Link>
            </Button>
          </div>

          <div className="flex items-center gap-4 pt-4">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 w-10 rounded-full border-2 border-white bg-gray-200 overflow-hidden relative">
                   <Image 
                     src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${i}&backgroundColor=ffdfbf`} 
                     alt="User" 
                     fill 
                     className="object-cover"
                   />
                </div>
              ))}
            </div>
            <p className="text-sm font-medium text-gray-600">
              <span className="font-bold text-gray-900">10,000+</span> 人が利用中
            </p>
          </div>
        </div>

        {/* Right Visuals */}
        <div className="relative w-full lg:w-1/2 h-[400px] lg:h-[600px] flex items-center justify-center">
           {/* Decorative blobs */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-r from-rose-200/30 to-sky-200/30 blur-3xl rounded-full -z-10"></div>

           {/* Connection Card */}
           <div className="relative flex items-center gap-4 p-6 bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl animate-float">
              {/* User 1 */}
              <div className="text-center">
                 <div className="w-20 h-20 rounded-full bg-rose-100 mb-2 mx-auto overflow-hidden relative border-4 border-white shadow-sm">
                    <Image 
                     src="https://api.dicebear.com/9.x/avataaars/svg?seed=Felix&backgroundColor=ffdfbf" 
                     alt="User 1" 
                     fill 
                     className="object-cover"
                   />
                 </div>
                 <p className="font-bold text-gray-800">あなた</p>
              </div>

              {/* Heart Connection */}
              <div className="flex flex-col items-center">
                 <div className="h-1 w-16 bg-gradient-to-r from-rose-400 to-rose-400 rounded-full relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white shadow-md rounded-full p-1">
                       <span className="text-rose-500 text-xs font-bold px-2">98%</span>
                    </div>
                 </div>
              </div>

              {/* User 2 */}
              <div className="text-center">
                 <div className="w-20 h-20 rounded-full bg-sky-100 mb-2 mx-auto overflow-hidden relative border-4 border-white shadow-sm">
                    <Image 
                     src="https://api.dicebear.com/9.x/avataaars/svg?seed=Aneka&backgroundColor=b6e3f4" 
                     alt="User 2" 
                     fill 
                     className="object-cover"
                   />
                 </div>
                 <p className="font-bold text-gray-800">相手</p>
              </div>
           </div>

           {/* Floating badges */}
           <div className="absolute -top-10 right-10 bg-white p-3 rounded-xl shadow-lg animate-float" style={{animationDelay: "1.5s"}}>
              <span className="text-2xl">🧩</span>
           </div>
           <div className="absolute bottom-10 left-10 bg-white p-3 rounded-xl shadow-lg animate-float" style={{animationDelay: "2s"}}>
              <span className="text-2xl">✨</span>
           </div>
        </div>

      </div>
    </div>
  );
}
