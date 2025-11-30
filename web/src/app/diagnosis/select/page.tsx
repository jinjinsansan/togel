"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useDiagnosisStore } from "@/store/diagnosis-store";

const plans = [
  {
    type: "light",
    title: "ライト版 (10問)",
    description: "3分でサクッと相性診断。まずは気軽に試したい方向け。",
    features: ["10問のコア質問", "結果の自動保存", "上位5名のマッチング"],
    time: "約3分",
  },
  {
    type: "full",
    title: "スタンダード版 (40問)",
    description: "価値観・コミュニケーションまで深掘り。精度重視のスタンダードプラン。",
    features: ["40問スタンダード診断", "価値観マップ生成", "AIによる根拠文章"],
    time: "約8分",
  },
];

const DiagnosisSelectPage = () => {
  const router = useRouter();
  const { setDiagnosisType } = useDiagnosisStore();

  const handleSelectPlan = (type: "light" | "full") => {
    setDiagnosisType(type);
    router.push("/diagnosis/select/gender");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 md:py-20">
      <div className="container px-4 md:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center justify-center rounded-full bg-[#E91E63]/10 px-4 py-1.5 mb-6">
            <span className="text-sm font-bold text-[#E91E63] tracking-widest">STEP 1</span>
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-black text-slate-900 mb-4">
            診断タイプを選択
          </h1>
          <p className="text-slate-600 leading-relaxed max-w-xl mx-auto">
            時間がない方はライト版、じっくり診断したい方はスタンダード版をお選びください。
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.type}
              className="group relative flex flex-col rounded-[2rem] border-2 border-white bg-white/80 backdrop-blur-sm p-8 shadow-xl shadow-slate-200/50 transition-all hover:scale-[1.02] hover:shadow-2xl hover:border-pink-100"
            >
              <div className="absolute top-0 left-0 h-full w-full rounded-[2rem] bg-gradient-to-br from-white/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none" />
              
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-slate-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs font-bold tracking-wider">{plan.time}</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  plan.type === "light" 
                    ? "bg-blue-50 text-blue-600 border-blue-100" 
                    : "bg-pink-50 text-pink-600 border-pink-100"
                }`}>
                  {plan.type === "light" ? "カジュアル" : "スタンダード"}
                </span>
              </div>

              <h2 className="font-heading text-2xl font-black text-slate-900 mb-3">{plan.title}</h2>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">{plan.description}</p>
              
              <div className="mt-auto space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm font-medium text-slate-700">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button 
                  onClick={() => handleSelectPlan(plan.type as "light" | "full")} 
                  className={`w-full h-12 rounded-xl text-base font-bold shadow-lg transition-all hover:shadow-xl ${
                    plan.type === "light"
                      ? "bg-slate-900 hover:bg-slate-800 text-white"
                      : "bg-gradient-to-r from-[#E91E63] to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white border-0"
                  }`}
                >
                  {plan.type === "light" ? "ライト版で始める" : "スタンダード版で始める"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DiagnosisSelectPage;
