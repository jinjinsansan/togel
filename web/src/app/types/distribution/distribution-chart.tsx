"use client";

import { useEffect, useState } from "react";

type DistributionItem = {
  id: string;
  label: string;
  typeName: string;
  catchphrase: string;
  emoji: string;
  tags: string[];
  count: number;
  percentage: number;
};

/**
 * タイプ分布の横向き棒グラフ。
 * バーはグレー1色、自分のタイプのみピンク（診断済みの場合）。
 */
export const DistributionChart = ({ items }: { items: DistributionItem[] }) => {
  const [selfTypeId, setSelfTypeId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem("latestDiagnosis");
      if (!raw) return;
      const diagnosis = JSON.parse(raw) as { personalityType?: { id?: string } };
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorageはクライアントでしか読めない
      if (diagnosis.personalityType?.id) setSelfTypeId(diagnosis.personalityType.id);
    } catch {
      /* ignore */
    }
  }, []);

  const maxPct = Math.max(1, ...items.map((item) => item.percentage));
  const selfItem = items.find((item) => item.id === selfTypeId);
  const selfRank = selfItem ? items.findIndex((item) => item.id === selfTypeId) + 1 : null;

  const remark =
    selfItem && selfRank
      ? selfRank <= 6
        ? `あなた（${selfItem.typeName}）は多数派です。よく見かけるタイプ、ということです。`
        : selfRank <= 16
          ? `あなた（${selfItem.typeName}）は${selfRank}位。ほどよい生息数です。`
          : `あなた（${selfItem.typeName}）は少数派です。レアであることと生きやすさは別問題ですが。`
      : null;

  return (
    <div>
      <div className="flex flex-col gap-2">
        {items.map((item, index) => {
          const isSelf = item.id === selfTypeId;
          return (
            <div
              key={item.id}
              className={`rounded-input border px-3.5 py-3 ${
                isSelf ? "border-primary bg-dangerbg" : "border-line-soft bg-surface"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2 text-[12px] font-bold">
                <span className="flex items-center gap-2 truncate">
                  <span className="w-6 flex-none text-right font-mono text-[10px] text-txt-disabled">
                    {index + 1}
                  </span>
                  <span>{item.emoji}</span>
                  <span className={`truncate ${isSelf ? "text-white" : "text-txt-muted"}`}>
                    {item.typeName}
                  </span>
                  {isSelf && (
                    <span className="flex-none rounded-full bg-primary px-2 py-[2px] text-[9px] font-black text-white">
                      あなた
                    </span>
                  )}
                </span>
                <span className="flex-none font-mono text-[11px] text-txt-muted">
                  {item.percentage}%
                  <span className="ml-1.5 text-[9px] text-txt-disabled">{item.count}人</span>
                </span>
              </div>
              <div className="ml-8 mt-2 h-1.5 rounded-full bg-surface-alt">
                <div
                  className={`h-full rounded-full ${isSelf ? "bg-primary" : "bg-[#2a3348]"}`}
                  style={{ width: `${Math.max(2, (item.percentage / maxPct) * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {remark && (
        <p className="mt-5 text-center text-xs font-bold text-txt-muted">{remark}</p>
      )}
    </div>
  );
};
