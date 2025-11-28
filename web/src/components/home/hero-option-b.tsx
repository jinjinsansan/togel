"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function HeroOptionB() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-50 text-slate-900">
      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      
      {/* Radial Gradient Accent */}
      <div className="absolute -top-[20%] -left-[10%] h-[600px] w-[600px] rounded-full bg-blue-400/20 blur-[100px]"></div>
      <div className="absolute bottom-[0%] right-[0%] h-[500px] w-[500px] rounded-full bg-purple-400/20 blur-[100px]"></div>

      <div className="z-10 container mx-auto grid lg:grid-cols-2 gap-12 items-center px-4">
        {/* Left: Content */}
        <div className="space-y-8 text-left">
          <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm text-blue-600">
            <span className="mr-2 flex h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
            ビッグファイブ分析アルゴリズム稼働中
          </div>

          <h1 className="font-heading text-5xl md:text-7xl font-bold tracking-tight text-slate-900">
            データ駆動型 <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              相性診断
            </span>
          </h1>

          <p className="max-w-lg text-lg text-slate-600 leading-relaxed">
            恋愛は魔法ではありません。変数と確率の問題です。
            5つの性格次元を分析し、98.2%の精度であなたに最適なパートナーを算出します。
          </p>

          <div className="flex gap-4">
            <Button 
              asChild 
              size="lg" 
              className="h-12 rounded-md bg-blue-600 px-8 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
            >
              <Link href="/diagnosis/select">
                分析を開始
              </Link>
            </Button>
            <Button 
              asChild 
              variant="ghost" 
              size="lg" 
              className="h-12 px-8 text-slate-600 hover:bg-slate-100"
            >
              <Link href="/about">
                ロジックについて →
              </Link>
            </Button>
          </div>

          {/* Stats/Data points */}
          <div className="grid grid-cols-3 gap-4 pt-8 border-t border-slate-200">
            <div>
              <p className="text-2xl font-bold text-slate-900">50k+</p>
              <p className="text-xs text-slate-500 font-mono">DATAPOINTS</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">5</p>
              <p className="text-xs text-slate-500 font-mono">DIMENSIONS</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">0.01s</p>
              <p className="text-xs text-slate-500 font-mono">LATENCY</p>
            </div>
          </div>
        </div>

        {/* Right: Abstract Visualization */}
        <div className="relative hidden lg:flex items-center justify-center">
          <div className="relative h-96 w-96">
             {/* Abstract Radar Chart Representation */}
             <div className="absolute inset-0 border-2 border-slate-200 rounded-full opacity-50"></div>
             <div className="absolute inset-12 border-2 border-slate-200 rounded-full opacity-50"></div>
             <div className="absolute inset-24 border-2 border-slate-200 rounded-full opacity-50"></div>
             
             {/* Floating Cards */}
             <div className="absolute top-0 right-0 p-4 bg-white/80 backdrop-blur-md border border-slate-100 shadow-xl rounded-xl animate-float">
                <div className="h-2 w-12 bg-blue-500 rounded mb-2"></div>
                <div className="h-2 w-8 bg-slate-200 rounded"></div>
             </div>
             
             <div className="absolute bottom-10 left-0 p-4 bg-white/80 backdrop-blur-md border border-slate-100 shadow-xl rounded-xl animate-float" style={{animationDelay: "1s"}}>
                <div className="flex gap-2 items-end h-10">
                  <div className="w-2 h-4 bg-purple-300 rounded-t"></div>
                  <div className="w-2 h-8 bg-purple-400 rounded-t"></div>
                  <div className="w-2 h-6 bg-purple-500 rounded-t"></div>
                </div>
             </div>
             
             {/* Central Node */}
             <div className="absolute inset-0 m-auto h-32 w-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full shadow-2xl flex items-center justify-center text-white font-bold text-xl animate-pulse">
               98%
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
