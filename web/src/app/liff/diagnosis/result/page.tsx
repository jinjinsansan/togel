"use client";

import { useEffect, useState } from "react";

import { useLiff } from "@/lib/line/use-liff";
import type { DiagnosisResult, MatchingResult, MismatchResult } from "@/types/diagnosis";

export default function LiffResultPage() {
  const { isReady, closeLiff, error: liffError } = useLiff();
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-pink-500" />
      </div>
    );
  }

  if (!diagnosis) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
        <div className="text-center">
          <p className="text-lg font-bold text-slate-700 mb-2">診断結果が見つかりません</p>
          <p className="text-sm text-slate-500">LINEトーク画面から「診断」と送って、診断を受けてください。</p>
          <button
            onClick={closeLiff}
            className="mt-6 rounded-xl bg-slate-900 px-8 py-3 font-bold text-white"
          >
            LINEに戻る
          </button>
        </div>
      </div>
    );
  }

  const pt = diagnosis.personalityType;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#FFF0F5] to-[#FFE4EC] px-4 py-10 text-center">
        <p className="text-6xl mb-4">{pt.emoji}</p>
        <p className="text-sm font-bold text-[#E91E63] tracking-widest mb-1">YOUR TOGEL TYPE</p>
        <h1 className="text-2xl font-black text-slate-900">{pt.id}</h1>
        <p className="text-lg font-bold text-[#E91E63] mt-1">{pt.typeName}</p>
        <p className="mt-3 text-sm text-slate-600 max-w-sm mx-auto">{pt.catchphrase}</p>
      </div>

      <div className="container px-4 py-8">
        {/* トゥゲル指標スコア */}
        <section className="mb-8">
          <h2 className="text-lg font-black text-slate-900 mb-4">あなたのトゥゲル指標</h2>
          <div className="space-y-3">
            {Object.entries(diagnosis.bigFiveScores).map(([trait, score]) => {
              const labels: Record<string, string> = {
                openness: "引火点",
                conscientiousness: "構造強度",
                extraversion: "放熱量",
                agreeableness: "緩衝性能",
                neuroticism: "耐圧限界",
              };
              // 耐圧限界は元スコア（高いほどストレスに弱い）と意味が逆なので反転する
              const rawPct = ((score as number) / 5) * 100;
              const pct = trait === "neuroticism" ? 100 - rawPct : rawPct;
              return (
                <div key={trait}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-bold text-slate-700">{labels[trait] ?? trait}</span>
                    <span className="font-bold text-[#E91E63]">{Math.round(pct)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#E91E63] to-pink-400"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Characteristics */}
        <section className="mb-8">
          <h2 className="text-lg font-black text-slate-900 mb-4">あなたの特徴</h2>
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-green-600 mb-2">強み</h3>
              <ul className="space-y-1">
                {pt.characteristics.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-green-500 mt-0.5">✓</span>{s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-amber-600 mb-2">成長ポイント</h3>
              <ul className="space-y-1">
                {pt.characteristics.growthAreas.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-amber-500 mt-0.5">!</span>{s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-blue-600 mb-2">コミュニケーション</h3>
              <p className="text-sm text-slate-700">{pt.characteristics.communication}</p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-purple-600 mb-2">恋愛傾向</h3>
              <p className="text-sm text-slate-700">{pt.characteristics.relationships}</p>
            </div>
          </div>
        </section>

        {/* Top Match Preview */}
        {matchingResults.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-black text-slate-900 mb-4">
              相性の良い人 TOP {Math.min(3, matchingResults.length)}
            </h2>
            <div className="space-y-3">
              {matchingResults.slice(0, 3).map((m) => (
                <div key={m.ranking} className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-50 text-lg font-black text-[#E91E63]">
                    {m.ranking}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 truncate">{m.profile.nickname}</p>
                    <p className="text-xs text-slate-500">{m.profile.job}</p>
                  </div>
                  <div className="text-lg font-black text-[#E91E63]">{m.score}%</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Mismatch Preview */}
        {mismatchResults.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-black text-slate-900 mb-4">要注意の相手</h2>
            <div className="space-y-3">
              {mismatchResults.slice(0, 2).map((m) => (
                <div key={m.ranking} className="flex items-center gap-4 rounded-2xl bg-red-50 p-4 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-lg font-black text-red-600">
                    {m.ranking}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 truncate">{m.profile.nickname}</p>
                    <p className="text-xs text-red-500">{m.catchphrase}</p>
                  </div>
                  <div className="text-lg font-black text-red-600">{m.score}%</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Close Button */}
        <div className="text-center pb-8">
          <button
            onClick={closeLiff}
            className="rounded-xl bg-slate-900 px-10 py-3 font-bold text-white shadow-lg transition hover:bg-slate-800"
          >
            LINEに戻る
          </button>
        </div>
      </div>
    </div>
  );
}
