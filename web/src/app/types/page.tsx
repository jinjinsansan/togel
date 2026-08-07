"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { personalityTypes, ExtendedPersonalityTypeDefinition } from "@/lib/personality/definitions";
import { getTogelLabel } from "@/lib/personality";

const findType = (id: string): ExtendedPersonalityTypeDefinition | null =>
  personalityTypes.find((t) => t.id === id) ?? null;

/** タイプ詳細のボトムシート／モーダル */
const TypeDetailSheet = ({
  type,
  onClose,
  onSelect,
}: {
  type: ExtendedPersonalityTypeDefinition;
  onClose: () => void;
  onSelect: (id: string) => void;
}) => (
  <div
    className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 backdrop-blur-sm md:items-center"
    role="dialog"
    aria-modal="true"
    aria-label={`${type.typeName}の詳細`}
    onClick={onClose}
  >
    <div
      className="animate-rise max-h-[86dvh] w-full max-w-lg overflow-y-auto rounded-t-sheet border border-line bg-panel p-6 md:rounded-sheet"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black tracking-[0.2em] text-txt-subtle">
            {getTogelLabel(type.id)}
          </div>
          <div className="mt-1.5 flex items-center gap-2.5">
            <span className="text-3xl">{type.emoji}</span>
            <div>
              <h2 className="text-xl font-black">{type.typeName}</h2>
              <div className="text-xs font-bold text-primary">{type.catchphrase}</div>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-line text-txt-muted hover:text-white"
        >
          ×
        </button>
      </div>

      <p className="mt-4 text-[13px] leading-8 text-txt-muted">{type.description}</p>

      <div className="mt-3 flex flex-wrap gap-[7px]">
        {type.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-line bg-surface-alt px-[11px] py-[5px] text-[11px] font-bold text-txt-muted"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-input border border-reliefline bg-reliefbg p-3.5">
          <div className="text-[10px] font-black tracking-[0.2em] text-relief">強み</div>
          <ul className="mt-2 flex flex-col gap-1 text-xs leading-relaxed text-[#d5efe3]">
            {type.characteristics.strengths.map((item, i) => (
              <li key={i}>・{item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-input border border-warnline bg-warnbg p-3.5">
          <div className="text-[10px] font-black tracking-[0.2em] text-hazard">弱点</div>
          <ul className="mt-2 flex flex-col gap-1 text-xs leading-relaxed text-[#e2e7f0]">
            {type.characteristics.growthAreas.map((item, i) => (
              <li key={i}>・{item}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* 合わない相手（新設の主役欄） */}
      <div className="mt-3 rounded-input border border-dangerline bg-dangerbg p-3.5">
        <div className="text-[10px] font-black tracking-[0.2em] text-primary">合わない相手</div>
        <div className="mt-2.5 flex flex-col gap-1.5">
          {type.badCompatibleTypes.map((id) => {
            const bad = findType(id);
            if (!bad) return null;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelect(id)}
                className="flex items-center gap-2 rounded-chip bg-black/20 px-2.5 py-2 text-left text-xs font-bold text-[#ffb3cd] transition-colors hover:bg-black/40"
              >
                <span>{bad.emoji}</span>
                {bad.typeName}
                <span className="ml-auto text-[10px] text-txt-subtle">詳細 →</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 相性のいい相手 */}
      <div className="mt-3 rounded-input border border-line bg-surface p-3.5">
        <div className="text-[10px] font-black tracking-[0.2em] text-txt-muted">相性のいい相手</div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {type.compatibleTypes.map((id) => {
            const good = findType(id);
            if (!good) return null;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelect(id)}
                className="rounded-full border border-line px-3 py-1.5 text-[11px] font-bold text-txt-muted transition-colors hover:border-relief hover:text-white"
              >
                {good.emoji} {good.typeName}
              </button>
            );
          })}
        </div>
      </div>

      <Link
        href="/coaching"
        className="mt-4 flex min-h-[48px] items-center justify-center rounded-input bg-relief text-[13px] font-black text-[#05130e] transition-colors hover:bg-white"
      >
        このタイプの攻略法を見る
      </Link>
    </div>
  </div>
);

const TypeListPage = () => {
  const [openId, setOpenId] = useState<string | null>(null);
  const [filterId, setFilterId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<"worst" | "all">("worst");

  // URLハッシュ (#type-xxx) から詳細シートを開く
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith("#type-")) {
      const id = hash.replace("#type-", "");
      if (personalityTypes.some((t) => t.id === id)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- URLハッシュはクライアントでしか読めない
        setOpenId(id);
      }
    }
  }, []);

  const openType = openId ? findType(openId) : null;

  // 「合わない相手から探す」: 選択タイプと合わないタイプ群を強調表示
  const highlightedIds = useMemo(() => {
    if (!filterId) return null;
    const base = findType(filterId);
    if (!base) return null;
    const set = new Set(base.badCompatibleTypes);
    for (const t of personalityTypes) {
      if (t.badCompatibleTypes.includes(filterId)) set.add(t.id);
    }
    return set;
  }, [filterId]);

  return (
    <div className="min-h-screen bg-ink text-white">
      <section
        className="bg-[radial-gradient(120%_90%_at_50%_-10%,rgba(255,46,116,.2),transparent_60%)] px-5.5 pb-6 pt-8"
        style={{ containerType: "inline-size" }}
      >
        <div className="mx-auto max-w-[1120px]">
          <div className="text-[11px] font-black tracking-[0.28em] text-hazard">24 TYPES</div>
          <h1 className="mt-3 text-h1">24タイプ図鑑</h1>
          <p className="mt-3 max-w-[34em] text-[13px] leading-8 text-txt-muted">
            全タイプの特徴と「合わない相手」を公開しています。カードをタップで詳細へ。
          </p>

          {/* 絞り込み: 合わない相手から探す */}
          <div className="mt-5 flex gap-1 rounded-full border border-line bg-surface p-1 text-xs font-black md:w-fit">
            <button
              type="button"
              onClick={() => setFilterMode("worst")}
              className={`min-h-[38px] flex-1 rounded-full px-4 transition-colors md:flex-none ${
                filterMode === "worst" ? "bg-primary text-white" : "text-txt-muted"
              }`}
            >
              合わない相手から探す
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterMode("all");
                setFilterId(null);
              }}
              className={`min-h-[38px] flex-1 rounded-full px-4 transition-colors md:flex-none ${
                filterMode === "all" ? "bg-primary text-white" : "text-txt-muted"
              }`}
            >
              全タイプ
            </button>
          </div>

          {filterMode === "worst" && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {personalityTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setFilterId((prev) => (prev === type.id ? null : type.id))}
                  className={`min-h-[36px] flex-none rounded-full border px-3 text-[11px] font-bold transition-colors ${
                    filterId === type.id
                      ? "border-hazard bg-hazard text-ink"
                      : "border-line text-txt-muted hover:text-white"
                  }`}
                >
                  {type.emoji} {type.typeName}
                </button>
              ))}
            </div>
          )}
          {filterId && (
            <p className="mt-2.5 text-[11px] font-bold text-txt-subtle">
              <span className="text-hazard">{findType(filterId)?.typeName}</span>
              と相性最悪のタイプをハイライトしています
            </p>
          )}
        </div>
      </section>

      <section className="px-5.5 pb-12">
        <div className="mx-auto grid max-w-[1120px] grid-cols-2 gap-2.5 md:grid-cols-4">
          {personalityTypes.map((type) => {
            const worstNames = type.badCompatibleTypes
              .map((id) => findType(id)?.typeName)
              .filter(Boolean);
            const dimmed = highlightedIds ? !highlightedIds.has(type.id) && type.id !== filterId : false;
            const highlighted = highlightedIds?.has(type.id) ?? false;
            return (
              <button
                key={type.id}
                id={`type-${type.id}`}
                type="button"
                onClick={() => setOpenId(type.id)}
                className={`rounded-input border p-3.5 text-left transition-all ${
                  highlighted
                    ? "border-primary bg-dangerbg"
                    : "border-line bg-surface hover:border-primary"
                } ${dimmed ? "opacity-35" : ""}`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">{type.emoji}</span>
                  <span className="text-[13px] font-black leading-tight">{type.typeName}</span>
                </div>
                <div className="mt-[3px] text-[10px] text-txt-subtle">{type.catchphrase}</div>
                <div className="mt-2.5 border-t border-dashed border-line pt-[9px]">
                  <div className="text-[9px] font-black tracking-[0.14em] text-primary">
                    合わない相手
                  </div>
                  <div className="mt-[3px] text-[10.5px] font-bold leading-snug text-txt-muted">
                    {worstNames[0]}
                    {worstNames.length > 1 ? ` ほか${worstNames.length - 1}` : ""}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {openType && (
        <TypeDetailSheet
          type={openType}
          onClose={() => setOpenId(null)}
          onSelect={(id) => setOpenId(id)}
        />
      )}
    </div>
  );
};

export default TypeListPage;
