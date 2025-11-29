import Link from "next/link";
import { Trophy, Users, AlertTriangle, Crown, Sparkles, Activity } from "lucide-react";

import { Button } from "@/components/ui/button";
import { loadTogelDistribution, TogelDistributionItem } from "@/lib/personality/distribution";

export const revalidate = 0;

// レアリティ定義
type Rarity = "SSR" | "SR" | "R" | "N";

const getRarityInfo = (rankIndex: number, totalTypes: number) => {
  // 少ない順（rankIndex: 0が最も少ない）
  if (rankIndex < 3) {
    return {
      rank: "SSR",
      label: "絶滅危惧種",
      color: "from-yellow-300 via-amber-400 to-yellow-600",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/50",
      shadow: "shadow-yellow-500/20",
      icon: <Crown className="h-5 w-5 text-yellow-400" />,
      desc: "遭遇率極低。出会えたら奇跡レベル。",
    };
  }
  if (rankIndex < 8) {
    return {
      rank: "SR",
      label: "選ばれし者",
      color: "from-slate-300 via-slate-400 to-slate-500",
      bg: "bg-slate-400/10",
      border: "border-slate-400/50",
      shadow: "shadow-slate-400/20",
      icon: <Sparkles className="h-5 w-5 text-slate-300" />,
      desc: "クラスに一人いるかいないか。",
    };
  }
  if (rankIndex < 16) {
    return {
      rank: "R",
      label: "安定の市民",
      color: "from-emerald-400 to-emerald-600",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/50",
      shadow: "shadow-emerald-500/20",
      icon: <Activity className="h-5 w-5 text-emerald-400" />,
      desc: "個性はあるけど、割と見かける。",
    };
  }
  return {
    rank: "N",
    label: "量産型",
    color: "from-zinc-500 to-zinc-700",
    bg: "bg-zinc-500/10",
    border: "border-zinc-500/50",
    shadow: "shadow-zinc-500/20",
    icon: <Users className="h-5 w-5 text-zinc-400" />,
    desc: "石を投げれば当たる。マジョリティの壁。",
  };
};

const DistributionPage = async () => {
  const { total, distribution, legacy } = await loadTogelDistribution();
  
  // 少ない順にソートしてランク付け（少ない＝レア）
  const sortedByRarity = [...distribution].sort((a, b) => a.count - b.count);
  
  // 多い順（表示用）
  const sortedByCount = [...distribution].sort((a, b) => b.count - a.count);

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-20">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-white/10 bg-black/50 py-16">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#E91E63]/20 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="container relative z-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E91E63]/30 bg-[#E91E63]/10 px-4 py-1.5 text-sm font-medium text-[#E91E63] mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E91E63] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E91E63]"></span>
            </span>
            LIVE UPDATING
          </div>
          
          <h1 className="font-heading text-4xl md:text-6xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 mb-4">
            Togel Ecosystem Map
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-8">
            あなたのタイプは「絶滅危惧種」か、それとも「量産型」か？
            <br className="hidden md:block" />
            リアルタイムで変動するTogel界の勢力図を観測せよ。
          </p>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <div className="flex items-baseline gap-2 px-8 py-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur">
              <span className="text-sm text-zinc-500 uppercase tracking-wider">Total Population</span>
              <span className="text-4xl font-mono font-bold text-white">{total.toLocaleString()}</span>
              <span className="text-sm text-zinc-500">Users</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mt-12">
        {/* Rarity Hierarchy */}
        <div className="space-y-16">
          {/* SSR Zone */}
          <RaritySection 
            items={sortedByRarity.slice(0, 3)} 
            rarity="SSR" 
            title="超激レア（絶滅危惧種）"
            desc="遭遇率極低。見つけたら拝んでおこう。"
          />

          {/* SR Zone */}
          <RaritySection 
            items={sortedByRarity.slice(3, 8)} 
            rarity="SR" 
            title="レア（選ばれし者）"
            desc="クラスに一人レベルのユニーク枠。"
          />

          {/* R Zone */}
          <RaritySection 
            items={sortedByRarity.slice(8, 16)} 
            rarity="R" 
            title="コモン（安定の市民）"
            desc="そこそこ見かける。社会を回す中心層。"
          />

          {/* N Zone */}
          <RaritySection 
            items={sortedByRarity.slice(16)} 
            rarity="N" 
            title="ノーマル（量産型）"
            desc="最大勢力。マジョリティの壁は厚い。"
          />
        </div>

        {/* Action */}
        <div className="mt-20 text-center">
          <p className="text-zinc-400 mb-6">あなたも診断して、勢力図を更新しよう</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="w-full sm:w-auto h-14 px-8 text-lg rounded-full bg-gradient-to-r from-[#E91E63] to-[#C2185B] hover:shadow-lg hover:shadow-[#E91E63]/25 hover:scale-105 transition-all">
              <Link href="/diagnosis/select">今すぐ診断する</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-14 px-8 text-lg rounded-full border-white/10 bg-white/5 hover:bg-white/10 hover:text-white">
              <Link href="/types">24型一覧を見る</Link>
            </Button>
          </div>
        </div>

        {legacy.length > 0 && (
          <div className="mt-20 pt-10 border-t border-white/5 text-center">
            <p className="text-xs text-zinc-600 uppercase tracking-widest mb-4">LEGACY DATA</p>
            <div className="inline-flex flex-wrap justify-center gap-2">
              {legacy.map((item) => (
                <span key={item.label} className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-500">
                  {item.label}: {item.count}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const RaritySection = ({ items, rarity, title, desc }: { items: TogelDistributionItem[], rarity: Rarity, title: string, desc: string }) => {
  // rarityに応じたスタイル
  const styles = {
    SSR: {
      text: "text-yellow-400",
      bg: "bg-yellow-400/10",
      border: "border-yellow-400/20",
      gradient: "from-yellow-600/20 to-transparent"
    },
    SR: {
      text: "text-slate-300",
      bg: "bg-slate-400/10",
      border: "border-slate-400/20",
      gradient: "from-slate-500/20 to-transparent"
    },
    R: {
      text: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      gradient: "from-emerald-600/20 to-transparent"
    },
    N: {
      text: "text-zinc-400",
      bg: "bg-zinc-500/10",
      border: "border-zinc-500/20",
      gradient: "from-zinc-600/20 to-transparent"
    }
  }[rarity];

  return (
    <div className="relative">
      <div className="flex items-end gap-4 mb-6 px-4 md:px-0">
        <h2 className={`text-3xl md:text-5xl font-black tracking-tighter ${styles.text}`}>
          {rarity}
        </h2>
        <div className="pb-1 md:pb-2">
          <p className="text-lg md:text-xl font-bold text-white">{title}</p>
          <p className="text-sm text-zinc-500">{desc}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div 
            key={item.id} 
            className={`group relative overflow-hidden rounded-2xl border ${styles.border} bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors`}
          >
            {/* 背景グラデーション */}
            <div className={`absolute inset-0 bg-gradient-to-br ${styles.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
            
            <div className="relative p-5">
              <div className="flex justify-between items-start mb-3">
                <div className="text-4xl">{item.emoji}</div>
                <div className="text-right">
                  <p className={`text-2xl font-black font-mono ${styles.text}`}>{item.percentage}%</p>
                  <p className="text-xs text-zinc-500">{item.count}人</p>
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">{item.label}</h3>
              <p className="text-xs text-zinc-400 mb-3 line-clamp-1">{item.catchphrase}</p>
              
              <div className="flex flex-wrap gap-1.5">
                {item.tags.slice(0, 2).map(tag => (
                  <span key={tag} className="px-2 py-0.5 rounded-md bg-black/30 border border-white/5 text-[10px] text-zinc-400">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* プログレスバー装飾 */}
            <div className="absolute bottom-0 left-0 h-1 bg-zinc-800 w-full">
              <div 
                className={`h-full ${styles.bg.replace('/10', '')}`} 
                style={{ width: `${Math.min(item.percentage * 2, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DistributionPage;
