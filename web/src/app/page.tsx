import Link from "next/link";
import {
  ArrowRight,
  HeartHandshake,
  LineChart,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const badges = [
  "ライト版10問",
  "しっかり版30問",
  "AI根拠付き診断",
];

const features = [
  {
    title: "AIマッチング根拠",
    description:
      "Claude API が回答データを多角的に解析し、感情・価値観・コミュニケーション観点で根拠を生成。",
    icon: Sparkles,
  },
  {
    title: "安全なLINEログイン",
    description:
      "LINEアカウント連携でワンタップ登録。Supabase Auth とRLSで不正アクセスをブロックします。",
    icon: ShieldCheck,
  },
  {
    title: "相性スコアとランキング",
    description:
      "Togel専用アルゴリズムの相性マトリクスでスコア化。常に上位5名をリアルタイム表示。",
    icon: LineChart,
  },
];

const steps = [
  {
    title: "STEP 1",
    description: "LINEでログインし、プロフィール必須項目を入力",
  },
  {
    title: "STEP 2",
    description: "10問 or 30問の診断を実施して性格タイプを確定",
  },
  {
    title: "STEP 3",
    description: "AIが相性の良い異性5名と根拠を提示。気になる人をチェック",
  },
];

const stats = [
  { label: "診断完了まで", value: "約3分" },
  { label: "タイプ指標", value: "Togel分類" },
  { label: "モックユーザー", value: "2,000名" },
];

const insightScores = [
  { label: "価値観の一致度", percent: 92 },
  { label: "コミュニケーション相性", percent: 88 },
  { label: "ライフスタイル適合", percent: 84 },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-white to-white">
      <div className="container space-y-24 py-16">
        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-10">
            <div className="flex flex-wrap gap-2">
              {badges.map((badge) => (
                <span
                  key={badge}
                  className="rounded-full border border-border bg-white/70 px-4 py-1 text-xs font-medium text-muted-foreground shadow-sm"
                >
                  {badge}
                </span>
              ))}
            </div>
            <div className="space-y-6">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-primary">
                Matching診断
              </p>
              <h1 className="font-heading text-4xl leading-tight text-foreground md:text-5xl lg:text-6xl">
                性格診断で
                <span className="text-primary"> “本当に合う”</span>
                相手に出会う。
              </h1>
              <p className="text-lg text-muted-foreground md:text-xl">
                LINEログインから約3分。独自開発のTogelアルゴリズムで、あなたと相性の良い異性5名を厳選してカード形式でお届けします。
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="gap-2 text-base">
                今すぐ診断をはじめる
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="lg" className="gap-2 text-base">
                しくみを見る
                <HeartHandshake className="h-5 w-5 text-pop" />
              </Button>
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-border bg-white/80 p-5 shadow-card"
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-foreground">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative rounded-3xl border border-border bg-white/80 p-8 shadow-card">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">診断サマリ</p>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                  95% Match
                </span>
              </div>
              <div className="space-y-4 rounded-2xl bg-gradient-to-br from-primary/10 via-white to-secondary/10 p-6">
                <p className="text-sm font-semibold text-muted-foreground">あなたのタイプ</p>
                <p className="text-2xl font-bold text-foreground">思いやり×共感リーダー</p>
                <p className="text-sm text-muted-foreground">
                  感情の機微に気づき、相手を優先できるあなたには同じ熱量で寄り添うパートナーがマッチします。
                </p>
              </div>
              <div className="space-y-4">
                {insightScores.map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                      <span>{item.label}</span>
                      <span>{item.percent}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-6">
              <div className="flex items-center gap-3">
                <UserRoundCheck className="h-10 w-10 rounded-full bg-white p-2 text-primary shadow" />
                <div>
                  <p className="text-sm font-semibold text-primary">いたずらリンク・優先表示</p>
                  <p className="text-xs text-muted-foreground">プロフィール充実でマイリンク解放</p>
                </div>
              </div>
              <Button variant="secondary" className="w-full justify-center">
                紹介リンクを発行
              </Button>
            </div>
          </div>
        </section>

        <section className="space-y-12">
          <div className="flex flex-col gap-4 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Feature
            </p>
            <h2 className="font-heading text-3xl text-foreground md:text-4xl">
              診断〜マッチングのすべてを1つの画面体験に
            </h2>
            <p className="mx-auto max-w-3xl text-base text-muted-foreground">
              途中保存や再診断、マッチング結果のキャッシュ管理まで、将来の有料プランや紹介施策を見据えたアーキテクチャで構築します。
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-3xl border border-border bg-white/80 p-6 shadow-card transition hover:-translate-y-1 hover:shadow-xl"
              >
                <feature.icon className="mb-4 h-10 w-10 text-primary" />
                <h3 className="font-heading text-xl text-foreground">{feature.title}</h3>
                <p className="mt-3 text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-10 rounded-4xl border border-border bg-white/80 p-8 shadow-card">
          <div className="flex flex-col gap-4 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              How it works
            </p>
            <h2 className="font-heading text-3xl text-foreground md:text-4xl">
              3ステップでマッチング完了
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.title} className="rounded-3xl border border-border bg-muted/40 p-6">
                <p className="text-xs font-semibold text-primary">{step.title}</p>
                <p className="mt-3 text-base font-semibold text-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-4xl border border-border bg-gradient-to-r from-secondary/20 via-white to-primary/20 p-8 shadow-card">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                MVP Ready
              </p>
              <h3 className="font-heading text-3xl">Phase1開発をここからスタート</h3>
              <p className="max-w-2xl text-base text-muted-foreground">
                Next.js 14 + Supabase + LINEログインの基盤が整いました。Tailwindとshadcn/uiベースのデザインシステムで、今後の画面拡張にもスムーズに対応できます。
              </p>
            </div>
            <div className="space-y-3">
              <Button asChild size="lg" className="gap-2 bg-primary text-primary-foreground">
                <Link href="#">Phase1タスクを見る</Link>
              </Button>
              <Button variant="outline" size="lg" className="gap-2">
                設計ドキュメントを確認
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
