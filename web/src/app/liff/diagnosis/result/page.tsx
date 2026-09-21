"use client";

import { useEffect, useState } from "react";

import { GroupBadge } from "@/components/brand/group-badge";
import { useLiff } from "@/lib/line/use-liff";
import { personalityTypes, typeToken } from "@/lib/personality";
import { TOGEL_INDEX, togelIndexPercent } from "@/lib/personality/togel-index";
import type { DiagnosisResult, MatchingResult, MismatchResult } from "@/types/diagnosis";

/**
 * LINE内（LIFF）の診断結果。
 *
 * 意匠はブランド面（/result と同じパターン）。新しい意匠は作らない。
 * 5指標の算出は lib/personality/togel-index.ts を使う（以前はここに
 * 軸名と反転ロジックが複製されていて、本体とずれる余地があった）。
 */

export default function LiffResultPage() {
  const { isReady, closeLiff, openExternal, error: liffError } = useLiff();
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [matchingResults, setMatchingResults] = useState<MatchingResult[]>([]);
  const [mismatchResults, setMismatchResults] = useState<MismatchResult[]>([]);

  useEffect(() => {
    const diagnosisRaw = sessionStorage.getItem("latestDiagnosis");
    const matchingRaw = sessionStorage.getItem("latestMatching");
    const mismatchRaw = sessionStorage.getItem("latestMismatch");

    /* eslint-disable react-hooks/set-state-in-effect -- sessionStorageはクライアントでしか読めない */
    if (diagnosisRaw) setDiagnosis(JSON.parse(diagnosisRaw));
    if (matchingRaw) setMatchingResults(JSON.parse(matchingRaw));
    if (mismatchRaw) setMismatchResults(JSON.parse(mismatchRaw));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  if (!isReady && !liffError) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-ink">
        <div className="flex flex-col items-center gap-5">
          <div className="w-[160px] overflow-hidden rounded-full">
            <div className="animate-marquee h-2 w-[400%] bg-hazard" />
          </div>
          <p className="text-[12px] font-bold text-txt-subtle">LINE接続中…</p>
        </div>
      </div>
    );
  }

  if (!diagnosis) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-ink px-5.5 text-white">
        <div className="text-center">
          <p className="text-[17px] font-black">診断結果が見つかりません</p>
          <p className="mt-2 text-[13px] leading-[1.95] text-txt-muted">
            LINEトーク画面から「診断」と送って、診断を受けてください。
          </p>
          <button
            type="button"
            onClick={closeLiff}
            className="mt-6 min-h-[52px] rounded-[14px] bg-primary px-8 text-[15px] font-black text-white transition-colors hover:bg-primary-hover"
          >
            LINEに戻る
          </button>
        </div>
      </div>
    );
  }

  const pt = diagnosis.personalityType;
  const extended = personalityTypes.find((type) => type.id === pt.id) ?? null;
  const worstTypeId = mismatchResults[0]?.personalityTypes?.profile?.id;
  const worstType = personalityTypes.find((type) => type.id === worstTypeId) ?? null;

  return (
    <div className="min-h-[100dvh] bg-ink text-white">
      {/* ヒーロー: あなたのタイプ */}
      <section className="bg-[radial-gradient(120%_90%_at_50%_-20%,rgba(11,31,58,.9),transparent_60%)] px-5.5 pb-[26px] pt-8">
        <div className="mx-auto max-w-xl">
          <div className="text-[11px] font-black tracking-[0.22em] text-hazard">YOUR TYPE / 24</div>
          <div className="mt-3.5 text-[40px] leading-none">{pt.emoji}</div>
          <h1 className="mt-3 text-[30px] font-black leading-[1.25] tracking-[-0.03em]">
            {extended ? typeToken(extended) : pt.typeName}
          </h1>
          {extended && (
            <div className="mt-1.5 text-[13px] font-bold text-txt-muted">{pt.typeName}</div>
          )}
          <div className="mt-2 text-[13px] font-bold text-primary">{pt.catchphrase}</div>
          {extended && <GroupBadge group={extended.group} className="mt-4" />}
        </div>
      </section>

      <div className="mx-auto max-w-xl px-5.5 pb-10">
        {/* トゥゲル指標 */}
        <section className="rounded-card border border-line bg-surface p-5">
          <div className="text-[10px] font-black tracking-[0.22em] text-txt-muted">TOGEL INDEX</div>
          <div className="mt-4 flex flex-col gap-3">
            {TOGEL_INDEX.map(({ key, label }) => {
              const pct = togelIndexPercent(key, diagnosis.bigFiveScores);
              const high = pct >= 50;
              return (
                <div key={key}>
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-txt-muted">{label}</span>
                    <span className={high ? "text-hazard" : "text-primary"}>{pct}</span>
                  </div>
                  <div className="mt-[5px] h-1.5 rounded-full bg-surface-alt">
                    <div
                      className={`h-full rounded-full ${high ? "bg-hazard" : "bg-primary"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 特徴 */}
        <section className="mt-3.5 flex flex-col gap-2.5">
          <div className="rounded-card border border-line bg-surface p-5">
            <div className="text-[10px] font-black tracking-[0.22em] text-relief">強み</div>
            <ul className="mt-2.5 flex flex-col gap-1.5">
              {pt.characteristics.strengths.map((item) => (
                <li key={item} className="flex items-start gap-2 text-[13px] leading-[1.9] text-[#D5DBE8]">
                  <span className="mt-[2px] flex-none text-relief">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-card border border-warnline bg-warnbg p-5">
            <div className="text-[10px] font-black tracking-[0.22em] text-hazard">成長ポイント</div>
            <ul className="mt-2.5 flex flex-col gap-1.5">
              {pt.characteristics.growthAreas.map((item) => (
                <li key={item} className="flex items-start gap-2 text-[13px] leading-[1.9] text-[#D5DBE8]">
                  <span className="mt-[2px] flex-none text-hazard">!</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-card border border-line bg-surface p-5">
            <div className="text-[10px] font-black tracking-[0.22em] text-txt-muted">
              コミュニケーション
            </div>
            <p className="mt-2.5 text-[13px] leading-[1.9] text-[#D5DBE8]">
              {pt.characteristics.communication}
            </p>
          </div>
          <div className="rounded-card border border-line bg-surface p-5">
            <div className="text-[10px] font-black tracking-[0.22em] text-txt-muted">恋愛傾向</div>
            <p className="mt-2.5 text-[13px] leading-[1.9] text-[#D5DBE8]">
              {pt.characteristics.relationships}
            </p>
          </div>
        </section>

        {/* 要注意の相手 */}
        {mismatchResults.length > 0 && (
          <section className="mt-6">
            <h2 className="text-[10px] font-black tracking-[0.22em] text-primary">要注意の相手</h2>
            <div className="mt-3 flex flex-col gap-2.5">
              {mismatchResults.slice(0, 2).map((m) => (
                <div
                  key={m.ranking}
                  className="flex items-center gap-3.5 rounded-card border border-dangerline bg-dangerbg p-4"
                >
                  <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary text-[15px] font-black text-white">
                    {m.ranking}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-black">{m.profile.nickname}</p>
                    <p className="text-[11px] text-txt-muted">{m.catchphrase}</p>
                  </div>
                  <div className="text-[15px] font-black text-primary">{m.score}%</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 相性の良い人 */}
        {matchingResults.length > 0 && (
          <section className="mt-6">
            <h2 className="text-[10px] font-black tracking-[0.22em] text-relief">
              相性の良い人 TOP {Math.min(3, matchingResults.length)}
            </h2>
            <div className="mt-3 flex flex-col gap-2.5">
              {matchingResults.slice(0, 3).map((m) => (
                <div
                  key={m.ranking}
                  className="flex items-center gap-3.5 rounded-card border border-line bg-surface p-4"
                >
                  <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-surface-alt text-[15px] font-black text-relief">
                    {m.ranking}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-black">{m.profile.nickname}</p>
                    <p className="text-[11px] text-txt-muted">{m.profile.job}</p>
                  </div>
                  <div className="text-[15px] font-black text-relief">{m.score}%</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 診断直後の行き先。ワースト1の取扱説明が最も具体的なので主導線にする */}
        <section className="mt-6 rounded-card border border-line bg-panel p-5">
          <div className="text-[10px] font-black tracking-[0.22em] text-hazard">次にやること</div>
          <p className="mt-2.5 text-[13px] leading-[1.95] text-txt-muted">
            {worstType
              ? `${typeToken(worstType)}とは、言い方を変えるだけで事故が減ります。`
              : "合わない相手との付き合い方は、タイプごとに違います。"}
          </p>
          <div className="mt-4 flex flex-col gap-2.5">
            {worstType && (
              <button
                type="button"
                onClick={() => openExternal(`https://www.to-gel.com/coaching/${worstType.id}`)}
                className="flex min-h-[54px] items-center justify-center rounded-[14px] bg-primary px-5 text-[15px] font-black text-white transition-colors hover:bg-primary-hover"
              >
                {worstType.emoji} {typeToken(worstType)}の取扱説明を読む
              </button>
            )}
            <button
              type="button"
              onClick={() => openExternal("https://www.to-gel.com/coaching")}
              className="flex min-h-[48px] items-center justify-center rounded-[14px] border border-line px-5 text-[13px] font-bold text-txt-muted transition-colors hover:border-hazard hover:text-white"
            >
              あなたの盤を見る（全15マス）
            </button>
          </div>
        </section>

        <p className="mt-7 text-center text-[11px] font-bold text-txt-subtle">
          タイプは傾向、ラベルは個人。
        </p>

        <button
          type="button"
          onClick={closeLiff}
          className="mt-4 flex min-h-[54px] w-full items-center justify-center rounded-[14px] bg-primary text-[15px] font-black text-white transition-colors hover:bg-primary-hover"
        >
          LINEに戻る
        </button>
      </div>
    </div>
  );
}
