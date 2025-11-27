export type DiagnosisType = "light" | "full";

export type ChoiceScale = "single" | "likert";

export type QuestionOption = {
  value: number;
  label: string;
};

export type DiagnosisQuestion = {
  id: string;
  diagnosisType: DiagnosisType;
  number: number;
  text: string;
  helper?: string;
  scale: ChoiceScale;
  options: QuestionOption[];
  trait: "sociability" | "decision" | "emotion" | "planning" | "leadership" | "communication";
};

export type Answer = {
  questionId: string;
  value: number;
};

export type DiagnosisPayload = {
  diagnosisType: DiagnosisType;
  userGender: "male" | "female";
  answers: Answer[];
};

export type MatchingProfile = {
  id: string;
  nickname: string;
  age: number;
  gender: "male" | "female";
  avatarUrl: string;
  bio: string;
  job: string;
  favoriteThings: string;
  hobbies: string;
  specialSkills: string;
  values: string;
  communication: string;
  interests: string[];
  city: string;
  animalType: string;
};

export type MatchingResult = {
  ranking: number;
  score: number;
  profile: MatchingProfile;
  summary: string;
  compatibility: {
    personality: string;
    valueAlignment: string;
    communication: string;
  };
};
