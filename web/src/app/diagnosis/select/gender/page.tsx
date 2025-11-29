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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 md:py-20">
      <div className="container px-4 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center justify-center rounded-full bg-[#E91E63]/10 px-4 py-1.5 mb-6">
            <span className="text-sm font-bold text-[#E91E63] tracking-widest">STEP 2</span>
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-black text-slate-900 mb-4">
            あなたの性別を選択
          </h1>
          <p className="text-slate-600 leading-relaxed max-w-lg mx-auto">
            異性とのマッチング結果を表示するために、あなたの性別を教えてください。
          </p>
        </div>
        
        <div className="mx-auto mt-12 grid max-w-2xl gap-6 md:grid-cols-2">
          <button
            onClick={() => handleGenderSelect("male")}
            className="group relative flex flex-col items-center rounded-[2.5rem] border-2 border-white bg-white/80 backdrop-blur-sm p-10 shadow-xl shadow-blue-100/50 transition-all hover:scale-105 hover:shadow-2xl hover:border-blue-200 hover:bg-blue-50/30"
          >
            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-blue-50 text-6xl shadow-inner transition-transform group-hover:scale-110 group-hover:rotate-3">
              👨
            </div>
            <h2 className="mt-6 font-heading text-3xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">男性</h2>
            <p className="mt-3 text-sm font-medium text-slate-500">
              女性との相性を診断
            </p>
            <div className="mt-6 w-full">
              <div className="h-1 w-full rounded-full bg-blue-100/50 overflow-hidden">
                <div className="h-full w-0 bg-blue-500 transition-all duration-500 group-hover:w-full" />
              </div>
            </div>
          </button>

          <button
            onClick={() => handleGenderSelect("female")}
            className="group relative flex flex-col items-center rounded-[2.5rem] border-2 border-white bg-white/80 backdrop-blur-sm p-10 shadow-xl shadow-pink-100/50 transition-all hover:scale-105 hover:shadow-2xl hover:border-pink-200 hover:bg-pink-50/30"
          >
            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-pink-100 to-pink-50 text-6xl shadow-inner transition-transform group-hover:scale-110 group-hover:-rotate-3">
              👩
            </div>
            <h2 className="mt-6 font-heading text-3xl font-black text-slate-900 group-hover:text-pink-600 transition-colors">女性</h2>
            <p className="mt-3 text-sm font-medium text-slate-500">
              男性との相性を診断
            </p>
            <div className="mt-6 w-full">
              <div className="h-1 w-full rounded-full bg-pink-100/50 overflow-hidden">
                <div className="h-full w-0 bg-pink-500 transition-all duration-500 group-hover:w-full" />
              </div>
            </div>
          </button>
        </div>
        
        <div className="mx-auto mt-12 max-w-2xl text-center">
          <Button 
            variant="ghost" 
            onClick={() => router.push("/diagnosis/select")}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full px-6"
          >
            ← 診断タイプ選択に戻る
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GenderSelectPage;
