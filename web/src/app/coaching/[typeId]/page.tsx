import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GroupBadge } from "@/components/brand/group-badge";
import { getTypeApproachGuide } from "@/lib/coaching/translations";
import { personalityTypes, typeToken } from "@/lib/personality";

/**
 * タイプ別の攻略ページ（公開）。
 *
 * 盤（/coaching）は個人のもので診断が要るが、ガイド本文は誰でも読める。
 * 24タイプ分の着地ページとして機能させる（型別の投稿から飛んでくる先）。
 *
 * 中身は既存の TypeApproachGuide の5フィールドをそのまま出すだけで、
 * 新しい文章は書かない（translations.ts は凍結）。
 *
 * 意匠はデザイン一式の「タイプ別攻略ページ」に合わせる。
 * ダーク＝毒／ライト＝救い の原則に従い、ここは救いの画面なのでライト面。
 * ヒーローだけネイビーからペーパーへ硬く分割し、毒から救いへの転換を構造で示す。
 */

type Params = { typeId: string };

const findType = (typeId: string) => personalityTypes.find((type) => type.id === typeId) ?? null;

export const generateStaticParams = () => personalityTypes.map((type) => ({ typeId: type.id }));

export const generateMetadata = async ({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> => {
  const { typeId } = await params;
  const type = findType(typeId);
  if (!type) return {};

  const title = `${typeToken(type)}（${type.typeName}）の取扱説明 | Togel`;
  const description = `${type.catchphrase}。${typeToken(type)}の地雷はどこにあるか、どう言い換えれば踏まずに済むか。言い方の翻訳と距離の置き方まで。`;
  const ogImage = `/api/og?type=${encodeURIComponent(type.id)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/coaching/${encodeURIComponent(type.id)}`,
      siteName: "Togel",
      locale: "ja_JP",
      type: "article",
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
  };
};

const CoachingTypePage = async ({ params }: { params: Promise<Params> }) => {
  const { typeId } = await params;
  const type = findType(typeId);
  if (!type) notFound();

  const guide = getTypeApproachGuide(type.id);
  if (!guide) notFound();

  return (
    <div className="min-h-screen bg-paper text-navy">
      {/* ヒーロー: ネイビー→ペーパーの硬い分割（毒から救いへの転換） */}
      <section
        className="bg-[linear-gradient(180deg,#0b1f3a_0%,#0b1f3a_58%,#F4F7F5_58%,#F4F7F5_100%)] px-5.5 pb-[26px] pt-[30px]"
        style={{ containerType: "inline-size" }}
      >
        <div className="mx-auto max-w-[1120px]">
          <div className="inline-flex items-center gap-2 rounded-full border border-hazard/40 bg-hazard/[.14] px-[13px] py-[5px]">
            <span className="text-[11px] font-black tracking-[0.22em] text-hazard">取扱注意</span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-[18px]">
            <div className="flex h-[72px] w-[72px] flex-none rotate-45 items-center justify-center rounded-lg border-[3px] border-hazard">
              <span className="-rotate-45 text-[32px] leading-none">{type.emoji}</span>
            </div>
            <div>
              <h1 className="text-[clamp(30px,5.4cqw,52px)] font-black leading-[1.16] tracking-[-0.03em] text-white">
                {typeToken(type)}
              </h1>
              <div className="mt-1.5 text-[13px] font-bold text-[#b7c6dd]">
                {type.typeName} ／ {type.catchphrase}
              </div>
            </div>
          </div>

          <GroupBadge group={type.group} className="mt-4" />

          <div className="mt-[22px] rounded-card border border-lightline bg-white p-[22px] shadow-[0_20px_40px_-30px_rgba(11,31,58,.5)]">
            <div className="text-[10px] font-black tracking-[0.2em] text-[#c1113f]">中身の正体</div>
            <p className="mt-[11px] text-[13px] leading-[2] text-lighttext-muted">{guide.core}</p>
          </div>
        </div>
      </section>

      <section className="px-5.5 pb-[34px] pt-1.5">
        <div className="mx-auto grid max-w-[1120px] gap-3.5 md:grid-cols-2">
          {/* 言い方の翻訳 */}
          <div className="rounded-card border border-lightline bg-white p-5 shadow-[0_20px_40px_-30px_rgba(11,31,58,.5)]">
            <div className="text-[10px] font-black tracking-[0.2em] text-relief-ink">
              言い方の翻訳
            </div>
            <div className="mt-3.5 flex flex-col gap-3.5">
              <div>
                <div className="text-[10px] font-black text-[#c1113f]">✕ あなたが言いがち</div>
                <div className="mt-[5px] rounded-[11px] border border-[#f0d3da] bg-[#fdf5f7] px-3.5 py-3 text-[13px] leading-[1.8] text-lighttext-muted">
                  {guide.ng}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-black text-relief-ink">◯ こう言い換える</div>
                <div className="mt-[5px] rounded-[11px] border border-[#b9e3d0] bg-[#e9f7f0] px-3.5 py-3 text-[13px] font-bold leading-[1.8] text-navy">
                  {guide.ok}
                </div>
              </div>
            </div>
            <p className="mt-3.5 text-[12px] leading-[1.95] text-lighttext-subtle">{guide.why}</p>
          </div>

          <div className="flex flex-col gap-3.5">
            {/* 今日からやること */}
            <div className="rounded-card border border-lightline bg-white p-5 shadow-[0_20px_40px_-30px_rgba(11,31,58,.5)]">
              <div className="text-[10px] font-black tracking-[0.2em] text-relief-ink">
                今日からやること
              </div>
              <ol className="mt-[13px] flex flex-col gap-[11px]">
                {guide.dos.map((item, index) => (
                  <li key={item} className="flex items-start gap-[9px]">
                    <span className="flex h-[17px] w-[17px] flex-none items-center justify-center rounded-[5px] bg-relief-ink text-[10px] font-black text-white">
                      {index + 1}
                    </span>
                    <span className="text-[12px] leading-[1.85] text-lighttext-muted">{item}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* 距離の置き方 */}
            <div className="rounded-card bg-navy p-5">
              <div className="text-[10px] font-black tracking-[0.2em] text-relief">
                距離の置き方
              </div>
              <p className="mt-[11px] text-[13px] leading-[1.95] text-[#c3d3e8]">
                {guide.distance}
              </p>
            </div>
          </div>
        </div>

        {/* 締め文（省略不可） */}
        <div className="mx-auto mt-3.5 max-w-[1120px] rounded-card border border-dashed border-[#cfdad4] bg-white px-5.5 py-[18px] text-center">
          <p className="text-[13px] font-black leading-[1.95] text-navy">
            タイプは傾向、ラベルは個人。
            <br />
            <span className="font-normal text-lighttext-subtle">
              隣のあの人の本当のラベルは、本人にしかわかりません。
            </span>
          </p>
        </div>

        {/* 診断への導線 */}
        <div className="mx-auto mt-3.5 grid max-w-[1120px] items-center gap-[18px] rounded-hero bg-navy p-[22px] sm:grid-cols-2">
          <div>
            <div className="text-[11px] font-black tracking-[0.2em] text-relief">
              で、あなたの地雷は？
            </div>
            <div className="mt-2 text-[20px] font-black leading-[1.5] text-white">
              40問で、噛み合わない相手が出ます
            </div>
            <p className="mt-2 text-[12px] leading-[1.9] text-[#b7c6dd]">
              読むだけで終わってもいいですが、自分の分を知ると使いどころが増えます。
            </p>
          </div>
          <Link
            href="/diagnosis/select"
            className="flex min-h-[54px] items-center justify-center rounded-[14px] bg-primary text-[15px] font-black text-white transition-colors hover:bg-primary-hover"
          >
            自分の型を診断する
          </Link>
        </div>

        {/* LINE */}
        <div className="mx-auto mt-3 grid max-w-[1120px] items-center gap-4 rounded-card border border-lightline bg-white px-5.5 py-5 sm:grid-cols-2">
          <div>
            <div className="text-[11px] font-black tracking-[0.2em] text-relief-ink">
              毎週1通、全15回
            </div>
            <div className="mt-[7px] text-[15px] font-black leading-[1.5] text-navy">
              1通目から、踏まない歩き方だけ送ります
            </div>
          </div>
          <a
            href="https://lin.ee/T7OYAGQ"
            target="_blank"
            rel="noreferrer"
            className="flex min-h-[52px] items-center justify-center rounded-[14px] bg-linegreen text-[15px] font-black text-white transition-opacity hover:opacity-90"
          >
            1通目を受け取る
          </a>
        </div>

        <div className="mx-auto mt-4 max-w-[1120px] text-center">
          <Link
            href="/coaching"
            className="text-[12px] font-bold text-lighttext-subtle underline transition-colors hover:text-navy"
          >
            24タイプ一覧に戻る
          </Link>
        </div>
      </section>
    </div>
  );
};

export default CoachingTypePage;
