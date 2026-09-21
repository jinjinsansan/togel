import type { Metadata } from "next";
import Link from "next/link";

import { GroupBadge, groupEmoji } from "@/components/brand/group-badge";
import { TYPE_GROUP_ORDER, typeToken, typesInGroup } from "@/lib/personality";
import { groupMatrixPairs } from "@/lib/personality/group-matrix";

/**
 * 4群の相性表（固定URL）。
 *
 * 画像APIだけだと引用されたときに貼る先がないので、1枚のページとして置く。
 * 画像とテキスト版の両方を載せ、引用のたびにこのURLが回る状態にする。
 *
 * 毒は「組み合わせ」に向け、「型」には向けない。群名は必ず再定義の一行とセットで出す。
 */

const title = "4群 相性表 | トゥゲル診断";
const description =
  "24タイプは4つの群に分かれます。16通りの組み合わせのうち、どこが噛み合い、どこが長引くか。運命の人は教えない。地雷なら教える。";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    url: "/compatibility",
    siteName: "Togel",
    locale: "ja_JP",
    type: "website",
    images: [{ url: "/api/og/groups", width: 1080, height: 1350, alt: "4群 相性表" }],
  },
  twitter: { card: "summary_large_image", title, description, images: ["/api/og/groups"] },
};

const CompatibilityPage = () => (
  <div className="min-h-screen bg-ink text-white">
    <div className="h-[10px] bg-hazard" />

    <section className="px-5.5 pb-10 pt-[42px]">
      <div className="mx-auto max-w-[760px]">
        <div className="text-[11px] font-black tracking-[0.22em] text-hazard">COMPATIBILITY</div>
        <h1 className="mt-4 text-[clamp(28px,7cqw,44px)] font-black leading-[1.25] tracking-[-0.03em]">
          4群 相性表
        </h1>
        <p className="mt-3.5 text-[13px] leading-8 text-txt-muted">
          24タイプは4つの群に分かれます。縦が自分の群、横が相手の群。
          評価しているのは組み合わせであって、人ではありません。
        </p>

        {/* 1枚画像（引用・スクショ用） */}
        <div className="mt-7 overflow-hidden rounded-card border border-line bg-panel">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/api/og/groups" alt="4群の相性表（16マス）" className="w-full" />
        </div>

        {/* 群の一覧。群名は再定義の一行とセットで出す */}
        <div className="mt-8 grid gap-2.5 sm:grid-cols-2">
          {TYPE_GROUP_ORDER.map((group) => (
            <div key={group} className="rounded-[14px] border border-line bg-surface p-4">
              <GroupBadge group={group} variant="compact" />
              <p className="mt-2.5 text-[11.5px] leading-[1.9] text-txt-subtle">
                {typesInGroup(group)
                  .map((type) => `${type.emoji} ${typeToken(type)}`)
                  .join("・")}
              </p>
            </div>
          ))}
        </div>

        {/* テキスト版（10通り） */}
        <div className="mt-8">
          <h2 className="text-[11px] font-black tracking-[0.22em] text-txt-muted">
            16マスの内訳（10通り）
          </h2>
          <div className="mt-3.5 flex flex-col gap-2">
            {groupMatrixPairs().map(({ a, b, cell }) => (
              <div
                key={`${a}:${b}`}
                className="flex items-start gap-3 rounded-[12px] border border-line-soft bg-surface px-4 py-3"
              >
                <span className="flex-none text-[15px]">
                  {groupEmoji(a)} × {groupEmoji(b)}
                </span>
                <span className="flex-none text-[15px] font-black text-hazard">{cell.symbol}</span>
                <span className="text-[12.5px] leading-[1.9] text-[#e2e7f0]">{cell.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-7 text-[11px] font-bold text-txt-subtle">タイプは傾向、ラベルは個人。</p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/diagnosis/select"
            className="flex min-h-[50px] items-center rounded-full bg-primary px-6 text-[13px] font-black text-ink transition-colors hover:bg-primary-hover"
          >
            自分の群を調べる（無料）
          </Link>
          <Link
            href="/types"
            className="flex min-h-[50px] items-center rounded-full border border-[#29303f] px-6 text-[13px] font-bold text-txt-muted transition-colors hover:border-primary hover:text-white"
          >
            24タイプを見る
          </Link>
        </div>
      </div>
    </section>
  </div>
);

export default CompatibilityPage;
