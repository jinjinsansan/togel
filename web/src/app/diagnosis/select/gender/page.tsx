"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useDiagnosisStore } from "@/store/diagnosis-store";

const GenderSelectPage = () => {
  const router = useRouter();
  const { diagnosisType, setUserGender } = useDiagnosisStore();

  useEffect(() => {
    if (!diagnosisType) {
      router.push("/diagnosis/select");
    }
  }, [diagnosisType, router]);

  const handleGenderSelect = (gender: "male" | "female") => {
    setUserGender(gender);
    router.push(`/diagnosis/${diagnosisType}`);
  };

  return (
    <div className="min-h-screen bg-ink text-white">
      <div className="mx-auto max-w-xl px-5.5 pb-10 pt-[30px]">
        <div className="text-[11px] font-black tracking-[0.26em] text-hazard">STEP 2 / 3</div>
        <h1 className="mt-3.5 text-[28px] font-black leading-[1.4] tracking-[-0.02em]">
          あなたの性別は？
        </h1>
        <p className="mt-3 text-[13px] leading-[1.95] text-txt-muted">
          マッチング候補の抽出にのみ使用します。
        </p>

        <div className="mt-[26px] grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleGenderSelect("male")}
            className="rounded-[18px] border border-line bg-surface px-3 py-[30px] text-[17px] font-black transition-colors hover:border-primary hover:bg-dangerbg"
          >
            男性
          </button>
          <button
            type="button"
            onClick={() => handleGenderSelect("female")}
            className="rounded-[18px] border border-line bg-surface px-3 py-[30px] text-[17px] font-black transition-colors hover:border-primary hover:bg-dangerbg"
          >
            女性
          </button>
        </div>

        <button
          type="button"
          onClick={() => router.push("/diagnosis/select")}
          className="mt-5 text-xs font-bold text-txt-subtle transition-colors hover:text-white"
        >
          ← 戻る
        </button>
      </div>
    </div>
  );
};

export default GenderSelectPage;
