import Link from "next/link";
import { Users, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { loadTogelDistribution } from "@/lib/personality/distribution";

export const revalidate = 0;

const DistributionPage = async () => {
  const { total, distribution, legacy } = await loadTogelDistribution();
  
  // 多い順にソートして表示（ランキング形式）
  const sortedByCount = [...distribution].sort((a, b) => b.count - a.count);

  return (
    <div className="min-h-screen bg-white pb-20 text-slate-900">
      {/* Header Section */}
      <div className="relative border-b border-slate-100 bg-white py-12 md:py-20">
        <div className="container relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-sm font-bold text-slate-600 mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E91E63] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E91E63]"></span>
              </span>
              LIVE UPDATING
            </div>
            
            <h1 className="font-heading text-4xl md:text-6xl font-black tracking-tight text-slate-900 mb-6">
              Togel分布マップ
            </h1>
            <p className="text-lg font-medium text-slate-500 leading-relaxed mb-8">
              全24タイプの生息状況をリアルタイムで公開。<br />
              あなたのタイプは多数派？それとも少数派？
            </p>

            <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                <Users className="h-6 w-6 text-slate-600" />
              </div>
              <div className="px-4 text-left">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">TOTAL USERS</p>
                <p className="text-2xl font-black text-slate-900 font-mono">{total.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mt-12 md:mt-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-4">
            {sortedByCount.map((item, index) => (
              <div 
                key={item.id}
                className="group relative overflow-hidden rounded-3xl border-2 border-slate-100 bg-white p-1 transition-all hover:border-[#E91E63] hover:shadow-xl hover:-translate-y-1"
              >
                {/* 順位バッジ */}
                <div className={`absolute left-0 top-0 flex h-12 w-12 items-center justify-center rounded-br-3xl text-lg font-black text-white
                  ${index < 3 ? 'bg-[#E91E63]' : 'bg-slate-200 text-slate-500'}`}>
                  {index + 1}
                </div>

                <div className="flex flex-col md:flex-row items-center gap-6 p-6 pt-8 md:p-8 md:pl-20">
                  {/* Emoji & Label */}
                  <div className="flex items-center gap-4 min-w-[100px]">
                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-4xl shadow-inner">
                      {item.emoji}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{item.id.toUpperCase().replace(/-/g, ' ')}</p>
                    </div>
                  </div>

                  {/* Catchphrase & Tags */}
                  <div className="flex-1 w-full text-center md:text-left">
                    <h3 className="text-xl font-black text-slate-900 mb-1">
                      {item.label}
                    </h3>
                    <p className="text-base font-bold text-[#E91E63] mb-3">
                      {item.catchphrase}
                    </p>
                    <div className="flex flex-wrap justify-center md:justify-start gap-2">
                      {item.tags.map(tag => (
                        <span key={tag} className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-500">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-end gap-2 text-right min-w-[120px]">
                    <div className="flex-1">
                      <div className="flex items-baseline justify-end gap-1">
                        <span className="text-4xl font-black text-slate-900 font-mono">{item.percentage}</span>
                        <span className="text-sm font-bold text-slate-400">%</span>
                      </div>
                      <p className="text-xs font-bold text-slate-400">{item.count}人</p>
                    </div>
                  </div>
                </div>

                {/* Progress Bar Background */}
                <div className="absolute bottom-0 left-0 h-1.5 bg-slate-100 w-full">
                  <div 
                    className={`h-full transition-all duration-1000 ${index < 3 ? 'bg-[#E91E63]' : 'bg-slate-300'}`}
                    style={{ width: `${Math.min(item.percentage * 2, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-20 text-center">
            <div className="inline-flex flex-col items-center gap-6 rounded-3xl border-2 border-slate-100 bg-slate-50 p-10 md:p-16">
              <h2 className="font-heading text-2xl md:text-4xl font-black text-slate-900">
                あなたは何型？
              </h2>
              <p className="text-slate-500 font-medium">
                たった3分の診断で、あなたのタイプと相性の良い相手が見つかります。
              </p>
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <Button asChild size="lg" className="h-14 px-8 text-lg font-bold rounded-full bg-[#E91E63] hover:bg-[#D81B60] shadow-lg shadow-[#E91E63]/25 hover:scale-105 transition-all">
                  <Link href="/diagnosis/select">
                    今すぐ診断する <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-14 px-8 text-lg font-bold rounded-full border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-600">
                  <Link href="/types">
                    型一覧を見る
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {legacy.length > 0 && (
            <div className="mt-20 border-t border-slate-100 pt-10 text-center">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">LEGACY DATA ARCHIVE</p>
              <div className="inline-flex flex-wrap justify-center gap-2">
                {legacy.map((item) => (
                  <span key={item.label} className="px-3 py-1 rounded-md bg-slate-100 text-xs font-medium text-slate-500">
                    {item.label}: {item.count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DistributionPage;
