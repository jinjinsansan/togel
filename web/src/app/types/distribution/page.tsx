import Link from "next/link";

import { loadTogelDistribution } from "@/lib/personality/distribution";
import { DistributionChart } from "./distribution-chart";

export const dynamic = "force-dynamic";

const DistributionPage = async () => {
  const { total, distribution } = await loadTogelDistribution();
  const hasLiveData = total > 0 && distribution.some((item) => item.count > 0);

  // 多い順にソートして表示（ランキング形式）
  const sortedByCount = [...distribution].sort((a, b) => b.count - a.count);

  return (
    <div className="min-h-screen bg-ink pb-16 text-white">
      <section className="bg-[radial-gradient(120%_90%_at_50%_-10%,rgba(255,46,116,.2),transparent_60%)] px-5.5 pb-6 pt-8">
        <div className="mx-auto max-w-[760px]">
          <div className="text-[11px] font-black tracking-[0.28em] text-hazard">DISTRIBUTION</div>
          <h1 className="mt-3 text-h1">タイプ分布図</h1>
          <p className="mt-3 max-w-[34em] text-[13px] leading-8 text-txt-muted">
            全24タイプの生息状況です。あなたのタイプは多数派か、少数派か。
          </p>
          <div className="mt-4 inline-flex items-center gap-3 rounded-full border border-line bg-surface px-5 py-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-[11px] font-black tracking-[0.18em] text-txt-subtle">
              TOTAL USERS
            </span>
            <span className="font-mono text-lg font-black">{total.toLocaleString()}</span>
          </div>
        </div>
      </section>

      <section className="px-5.5">
        <div className="mx-auto max-w-[760px]">
          {!hasLiveData && (
            <div className="mb-4 rounded-card border border-warnline bg-warnbg p-4 text-xs font-bold leading-relaxed text-hazard">
              現在リアルタイムの集計値を取得できませんでした。以下は最新データが反映されていない可能性があります。
            </div>
          )}

          <DistributionChart items={sortedByCount} />

          <div className="mt-10 rounded-hero border border-line bg-panel p-8 text-center">
            <h2 className="text-xl font-black">あなたは何型？</h2>
            <p className="mt-2.5 text-xs leading-8 text-txt-muted">
              約5分の診断で、あなたのタイプと「絶対に合わない相手」が分かります。
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link
                href="/diagnosis/select"
                className="flex min-h-[52px] items-center rounded-full bg-hazard px-7 text-sm font-black text-ink shadow-cta transition-colors hover:bg-white"
              >
                今すぐ診断する
              </Link>
              <Link
                href="/types"
                className="flex min-h-[52px] items-center rounded-full border border-line px-7 text-sm font-bold text-txt-muted transition-colors hover:text-white"
              >
                24タイプ図鑑を見る
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DistributionPage;
