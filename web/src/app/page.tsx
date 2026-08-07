"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { TogelMark } from "@/components/brand/togel-mark";

const marqueeItems = [
  { text: "取扱注意", className: "text-hazard" },
  { text: "DANGER", className: "text-txt-disabled" },
  { text: "相性より、非相性。", className: "text-primary" },
  { text: "MISMATCH FIRST", className: "text-txt-disabled" },
  { text: "取扱注意", className: "text-hazard" },
  { text: "DANGER", className: "text-txt-disabled" },
];

const Marquee = () => (
  <div className="overflow-hidden border-b border-line-soft bg-panel py-[7px]">
    <div className="animate-marquee flex w-[200%]">
      {[false, true].map((hidden) => (
        <div
          key={String(hidden)}
          className="flex w-1/2 flex-none gap-[26px] pr-[26px]"
          aria-hidden={hidden || undefined}
        >
          {marqueeItems.map((item, i) => (
            <span
              key={i}
              className={`whitespace-nowrap text-[10px] font-black tracking-[0.32em] ${item.className}`}
            >
              {item.text}
            </span>
          ))}
        </div>
      ))}
    </div>
  </div>
);

/** ヒーロー横の「封印カード」: 開封するとミスマッチ結果のプレビューが見える */
const SealedCard = () => {
  const [sealed, setSealed] = useState(true);

  return (
    <div className="w-full max-w-[360px] overflow-hidden rounded-hero border border-line bg-surface shadow-[0_40px_80px_-30px_rgba(0,0,0,.9)]">
      <div className="h-1.5 bg-hazard-sm" aria-hidden="true" />
      <div className="flex items-center justify-between border-b border-line-soft px-[18px] py-3.5">
        <span className="text-[10px] font-black tracking-[0.24em] text-hazard">
          MISMATCH / WORST 1
        </span>
        <span className="text-[10px] font-black tracking-[0.14em] text-txt-disabled">
          {sealed ? "封印中" : "開封済"}
        </span>
      </div>

      {sealed ? (
        <div className="px-5 pb-6 pt-[26px] text-center">
          <div className="text-[11px] font-bold tracking-[0.1em] text-txt-muted">
            あなたと絶対に合わないのは
          </div>
          <div className="mx-auto mt-4 w-fit select-none rounded-[10px] bg-surface-alt px-[18px] py-2.5 text-[26px] font-black text-txt-disabled blur-[6px]">
            ██████タイプ
          </div>
          <p className="mx-auto mt-[18px] max-w-[24em] text-xs leading-[1.95] text-txt-subtle">
            この先には、あなたの人格ではなく「相性」への容赦ない指摘が含まれます。笑える人だけどうぞ。
          </p>
          <button
            type="button"
            onClick={() => setSealed(false)}
            className="mt-5 min-h-[52px] w-full rounded-[14px] bg-primary text-[15px] font-black tracking-[0.04em] text-white shadow-danger transition-colors hover:bg-primary-hover"
          >
            封を切る
          </button>
          <div className="mt-2.5 animate-pulse text-[10px] text-txt-disabled">
            タップで開封プレビュー
          </div>
        </div>
      ) : (
        <div className="animate-rise px-5 pb-6 pt-[22px]">
          <div className="text-[11px] font-bold tracking-[0.1em] text-txt-muted">
            あなたと絶対に合わないのは
          </div>
          <div className="mt-2 text-[27px] font-black leading-[1.3] tracking-[-0.02em] text-primary">
            情熱先行リーダー型
          </div>
          <div className="mt-1.5 text-[13px] font-bold text-white/90">
            「主語がデカい人」と「細かい事務作業で死ぬ人」の全面戦争
          </div>

          <div className="mt-[18px] rounded-input border border-dangerline bg-dangerbg px-[15px] py-3.5">
            <div className="text-[10px] font-black tracking-[0.2em] text-primary">
              付き合ったら起こる地獄
            </div>
            <p className="mt-2 text-xs leading-[1.9] text-txt-muted">
              3ヶ月目、相手の「とりあえずやってみよう」であなたの予定表が焼け野原になる。
            </p>
          </div>

          <div className="mt-2.5 rounded-input border border-line bg-panel px-[15px] py-3.5">
            <div className="text-[10px] font-black tracking-[0.2em] text-hazard">
              絶対にやってはいけないこと
            </div>
            <p className="mt-2 text-xs leading-[1.9] text-txt-muted">
              「で、それ誰がやるの？」と正論で返す。刺さりますが、燃えます。
            </p>
          </div>

          <div className="mt-3.5 border-t border-dashed border-line pt-3.5 text-xs leading-[1.9] text-txt-muted">
            <span className="font-black text-relief">救い：</span>
            相手の勢いを止めず、締切だけ握る。それだけで、この関係は成立します。
          </div>

          <button
            type="button"
            onClick={() => setSealed(true)}
            className="mt-4 min-h-[44px] w-full rounded-input border border-line bg-transparent text-xs font-bold text-txt-muted transition-colors hover:border-primary hover:text-white"
          >
            封をしなおす
          </button>
        </div>
      )}
    </div>
  );
};

export default function Home() {
  const [authError, setAuthError] = useState<string | null>(null);

  // OAuthコールバックからのエラーをユーザーに表示する（従来は無言で失敗していた）
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (!err) return;
    const messages: Record<string, string> = {
      oauth_error: "ログインに失敗しました。もう一度お試しください。",
      session_error: "セッションの作成に失敗しました。もう一度お試しください。",
      no_code: "認証情報が取得できませんでした。もう一度お試しください。",
    };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- URLクエリはクライアントでしか読めない
    setAuthError(messages[err] ?? "ログイン中にエラーが発生しました。もう一度お試しください。");
    // URLからエラーパラメータを除去
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  return (
    <div className="bg-ink text-white">
      {authError && (
        <div className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
          <div
            role="alert"
            className="flex w-full max-w-md items-start gap-2 rounded-input bg-error px-4 py-3 text-sm text-white shadow-lg"
          >
            <span className="flex-1">{authError}</span>
            <button
              type="button"
              onClick={() => setAuthError(null)}
              aria-label="閉じる"
              className="shrink-0 font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <Marquee />

      {/* ヒーロー */}
      <section className="relative overflow-hidden bg-[radial-gradient(120%_90%_at_50%_-10%,rgba(255,46,116,.22),transparent_62%)] px-5.5 pb-13 pt-11">
        <div className="mx-auto grid max-w-[1120px] items-center gap-11 md:grid-cols-2">
          <div style={{ containerType: "inline-size" }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-hazard/40 bg-hazard/[.07] py-1.5 pl-2 pr-3">
              <span className="flex h-4 w-4 items-center justify-center rounded bg-hazard text-[10px] font-black text-ink">
                ▲
              </span>
              <span className="text-[11px] font-black tracking-[0.14em] text-hazard">
                診断結果、取扱注意
              </span>
            </div>

            <h1 className="mt-5 text-display" style={{ textWrap: "pretty" }}>
              運命の人は
              <br />
              教えない。
              <br />
              <span className="text-primary">地雷なら教える。</span>
            </h1>

            <p
              className="mt-5 max-w-[34em] text-[15px] leading-8 text-txt-muted"
              style={{ textWrap: "pretty" }}
            >
              Togel＝<strong className="font-bold text-white">告げる</strong>
              。独自開発の40問「トゥゲル診断」で24タイプに判定し、あなたと
              <strong className="font-bold text-white">絶対に合わない5タイプ</strong>
              を名指しします。相性のいい人？ おまけです。
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/diagnosis/select"
                className="flex min-h-[56px] items-center justify-center gap-2.5 rounded-full bg-hazard px-[30px] text-base font-black text-ink shadow-cta transition-colors hover:bg-white"
              >
                地雷を見る
                <span className="text-xs font-bold opacity-60">40問・無料</span>
              </Link>
              <Link
                href="/diagnosis/select"
                className="flex min-h-[56px] items-center justify-center rounded-full border border-[#29303f] px-[26px] text-sm font-bold text-txt-muted transition-colors hover:border-hazard hover:text-white"
              >
                まず10問で試す
              </Link>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {["所要 約5分", "登録なしで開始", "18歳以上向け"].map((chip) => (
                <span
                  key={chip}
                  className="rounded-chip border border-line-soft px-2.5 py-[5px] text-[11px] font-bold text-txt-subtle"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <SealedCard />
          </div>
        </div>
      </section>

      {/* CONCEPT */}
      <section className="border-t border-line-soft bg-panel px-5.5 py-13">
        <div className="mx-auto max-w-[1120px]" style={{ containerType: "inline-size" }}>
          <div className="text-label text-primary">CONCEPT</div>
          <h2 className="mt-3.5 text-h1" style={{ textWrap: "pretty" }}>
            言いにくいことを、
            <br />
            代わりに告げる。
          </h2>
          <p
            className="mt-4 max-w-[38em] text-sm leading-[2.05] text-txt-muted"
            style={{ textWrap: "pretty" }}
          >
            相性のいい人を教えるサービスは、もう十分あります。Togelがやるのは逆。
            <strong className="font-bold text-white">合わない相手を、先に</strong>
            。ボロクソに言いますが、最後は必ず救います。毒の対象はあくまで「タイプ」であって、あなたでも、あの人でもありません。
          </p>
          <div className="mt-[30px] grid gap-3.5 sm:grid-cols-3">
            <div className="rounded-card border border-line-soft bg-[#0f1420] p-5">
              <div className="text-[11px] font-black tracking-[0.2em] text-hazard">STEP 01</div>
              <div className="mt-2.5 text-lg font-black">40問に答える</div>
              <p className="mt-2 text-xs leading-[1.95] text-txt-muted">
                1問1画面。進むほど、逃げ場がなくなる設計。ライト10問もあります。
              </p>
            </div>
            <div className="rounded-card border border-line-soft bg-[#0f1420] p-5">
              <div className="text-[11px] font-black tracking-[0.2em] text-hazard">STEP 02</div>
              <div className="mt-2.5 text-lg font-black">24タイプに判定</div>
              <p className="mt-2 text-xs leading-[1.95] text-txt-muted">
                5つの取扱指標から、あなたの取扱区分を確定します。
              </p>
            </div>
            <div className="rounded-card border border-dangerline bg-dangerbg p-5">
              <div className="text-[11px] font-black tracking-[0.2em] text-primary">STEP 03</div>
              <div className="mt-2.5 text-lg font-black">ワースト5を告げる</div>
              <p className="mt-2 text-xs leading-[1.95] text-txt-muted">
                地獄のシナリオとNG行動つき。1位だけは、最後まで伏せます。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 看板コンテンツ */}
      <section className="bg-ink px-5.5 py-13">
        <div className="mx-auto max-w-[1120px]" style={{ containerType: "inline-size" }}>
          <div className="text-label text-hazard">看板コンテンツ</div>
          <h2 className="mb-[26px] mt-3.5 text-h1">
            脇役だったものを、
            <br />
            看板に上げました。
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="relative overflow-hidden rounded-[18px] border border-dangerline bg-[linear-gradient(160deg,#1a0e15,#0f1420)] px-5.5 py-[26px]">
              <div className="text-[44px] font-black leading-none text-primary opacity-25">01</div>
              <div className="mt-1.5 text-xl font-black">付き合ったら起こる地獄のシナリオ</div>
              <p className="mt-3 text-[13px] leading-8 text-txt-muted">
                出会って3ヶ月、半年、1年。何がどう壊れるかを時系列で。読み終わる頃には笑っています。
              </p>
            </div>
            <div className="relative overflow-hidden rounded-[18px] border border-warnline bg-[linear-gradient(160deg,#1a1608,#0f1420)] px-5.5 py-[26px]">
              <div className="text-[44px] font-black leading-none text-hazard opacity-25">02</div>
              <div className="mt-1.5 text-xl font-black">絶対にやってはいけないこと</div>
              <p className="mt-3 text-[13px] leading-8 text-txt-muted">
                タイプ別の禁止事項リスト。心当たりがある人ほど、スクショして送りたくなります。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 地雷回避ガイド（ライト面＝救い） */}
      <section className="bg-paper px-5.5 py-13 text-navy">
        <div className="mx-auto max-w-[1120px]" style={{ containerType: "inline-size" }}>
          <div className="inline-flex items-center gap-2 rounded-full bg-navy px-3.5 py-1.5">
            <span className="text-[11px] font-black tracking-[0.16em] text-relief">
              毒のあとに、救いを
            </span>
          </div>
          <h2 className="mt-4 text-h1">地雷回避ガイド</h2>
          <p
            className="mt-3.5 max-w-[36em] text-sm leading-[2.05] text-lighttext-muted"
            style={{ textWrap: "pretty" }}
          >
            合わないと分かっても、上司も、友達も、家族も、選べません。だからTogelは「合わない相手との付き合い方」まで用意しました。ここからは、明るい話です。
          </p>
          <div className="mt-[26px] grid gap-3 sm:grid-cols-3">
            {[
              {
                title: "言い方の翻訳",
                body: "同じ内容を、相手のタイプに刺さる言葉に置き換える例文集。",
              },
              {
                title: "地雷の踏み方図解",
                body: "やりがちなNG行動と、その3秒前に戻る方法。",
              },
              {
                title: "距離の置き方",
                body: "無理に分かり合わない、という選択肢の作り方。",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-[14px] border border-lightline bg-white p-[18px]">
                <div className="text-sm font-black">{item.title}</div>
                <p className="mt-1.5 text-xs leading-[1.9] text-lighttext-subtle">{item.body}</p>
              </div>
            ))}
          </div>
          <Link
            href="/coaching"
            className="mt-6 inline-flex min-h-[52px] items-center rounded-full bg-navy px-[26px] text-sm font-black text-white transition-colors hover:bg-primary"
          >
            ガイドを見る
          </Link>
        </div>
      </section>

      {/* MEMBER CARD */}
      <section className="bg-[linear-gradient(180deg,#07090F,#0B0F1A)] px-5.5 py-13">
        <div className="mx-auto grid max-w-[1120px] items-center gap-9 md:grid-cols-2">
          <div style={{ containerType: "inline-size" }}>
            <div className="text-label text-hazard">MEMBER CARD</div>
            <h2 className="mt-3.5 text-h1">危険物取扱者カード</h2>
            <p className="mt-3.5 max-w-[32em] text-[13px] leading-8 text-txt-muted">
              名物の3D回転メタリック会員証を、新コンセプトで再解釈。あなたの取扱区分と、注意事項が刻印されます。マイページでいつでも回せます。
            </p>
          </div>
          <div className="flex justify-center [perspective:900px]">
            <div className="flex aspect-[1.586] w-full max-w-[330px] flex-col justify-between rounded-card border border-[#2c3a58] bg-metal p-5 shadow-[0_30px_60px_-25px_rgba(255,46,116,.5)] transition-transform duration-500 ease-togel [transform:rotateY(-14deg)_rotateX(6deg)] hover:[transform:rotateY(6deg)_rotateX(0deg)]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[9px] font-black tracking-[0.28em] text-hazard">
                    HAZARDOUS TYPE LICENSE
                  </div>
                  <div className="mt-2 text-[19px] font-black text-white">静観する現実主義者型</div>
                </div>
                <TogelMark size={26} className="flex-none" />
              </div>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-[9px] tracking-[0.2em] text-[#7d879b]">注意事項</div>
                  <div className="mt-1 text-[11px] font-bold text-txt-muted">
                    熱量の高い人物と密閉空間に置かないこと
                  </div>
                </div>
                <div className="whitespace-nowrap font-mono text-[9px] text-[#7d879b]">NO. 04-A</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 最終CTA */}
      <section className="relative overflow-hidden bg-[radial-gradient(110%_90%_at_50%_0%,rgba(255,46,116,.32),#07090F_62%)] px-5.5 pb-13 pt-[60px] text-center">
        <h2
          className="text-[clamp(26px,4cqw,44px)] font-black leading-[1.35] tracking-[-0.03em]"
          style={{ containerType: "normal" }}
        >
          言われる覚悟、
          <br />
          ありますか。
        </h2>
        <p className="mx-auto mt-4 max-w-[26em] text-[13px] leading-8 text-txt-muted">
          40問。約5分。最後にあなたと絶対に合わない5タイプを告げます。
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href="/diagnosis/select"
            className="flex min-h-[58px] items-center justify-center rounded-full bg-hazard px-[34px] text-base font-black text-ink shadow-cta transition-colors hover:bg-white"
          >
            診断をはじめる
          </Link>
          <a
            href="https://lin.ee/T7OYAGQ"
            target="_blank"
            rel="noreferrer"
            className="flex min-h-[58px] items-center justify-center gap-2 rounded-full bg-linegreen px-[26px] text-sm font-black text-white transition-opacity hover:opacity-90"
          >
            LINEで結果を受け取る
          </a>
        </div>
        <p className="mt-[18px] text-[11px] text-txt-disabled">
          ※ エンタメ目的の診断です。18歳以上の方が対象です。
        </p>
      </section>
    </div>
  );
}
