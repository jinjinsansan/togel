import { fakerJA as faker } from "@faker-js/faker";

import { MatchingProfile } from "@/types/diagnosis";

const animalTypes = [
  "こじか-月",
  "ひつじ-地球",
  "狼-太陽",
  "猿-新月",
  "チーター-満月",
  "黒ひょう-月",
  "ライオン-地球",
  "虎-太陽",
  "たぬき-新月",
  "子守熊-満月",
  "ゾウ-月",
  "ペガサス-地球",
];

const pick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

export const generateMockProfiles = (count = 50): MatchingProfile[] => {
  return Array.from({ length: count }).map((_, idx) => ({
    id: `mock-${idx + 1}`,
    nickname: faker.person.firstName(),
    age: faker.number.int({ min: 18, max: 45 }),
    gender: idx % 2 === 0 ? "female" : "male",
    avatarUrl: `https://api.dicebear.com/8.x/thumbs/svg?seed=${idx + 1}`,
    bio: faker.person.bio(),
    job: faker.person.jobTitle(),
    favoriteThings: faker.lorem.sentence(),
    hobbies: faker.helpers.arrayElement(["カフェ巡り", "登山", "映画鑑賞", "ボードゲーム"]),
    specialSkills: faker.helpers.arrayElement(["傾聴", "ポジティブ思考", "計画力", "サプライズ"]),
    values: faker.helpers.arrayElement(["家族優先", "成長志向", "安定志向", "挑戦好き"]),
    communication: faker.helpers.arrayElement(["穏やか", "率直", "ユーモア", "落ち着き"]),
    interests: faker.helpers.multiple(() => faker.company.catchPhraseNoun(), { count: 3 }),
    city: faker.location.city(),
    animalType: pick(animalTypes),
  }));
};

export const mockProfiles = generateMockProfiles();
