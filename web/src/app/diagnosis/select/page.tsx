"use client";

import { useRouter } from "next/navigation";

import { useDiagnosisStore } from "@/store/diagnosis-store";

const DiagnosisSelectPage = () => {
  const router = useRouter();
  const { setDiagnosisType } = useDiagnosisStore();

  const handleSelectPlan = (type: "light" | "full") => {
    setDiagnosisType(type);
    router.push("/diagnosis/select/gender");
  };

  return (
    <div className="min-h-screen bg-ink text-white">
      <div className="mx-auto max-w-xl px-5.5 pb-10 pt-[30px]">
        <div className="text-[11px] font-black tracking-[0.26em] text-hazard">STEP 1 / 3</div>
        <h1 className="mt-3.5 text-[28px] font-black leading-[1.4] tracking-[-0.02em]">
          どこまで
          <br />
          言われたいですか。
        </h1>
        <p className="mt-3 text-[13px] leading-[1.95] text-txt-muted">
          設問が多いほど、指摘は具体的になります。
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => handleSelectPlan("light")}
            className="rounded-[18px] border border-line bg-surface p-5 text-left transition-colors hover:border-hazard"
          >
            <div className="flex items-center justify-between">
              <span className="text-[19px] font-black">ライト診断</span>
              <span className="rounded-full bg-line-soft px-2.5 py-1 text-[11px] font-black text-txt-muted">
                10問 / 約2分
              </span>
            </div>
            <p className="mt-2 text-xs leading-[1.9] text-txt-muted">
              まず味見したい人へ。ワースト3までお伝えします。
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleSelectPlan("full")}
            className="relative rounded-[18px] border border-primary bg-[linear-gradient(160deg,#160d14,#0d111b)] p-5 text-left shadow-[0_20px_50px_-26px_rgba(255,46,116,.9)] transition-colors hover:border-hazard"
          >
            <div className="flex items-center justify-between">
              <span className="text-[19px] font-black">スタンダード診断</span>
              <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-black text-white">
                40問 / 約5分
              </span>
            </div>
            <p className="mt-2 text-xs leading-[1.9] text-txt-muted">
              ワースト5・地獄のシナリオ・NG行動まで全部。おすすめ。
            </p>
          </button>
        </div>

        <div className="mt-5.5 rounded-[14px] border border-line-soft bg-panel p-4">
          <div className="text-[10px] font-black tracking-[0.2em] text-hazard">注意事項</div>
          <p className="mt-2 text-[11px] leading-[1.9] text-txt-subtle">
            本診断はエンタメ目的です。診断結果はタイプに対する記述であり、特定の個人を否定するものではありません。
          </p>
        </div>
      </div>
    </div>
  );
};

export default DiagnosisSelectPage;
