import { DiagnosisQuestion } from "@/types/diagnosis";

const likertOptions = [
  { value: 1, label: "まったくあてはまらない" },
  { value: 2, label: "あまりあてはまらない" },
  { value: 3, label: "どちらともいえない" },
  { value: 4, label: "ややあてはまる" },
  { value: 5, label: "とてもあてはまる" },
];

const singleOptions = [
  { value: 1, label: "A" },
  { value: 2, label: "B" },
  { value: 3, label: "C" },
  { value: 4, label: "D" },
];

const baseQuestions: DiagnosisQuestion[] = [
  {
    id: "q1",
    diagnosisType: "light",
    number: 1,
    text: "初対面の相手ともすぐに打ち解けられる",
    scale: "likert",
    options: likertOptions,
    trait: "sociability",
  },
  {
    id: "q2",
    diagnosisType: "light",
    number: 2,
    text: "決断を下すときは直感よりもデータを重視する",
    scale: "likert",
    options: likertOptions,
    trait: "decision",
  },
  {
    id: "q3",
    diagnosisType: "light",
    number: 3,
    text: "感情の浮き沈みよりも安定感を大切にしたい",
    scale: "likert",
    options: likertOptions,
    trait: "emotion",
  },
  {
    id: "q4",
    diagnosisType: "light",
    number: 4,
    text: "予定は分単位で立てるほうだ",
    scale: "likert",
    options: likertOptions,
    trait: "planning",
  },
  {
    id: "q5",
    diagnosisType: "light",
    number: 5,
    text: "グループでは自然とまとめ役になる",
    scale: "likert",
    options: likertOptions,
    trait: "leadership",
  },
  {
    id: "q6",
    diagnosisType: "light",
    number: 6,
    text: "サプライズで人を喜ばせるのが好き",
    scale: "likert",
    options: likertOptions,
    trait: "emotion",
  },
  {
    id: "q7",
    diagnosisType: "light",
    number: 7,
    text: "週末はインドアよりアウトドア派",
    scale: "single",
    options: singleOptions,
    trait: "sociability",
  },
  {
    id: "q8",
    diagnosisType: "light",
    number: 8,
    text: "衝突を避けるより本音で向き合いたい",
    scale: "likert",
    options: likertOptions,
    trait: "communication",
  },
  {
    id: "q9",
    diagnosisType: "light",
    number: 9,
    text: "変化の大きい環境でもわくわくする",
    scale: "likert",
    options: likertOptions,
    trait: "leadership",
  },
  {
    id: "q10",
    diagnosisType: "light",
    number: 10,
    text: "相手の小さな表情の変化に気づきやすい",
    scale: "likert",
    options: likertOptions,
    trait: "emotion",
  },
];

const lightQuestions = baseQuestions;

const fullQuestions: DiagnosisQuestion[] = [
  ...baseQuestions.map((question) => ({
    ...question,
    diagnosisType: "full" as const,
  })),
  ...Array.from({ length: 20 }).map((_, idx) => {
    const number = idx + 11;
    return {
      id: `q${number}`,
      diagnosisType: "full" as const,
      number,
      text: `しっかり版の質問 ${number}：自分らしさを表す行動について教えてください。`,
      scale: "likert" as const,
      options: likertOptions,
      trait: ["sociability", "decision", "emotion", "planning", "leadership"][idx % 5] as DiagnosisQuestion["trait"],
    } satisfies DiagnosisQuestion;
  }),
];

export const questions: DiagnosisQuestion[] = [...lightQuestions, ...fullQuestions];

export const getQuestionsByType = (type: "light" | "full") =>
  questions
    .filter((question) => question.diagnosisType === type)
    .sort((a, b) => a.number - b.number);
