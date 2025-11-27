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
  trait: "openness" | "conscientiousness" | "extraversion" | "agreeableness" | "neuroticism";
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

export type PersonalityTypeDefinition = {
  id: string;
  typeName: string;
  description: string;
  dominantTraits: string[];
  characteristics: {
    strengths: string[];
    growthAreas: string[];
    communication: string;
    workStyle: string;
    relationships: string;
  };
  compatibleTypes: string[];
};

// ビッグファイブ特性スコア
export type BigFiveScores = {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
};

// 診断結果（ビッグファイブ特化）
export type DiagnosisResult = {
  id: string;
  nickname: string;
  gender: "male" | "female";
  bigFiveScores: BigFiveScores;
  personalityType: PersonalityTypeDefinition;
  narrative?: string;
  createdAt: string;
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
};

export type CompatibilityBreakdown = {
  personality: number;
  valueAlignment: number;
  communication: number;
  total: number;
};

export type PersonalizedInsights = {
  strengths: string[];
  growthAreas: string[];
  relationshipStyle: string;
  challenges: string[];
};

export type MatchingResult = {
  ranking: number;
  score: number;
  profile: MatchingProfile;
  summary: string;
  highlights: string[];
  compatibility: CompatibilityBreakdown;
  compatibilityReason: string;
  personalityTypes: {
    user: PersonalityTypeDefinition;
    profile: PersonalityTypeDefinition;
  };
  bigFiveScores: {
    user: BigFiveScores;
    profile: BigFiveScores;
  };
  insights: PersonalizedInsights;
  catchphrase: string;
  dateIdea: string;
  commonalities: string[];
  conversationStarters: string[];
};
