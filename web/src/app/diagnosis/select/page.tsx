import Link from "next/link";

import { Button } from "@/components/ui/button";

const plans = [
  {
    type: "light",
    title: "ライト版 (10問)",
    description: "3分でサクッと相性診断。まずは気軽に試したい方向け。",
    features: ["10問のコア質問", "結果の自動保存", "上位5名のマッチング"],
    time: "約3分",
  },
  {
    type: "full",
    title: "しっかり版 (30問)",
    description: "価値観・コミュニケーションまで深掘り。精度重視の方に。",
    features: ["30問フル診断", "価値観マップ生成", "AIによる根拠文章"],
    time: "約8分",
  },
];

const DiagnosisSelectPage = () => {
  return (
    <div className="container py-12">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold text-primary">STEP 1</p>
        <h1 className="mt-3 font-heading text-4xl">診断タイプを選択</h1>
        <p className="mt-4 text-muted-foreground">
          ライト版は最短で結果を知りたい方、しっかり版は本格的に相性を分析したい方向けです。どちらも途中保存に対応しています。
        </p>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {plans.map((plan) => (
          <div
            key={plan.type}
            className="flex flex-col rounded-3xl border border-border bg-white/90 p-6 shadow-card"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                {plan.time}
              </p>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {plan.type === "light" ? "カジュアル" : "精密"}
              </span>
            </div>
            <h2 className="mt-4 font-heading text-2xl">{plan.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
            <ul className="mt-4 space-y-2 text-sm text-foreground">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <span className="text-primary">●</span>
                  {feature}
                </li>
              ))}
            </ul>
            <Button asChild className="mt-6">
              <Link href={`/diagnosis/${plan.type}`}>この診断で進む</Link>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DiagnosisSelectPage;
