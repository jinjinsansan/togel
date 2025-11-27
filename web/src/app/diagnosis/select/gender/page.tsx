"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
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
    <div className="container py-12">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold text-primary">STEP 2</p>
        <h1 className="mt-3 font-heading text-4xl">あなたの性別を選択</h1>
        <p className="mt-4 text-muted-foreground">
          異性とのマッチング結果を表示するために、あなたの性別を教えてください。
        </p>
      </div>
      <div className="mx-auto mt-12 grid max-w-2xl gap-6 md:grid-cols-2">
        <button
          onClick={() => handleGenderSelect("male")}
          className="group flex flex-col items-center rounded-3xl border-2 border-border bg-white/90 p-8 shadow-card transition-all hover:border-primary hover:shadow-lg"
        >
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-100 text-5xl transition-colors group-hover:bg-blue-200">
            👨
          </div>
          <h2 className="mt-4 font-heading text-2xl">男性</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            女性とのマッチング結果を表示
          </p>
        </button>
        <button
          onClick={() => handleGenderSelect("female")}
          className="group flex flex-col items-center rounded-3xl border-2 border-border bg-white/90 p-8 shadow-card transition-all hover:border-primary hover:shadow-lg"
        >
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-pink-100 text-5xl transition-colors group-hover:bg-pink-200">
            👩
          </div>
          <h2 className="mt-4 font-heading text-2xl">女性</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            男性とのマッチング結果を表示
          </p>
        </button>
      </div>
      <div className="mx-auto mt-8 max-w-2xl text-center">
        <Button variant="ghost" onClick={() => router.push("/diagnosis/select")}>
          ← 診断タイプ選択に戻る
        </Button>
      </div>
    </div>
  );
};

export default GenderSelectPage;
