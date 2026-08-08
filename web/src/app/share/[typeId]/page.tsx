import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { personalityTypes } from "@/lib/personality";
import { getAppBaseUrl } from "@/lib/url";

/**
 * SNSシェア用ランディングページ。
 *
 * /share/<typeId>                … 自分のタイプ発表（OGP: /api/og?type=<id>）
 * /share/<typeId>?mode=mismatch  … 「私と絶対合わないのは」（OGP: /api/og?type=<id>&mode=mismatch）
 *
 * シェアリンクの遷移先として機能し、OGP画像をSNSプレビューに出すのが主目的。
 * 閲覧者には診断への導線だけを提示する（相手の個人情報は一切載らない）。
 */

type Params = { typeId: string };
type SearchParams = { mode?: string };

const findType = (typeId: string) => personalityTypes.find((t) => t.id === typeId) ?? null;

export const generateMetadata = async ({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> => {
  const { typeId } = await params;
  const { mode } = await searchParams;
  const type = findType(typeId);
  if (!type) return {};

  const isMismatch = mode === "mismatch";
  const worst = personalityTypes.find((t) => t.id === type.badCompatibleTypes[0]) ?? null;
  const featured = isMismatch && worst ? worst : type;

  const title = isMismatch
    ? `私と絶対に合わないのは「${featured.typeName}」 | Togel`
    : `私のタイプは「${featured.typeName}」 | Togel`;
  const description = `${featured.catchphrase}。運命の人は教えない。地雷なら教える。トゥゲル診断で確かめる。`;

  const base = getAppBaseUrl();
  const ogImage = `${base}/api/og?type=${encodeURIComponent(type.id)}${isMismatch ? "&mode=mismatch" : ""}`;
  const pageUrl = `${base}/share/${encodeURIComponent(type.id)}${isMismatch ? "?mode=mismatch" : ""}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: "Togel",
      locale: "ja_JP",
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
};

const SharePage = async ({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) => {
  const { typeId } = await params;
  const { mode } = await searchParams;
  const type = findType(typeId);
  if (!type) notFound();

  const isMismatch = mode === "mismatch";
  const worst = personalityTypes.find((t) => t.id === type.badCompatibleTypes[0]) ?? null;
  const featured = isMismatch && worst ? worst : type;

  return (
    <div className="min-h-screen bg-ink text-white">
      <div className="h-[10px] bg-hazard-sm" />
      <section
        className="bg-[radial-gradient(120%_90%_at_50%_-10%,rgba(255,46,116,.26),transparent_60%)] px-5.5 pb-12 pt-[46px]"
        style={{ containerType: "inline-size" }}
      >
        <div className="mx-auto max-w-[680px]">
          <div className="text-[11px] font-black tracking-[0.28em] text-hazard">
            {isMismatch ? "MISMATCH / WORST 1" : "MY TYPE / 24"}
          </div>
          <p className="mt-5 text-sm font-bold text-txt-muted">
            {isMismatch ? "この人と絶対に合わないのは" : "この人のタイプは"}
          </p>
          <h1 className="mt-2 text-[clamp(34px,8cqw,56px)] font-black leading-[1.2] tracking-[-0.03em]">
            <span className="mr-2">{featured.emoji}</span>
            {featured.typeName}
          </h1>
          <p className="mt-3 text-base font-bold text-primary">{featured.catchphrase}</p>

          <div className="mt-8 rounded-card border border-line bg-panel p-5">
            <p className="text-xs leading-[1.9] text-txt-muted">
              Togelは「運命の人は教えない。地雷なら教える。」がコンセプトの診断エンタメ。
              あなたの取扱区分と、絶対に合わないワーストタイプを判定します。
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/diagnosis/select"
                className="flex min-h-[48px] items-center rounded-full bg-primary px-6 text-[13px] font-black text-white transition-colors hover:bg-primary-hover"
              >
                自分の地雷も知る（無料）
              </Link>
              <Link
                href="/"
                className="flex min-h-[48px] items-center rounded-full border border-[#29303f] px-6 text-[13px] font-bold text-txt-muted transition-colors hover:border-primary hover:text-white"
              >
                Togelとは
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SharePage;
