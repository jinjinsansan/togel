import { notFound } from "next/navigation";

import { DiagnosisPreview } from "./preview";

/**
 * 【開発用】診断すごろくの静的プレビュー。**本番では404を返す。**
 *
 * 診断画面は認証の内側にあり、回答の保存状態でしか描画されない。
 * そのため「いま画面上でどう見えているか」を外から確認できなかった。
 * 同じ理由で置いた開発用プレビューはこれで3つ目
 * （攻略盤 `/dev/preview/board` ・深掘り `/dev/preview/deep` ・ここ）。
 *
 * 盤・設問カード・中間マスは**本番と同じコンポーネント**を、
 * 本番と同じ入れ子（`/diagnosis/[type]/page.tsx`）で並べている。
 * ここで作り直すと、見ているものと出ているものが別々に育つ。
 *
 *   TOGEL_DEV_PREVIEW=1 npm run start
 *   /dev/preview/diagnosis?q=1          （1問目・まだ何も答えていない）
 *   /dev/preview/diagnosis?q=8          （最初の区切りを越えた直後）
 *   /dev/preview/diagnosis?q=7&phase=milestone  （区切りそのもの）
 *   /dev/preview/diagnosis?q=40         （最後の設問）
 *   /dev/preview/diagnosis?q=20&overview=1      （全体を見る）
 */
export const dynamic = "force-dynamic";

export default async function DiagnosisPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; phase?: string; overview?: string; total?: string }>;
}) {
  if (process.env.TOGEL_DEV_PREVIEW !== "1") notFound();

  const params = await searchParams;
  const total = params.total === "10" ? 10 : 40;
  const requested = Number(params.q ?? "1");
  const questionNumber = Math.max(1, Math.min(total, Number.isFinite(requested) ? requested : 1));

  return (
    <DiagnosisPreview
      total={total}
      questionNumber={questionNumber}
      phase={params.phase === "milestone" ? "milestone" : "quiz"}
      overview={params.overview === "1"}
    />
  );
}
