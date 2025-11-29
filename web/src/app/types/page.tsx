"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Heart, Skull } from "lucide-react";

import { Button } from "@/components/ui/button";
import { personalityTypes, ExtendedPersonalityTypeDefinition } from "@/lib/personality/definitions";
import { getTogelLabel } from "@/lib/personality";

// 相性情報の表示用コンポーネント
const CompatibilityItem = ({ typeId, label }: { typeId: string; label: string }) => {
  const type = personalityTypes.find((t) => t.id === typeId) as ExtendedPersonalityTypeDefinition | undefined;
  if (!type) return null;

  return (
    <Link href={`#type-${typeId}`} className="block">
      <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-2 text-sm transition-colors hover:bg-muted">
        <span className="text-lg">{type.emoji}</span>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-muted-foreground">{getTogelLabel(typeId)}</span>
          <span className="font-bold leading-tight">{type.typeName}</span>
        </div>
      </div>
    </Link>
  );
};

const TypeListPage = () => {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggleOpen = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12">
      <div className="container px-4 md:px-6">
        {/* ヘッダー */}
        <div className="mx-auto max-w-3xl text-center mb-12">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E91E63] mb-2">TOGEL TYPES</p>
          <h1 className="font-heading text-3xl md:text-5xl font-black text-slate-900 mb-4">
            24の<span className="text-[#E91E63]">本性</span>図鑑
          </h1>
          <p className="text-slate-600 leading-relaxed">
            あなたの周りにも必ずいる、24種類の人間たち。<br />
            それぞれの生態、強み、そして<span className="font-bold text-black">絶対に相容れない天敵</span>まで完全網羅。
          </p>
          <div className="mt-6">
            <Button asChild variant="outline" className="rounded-full border-slate-300 hover:bg-white hover:text-[#E91E63]">
              <Link href="/types/distribution">📊 リアルタイム分布を見る</Link>
            </Button>
          </div>
        </div>

        {/* タイプ一覧 */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
          {(personalityTypes as ExtendedPersonalityTypeDefinition[]).map((type) => (
            <div 
              key={type.id} 
              id={`type-${type.id}`}
              className="group relative flex flex-col overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-200/50 transition-all hover:-translate-y-1 hover:shadow-2xl"
            >
              {/* カードヘッダー */}
              <div className="relative p-6 pb-0">
                <div className="flex items-start justify-between mb-2">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                    {getTogelLabel(type.id)}
                  </span>
                  <span className="text-4xl filter drop-shadow-sm">{type.emoji}</span>
                </div>
                <h2 className="font-heading text-2xl font-black text-slate-900 mb-1">
                  {type.typeName}
                </h2>
                <p className="text-sm font-bold text-[#E91E63] mb-4">
                  {type.catchphrase}
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {type.tags.map((tag) => (
                    <span key={tag} className="text-xs font-bold text-slate-400">
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-slate-600 border-t border-slate-100 pt-4">
                  {type.description}
                </p>
              </div>

              {/* アコーディオン詳細 */}
              <div className="mt-auto">
                <button
                  onClick={() => toggleOpen(type.id)}
                  className="flex w-full items-center justify-center gap-2 border-t border-slate-100 bg-slate-50/50 p-4 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#E91E63]"
                >
                  <span>{openId === type.id ? "閉じる" : "詳細・相性を見る"}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${openId === type.id ? "rotate-180" : ""}`} />
                </button>

                {openId === type.id && (
                  <div className="border-t border-slate-100 bg-slate-50/30 p-6 animate-fade-in-up">
                    {/* 強みと弱み */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <p className="mb-2 text-xs font-bold text-blue-600 uppercase flex items-center gap-1">
                          ⚡ Strengths
                        </p>
                        <ul className="space-y-1">
                          {type.characteristics.strengths.map((item) => (
                            <li key={item} className="text-xs font-medium text-slate-700">• {item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-bold text-orange-600 uppercase flex items-center gap-1">
                          ⚠️ Weakness
                        </p>
                        <ul className="space-y-1">
                          {type.characteristics.growthAreas.map((item) => (
                            <li key={item} className="text-xs font-medium text-slate-700">• {item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* 相性情報 */}
                    <div className="space-y-4">
                      <div>
                        <p className="mb-2 text-xs font-bold text-pink-600 uppercase flex items-center gap-1">
                          <Heart className="h-3 w-3 fill-current" />
                          BEST MATCH
                        </p>
                        <div className="grid gap-2">
                          {type.compatibleTypes.slice(0, 3).map((id) => (
                            <CompatibilityItem key={id} typeId={id} label="最高" />
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-bold text-slate-600 uppercase flex items-center gap-1">
                          <Skull className="h-3 w-3 fill-current" />
                          WORST MATCH
                        </p>
                        <div className="grid gap-2">
                          {type.badCompatibleTypes?.slice(0, 3).map((id) => (
                            <CompatibilityItem key={id} typeId={id} label="最悪" />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TypeListPage;
