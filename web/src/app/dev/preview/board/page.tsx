import { notFound } from "next/navigation";

import { BoardHero, BoardTypeCards } from "@/components/coaching/board-view";
import { ANGLES_PER_TYPE, BOARD_ANGLES, cellKey } from "@/lib/coaching/board";
import { personalityTypes } from "@/lib/personality";
import type { ExtendedPersonalityTypeDefinition } from "@/lib/personality/definitions";

/**
 * 【開発用】攻略盤の静的プレビュー。**本番では404を返す。**
 *
 * 攻略盤は利用者ごとの保存状態（localStorage）でしか描画されないため、
 * 外から見ることができなかった。同じ問題がこれまで3回出ている
 * （LIFFの案内・フォントの太さ・盤）ので、都度オーナー待ちに積むのをやめて、
 * **見られる経路を用意する。**
 *
 * 見た目は `components/coaching/board-view.tsx` を本番と共有している。
 * ここで作り直すと、見ているものと出ているものが別々に育つ。
 *
 *   TOGEL_DEV_PREVIEW=1 npm run start
 *   http://localhost:3000/dev/preview/board?walked=0   （まだ歩いていない）
 *   http://localhost:3000/dev/preview/board?walked=7   （途中）
 *   http://localhost:3000/dev/preview/board?walked=15  （歩き切った）
 *
 * 🔴 これで見えるのは「設計どおりか」まで。**実機で本当にそう見えるか**
 * （フォントの太さ、iOSのdvh、LINE内WebView）は別の問題として残る。
 */

/**
 * 実行時に判定する。モジュールの外側で読むとビルド時に畳み込まれ、
 * 環境変数を付けて起動しても404のままになる（実際そうなった）。
 */
export const dynamic = "force-dynamic";

/** 設計（Togel 攻略盤.dc.html）のモックと同じ3タイプ */
const SAMPLE_TYPE_IDS = ["charismatic-enthusiast", "active-communicator", "social-innovator"];

export default async function BoardPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ walked?: string }>;
}) {
  // Vercel では設定しないので404になる
  if (process.env.TOGEL_DEV_PREVIEW !== "1") notFound();

  const types = SAMPLE_TYPE_IDS.map((id) =>
    personalityTypes.find((type) => type.id === id),
  ).filter((type): type is ExtendedPersonalityTypeDefinition => Boolean(type));

  const total = types.length * ANGLES_PER_TYPE;
  const requested = Number((await searchParams).walked ?? "7");
  const walked = Math.max(0, Math.min(total, Number.isFinite(requested) ? requested : 7));

  // 先頭から順に walked マスぶん埋める
  const visited = types
    .flatMap((type) => BOARD_ANGLES.map((angle) => cellKey(type.id, angle.key)))
    .slice(0, walked);

  return (
    <div className="min-h-screen bg-paper text-navy">
      <section
        className="bg-[linear-gradient(180deg,#0b1f3a_0%,#0b1f3a_52%,#F4F7F5_52%,#F4F7F5_100%)] px-5.5 pb-[26px] pt-[30px]"
        style={{ containerType: "inline-size" }}
      >
        <div className="mx-auto max-w-[1120px]">
          <div className="inline-flex items-center gap-2 rounded-full border border-relief/40 bg-relief/[.14] px-[13px] py-[5px]">
            <span className="text-[11px] font-black tracking-[0.22em] text-relief">あなたの盤</span>
          </div>
          <BoardHero types={types} visited={visited} walked={walked} />
        </div>
      </section>

      <section className="px-5.5 pb-[34px] pt-3.5">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-3.5">
          <BoardTypeCards types={types} visited={visited} />

          <div className="rounded-card border border-dashed border-[#cfdad4] bg-white px-5.5 py-[18px] text-center">
            <p className="text-[13px] font-black leading-[1.95] text-navy">
              タイプは傾向、ラベルは個人。
              <br />
              <span className="font-normal text-lighttext-subtle">
                隣のあの人の本当のラベルは、本人にしかわかりません。
              </span>
            </p>
          </div>

          <div className="grid items-center gap-[18px] rounded-hero bg-navy p-[22px] sm:grid-cols-2">
            <div>
              <div className="text-[11px] font-black tracking-[0.22em] text-relief">
                週に1通、全{total}回
              </div>
              <div className="mt-2 text-[18px] font-black leading-[1.5] text-white">
                1通目から、踏まない歩き方だけ送ります
              </div>
              <p className="mt-2 text-[12px] leading-[1.9] text-[#b7c6dd]">
                届いたリンクを開くと、その1マスが埋まります。読まなかった週は、ただ進まないだけです。
              </p>
            </div>
            <span className="flex min-h-[54px] items-center justify-center rounded-[14px] bg-linegreen text-[15px] font-black text-white">
              1通目を受け取る
            </span>
          </div>

          {walked >= total && (
            <div className="grid items-center gap-4 rounded-card border border-lightline bg-white px-5.5 py-5 shadow-[0_20px_40px_-30px_rgba(11,31,58,.5)] sm:grid-cols-2">
              <div>
                <div className="text-[11px] font-black tracking-[0.22em] text-relief-ink">
                  歩き切ったあと
                </div>
                <div className="mt-[7px] text-[15px] font-black leading-[1.6] text-navy">
                  あと2タイプ、あなたと噛み合わない相手がいます
                </div>
                <p className="mt-[7px] text-[12px] leading-[1.9] text-lighttext-subtle">
                  40問の診断で、その2タイプが読めるようになります。盤の長さは変わりません。
                </p>
              </div>
              <span className="flex min-h-[52px] items-center justify-center rounded-[14px] bg-primary text-[14px] font-black text-ink">
                40問の診断へ
              </span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
