import Link from "next/link";

import { Button } from "@/components/ui/button";
import { loadTogelDistribution } from "@/lib/personality/distribution";

export const revalidate = 0;

const barColors = ["bg-primary", "bg-secondary", "bg-emerald-500", "bg-sky-500"];

const DistributionPage = async () => {
  const { total, distribution, legacy } = await loadTogelDistribution();
  const sorted = [...distribution].sort((a, b) => b.count - a.count);
  const top = sorted.find((item) => item.count > 0);
  const bottom = sorted
    .slice()
    .reverse()
    .find((item) => item.count > 0);

  return (
    <div className="container py-10">
      <div className="mx-auto max-w-5xl space-y-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">Togel Distribution</p>
        <h1 className="font-heading text-4xl">登録ユーザーのTogel型分布</h1>
        <p className="text-muted-foreground">
          Supabaseに蓄積された診断データをそのまま集計しています。ページを開くたびに最新の状況へ更新され、
          多数派/少数派の傾向をリアルタイムに確認できます。
        </p>
        <Button asChild variant="secondary" className="mt-2">
          <Link href="/types">24型一覧へ戻る</Link>
        </Button>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        <div className="rounded-3xl border border-border bg-white/90 p-6 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">登録総数</p>
          <p className="mt-3 text-4xl font-heading">{total}</p>
          <p className="mt-2 text-sm text-muted-foreground">診断結果が保存された総ユーザー数</p>
        </div>
        <div className="rounded-3xl border border-border bg-white/90 p-6 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">最多</p>
          <p className="mt-3 text-2xl font-heading">{top ? `${top.label} (${top.count})` : "未集計"}</p>
          <p className="mt-2 text-sm text-muted-foreground">{top ? top.description : "診断データが少ないため比較できません"}</p>
        </div>
        <div className="rounded-3xl border border-border bg-white/90 p-6 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">最少</p>
          <p className="mt-3 text-2xl font-heading">{bottom ? `${bottom.label} (${bottom.count})` : "未集計"}</p>
          <p className="mt-2 text-sm text-muted-foreground">{bottom ? bottom.description : "診断データが少ないため比較できません"}</p>
        </div>
      </div>

      <div className="mt-10 space-y-4">
        {distribution.map((item, index) => (
          <div key={item.id} className="rounded-2xl border border-border bg-white/90 p-4 shadow-card">
            <div className="flex items-center justify-between text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">{item.label}</p>
                <p className="text-base text-foreground">{item.description}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-heading">{item.count}</p>
                <p className="text-xs text-muted-foreground">{item.percentage}%</p>
              </div>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${barColors[index % barColors.length]}`}
                style={{ width: `${item.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {legacy.length > 0 && (
        <div className="mt-10 rounded-3xl border border-border bg-amber-50 p-6">
          <p className="text-sm font-semibold text-amber-800">旧フォーマットで保存された診断</p>
          <p className="mt-2 text-sm text-amber-800/80">
            リローンチ前に保存されたデータは新しいTogelラベルと一致しないため、参考値として扱っています。
          </p>
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {legacy.map((item) => (
              <li key={item.label} className="rounded-2xl bg-white/80 px-4 py-2 text-sm text-amber-900">
                {item.label}: {item.count}件
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default DistributionPage;
