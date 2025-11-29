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
      <div className="relative border-b border-slate-100 bg-gradient-to-br from-slate-50 to-slate-100 py-12 md:py-20">
        <div className="container relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E91E63] mb-2">TOGEL DISTRIBUTION</p>
            <h1 className="font-heading text-3xl md:text-5xl font-black text-slate-900 mb-4">
              Togel<span className="text-[#E91E63]">生息</span>マップ
            </h1>
            <p className="text-slate-600 leading-relaxed mb-8">
              全24タイプの生息状況を<span className="font-bold text-black">リアルタイム</span>で公開。<br />
              あなたのタイプは<span className="font-bold text-[#E91E63]">多数派</span>？それとも<span className="font-bold text-blue-600">絶滅危惧種</span>？
            </p>

            <div className="inline-flex items-center gap-3 rounded-full bg-white px-6 py-2 shadow-sm border border-slate-200">
              <div className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E91E63] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#E91E63]"></span>
              </div>
              <span className="text-sm font-bold text-slate-500 tracking-widest">TOTAL USERS</span>
              <span className="text-2xl font-black text-slate-900 font-mono ml-1">{total.toLocaleString()}</span>
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
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{item.label}</p>
                    </div>
                  </div>

                  {/* Catchphrase & Tags */}
                  <div className="flex-1 w-full text-center md:text-left">
                    <h3 className="text-xl font-black text-slate-900 mb-1">
                      {item.typeName}
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
                <Button asChild size="lg" className="h-14 px-8 text-lg font-bold rounded-full bg-[#E91E63] text-white hover:bg-[#D81B60] shadow-lg shadow-[#E91E63]/25 hover:scale-105 transition-all">
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
        </div>
      </div>
    </div>
  );
};

export default DistributionPage;
