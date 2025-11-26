import { fakerJA as faker } from "@faker-js/faker";
import { createClient } from "@supabase/supabase-js";

const requiredEnv = ["SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_URL"] as const;

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing ${key} in environment variables`);
  }
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
);

const genderOptions = ["male", "female"] as const;

const generateUser = (index: number) => {
  const gender = genderOptions[index % 2];
  return {
    line_user_id: `mock-line-${index}`,
    gender,
    nickname: faker.person.firstName(),
    birth_date: faker.date.birthdate({ min: 18, max: 45, mode: "age" }).toISOString(),
    avatar_url: `https://api.dicebear.com/8.x/adventurer/svg?seed=${index}`,
    bio: faker.person.bio(),
    job: faker.person.jobTitle(),
    favorite_things: faker.helpers.arrayElement(["カフェ巡り", "旅", "料理", "筋トレ"]),
    hobbies: faker.helpers.arrayElement(["映画", "読書", "アウトドア", "写真"]),
    special_skills: faker.helpers.arrayElement(["傾聴", "企画", "ユーモア", "忍耐"]),
    annual_income: faker.helpers.arrayElement([
      "300万円未満",
      "300-500万円",
      "500-800万円",
      "800万円以上",
    ]),
    height: faker.number.int({ min: 150, max: 185 }),
    weight: faker.number.int({ min: 45, max: 85 }),
    twitter_url: null,
    instagram_url: null,
    income_visible: true,
    is_mock_data: true,
  };
};

const main = async () => {
  const payload = Array.from({ length: 200 }).map((_, index) => generateUser(index));
  const { error } = await supabase.from("users").insert(payload);
  if (error) {
    console.error(error);
    process.exit(1);
  }
  console.log(`Inserted ${payload.length} mock users`);
};

main();
