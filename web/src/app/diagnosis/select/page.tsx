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
    <div className="min-h-screen bg-[#fdeef4] py-10 md:py-16">
      <div className="container max-w-2xl px-5">
        <div className="text-center">
          <p className="text-xs font-extrabold tracking-[0.3em] text-[#E91E63]">START DIAGNOSIS</p>
          <h1 className="mt-2 font-heading text-2xl font-black text-[#23202a] md:text-3xl">
            診断を始める
          </h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            まずは診断タイプを選択。直感で選ぶだけ。
          </p>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {plans.map((plan) => (
            <div
              key={plan.type}
              className="flex flex-col rounded-[20px] border border-[#efe7ec] bg-white p-5 shadow-[0_8px_24px_-16px_rgba(233,30,99,0.4)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_34px_-18px_rgba(233,30,99,0.5)]"
            >
              <div className="mb-4 flex items-center justify-between">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                    plan.type === "light"
                      ? "bg-blue-50 text-blue-600"
                      : "bg-[#ffe9f0] text-[#E91E63]"
                  }`}
                >
                  {plan.type === "light" ? "カジュアル" : "スタンダード"}
                </span>
                <span className="flex items-center gap-1 text-xs font-bold text-[#9aa1ad]">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {plan.time}
                </span>
              </div>

              <h2 className="font-heading text-xl font-black text-[#23202a]">{plan.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#6b7280]">{plan.description}</p>

              <ul className="mt-4 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5 text-sm font-medium text-[#4b5563]">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleSelectPlan(plan.type as "light" | "full")}
                className="mt-5 h-12 w-full rounded-full bg-gradient-to-br from-[#ff5e93] to-[#E91E63] text-base font-extrabold text-white shadow-[0_14px_30px_-14px_rgba(233,30,99,0.7)] transition-all hover:opacity-95"
              >
                {plan.type === "light" ? "ライト版で始める →" : "スタンダード版で始める →"}
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-start gap-2.5 rounded-[14px] border border-[#fbd0e0] bg-[#ffe9f0] p-3.5">
          <span className="text-xl">🔒</span>
          <p className="m-0 text-xs leading-relaxed text-[#c2185b]">
            18歳以上限定。診断結果はあなただけに表示され、安全に管理されます。
          </p>
        </div>
      </div>
    </div>
  );
};

export default DiagnosisSelectPage;
