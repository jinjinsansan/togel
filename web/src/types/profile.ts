export type PublicProfile = {
  id: string;
  nickname: string;
  gender: "male" | "female";
  age: number;
  avatarUrl: string;
  bio: string;
  job: string;
  annualIncome?: string;
  favoriteThings: string;
  hobbies: string;
  specialSkills: string;
  workStyle?: string;
  height?: number;
  weight?: number;
  likes: string[];
  interests: string[];
  sns?: {
    x?: string;
    instagram?: string;
  };
  prankMode?: boolean;
};

export type MatchingInsight = {
  title: string;
  description: string;
  bullets: string[];
};
