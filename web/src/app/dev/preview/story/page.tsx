import { notFound } from "next/navigation";

import { StoryPreview } from "./preview";

/**
 * 【開発用】結果ページのストーリーズ（全14枚）。**本番では404を返す**（proxy.ts でも弾く）。
 *
 * /result はログインが要り、回答の保存状態でしか描画されない。そのため
 * 「実機幅でどう見えるか」を外から撮れない。見た目は本番と同じ StoryViewer を使う。
 *
 * 分岐を**明示して**撮るためのもの。スコアから選ばせると、どの分岐の画面を
 * 見ているのかが分からなくなる（以前、1000人に1人しか読まない強度の画面で判断した）。
 *
 *   TOGEL_DEV_PREVIEW=1 npm run start
 *   /dev/preview/story?type=reliable-organizer&reaction=evaluation&intensity=mid&heat=high&card=8
 */
export const dynamic = "force-dynamic";

export default async function StoryPreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  if (process.env.TOGEL_DEV_PREVIEW !== "1") notFound();
  const q = await searchParams;
  return (
    <StoryPreview
      typeId={q.type ?? "reliable-organizer"}
      reaction={q.reaction ?? "evaluation"}
      intensity={q.intensity ?? "mid"}
      heat={q.heat ?? "high"}
      card={Number(q.card ?? "1")}
    />
  );
}
