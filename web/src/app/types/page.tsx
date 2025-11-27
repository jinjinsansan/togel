import Link from "next/link";

import { Button } from "@/components/ui/button";
import { personalityTypes, getTogelLabel } from "@/lib/personality";

const TypeListPage = () => {
  const enriched = personalityTypes.map((type) => ({
    label: getTogelLabel(type.id),
    ...type,
  }));

  return (
    <div className="container py-10">
      <div className="mx-auto max-w-5xl space-y-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">Togel Types</p>
        <h1 className="font-heading text-4xl">Togel 1〜24型 一覧</h1>
        <p className="text-muted-foreground">
          内部の24型パーソナリティ定義を公開用にアレンジしています。自分や相性の良いタイプをチェックし、
          一覧から分布ページへ遷移するとリアルタイムの登録傾向も確認できます。
        </p>
        <Button asChild variant="secondary" className="mt-2">
          <Link href="/types/distribution">分布を見る</Link>
        </Button>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {enriched.map((type) => (
          <div key={type.id} className="rounded-3xl border border-border bg-white/90 p-6 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">{type.label}</p>
                <h2 className="mt-2 text-2xl font-heading">{type.typeName}</h2>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{type.dominantTraits.join(" / ")}</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{type.description}</p>
            <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em]">Strengths</p>
                <ul className="mt-1 list-disc pl-5">
                  {type.characteristics.strengths.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em]">Growth</p>
                <ul className="mt-1 list-disc pl-5">
                  {type.characteristics.growthAreas.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl bg-muted/40 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Relationship Tips</p>
                <p className="mt-1 text-foreground">{type.characteristics.relationships}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TypeListPage;
