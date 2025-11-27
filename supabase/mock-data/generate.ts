import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

type Gender = "male" | "female";

const TARGET_COUNT = 150;
const OUTPUT_PATH = path.resolve(__dirname, "../../web/src/data/mock-profiles.ts");

const avatarSets = {
  male: [
    "https://images.unsplash.com/photo-1504595403659-9088ce801e29?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
  ],
  female: [
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1525130413817-d45c1d127c42?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1504208434309-cb69f4fe52b0?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=400&q=80",
  ],
  neutral: [
    "https://images.unsplash.com/photo-1507146426996-ef05306b995a?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=400&q=80",
  ],
};

const nicknames = {
  male: ["レン", "ソウタ", "ユウト", "カイ", "リク", "ショウ", "ハル", "コウ", "ユウマ", "アオイ"],
  female: ["ミユ", "サナ", "ハルカ", "アイリ", "レイナ", "ユイ", "カナミ", "ミサキ", "アヤナ", "チサ"],
};

const jobs = ["プロダクトマネージャー", "UI/UXデザイナー", "データアナリスト", "マーケター", "編集者", "プランナー", "スタイリスト", "エンジニア", "コンサルタント", "管理栄養士", "教師", "映像クリエイター", "カフェ経営", "ライター", "イベントプロデューサー"];
const bios = [
  "好奇心を軸にした働き方を追求中。週末はインドアとアウトドアのハイブリッドライフ。",
  "暮らしを整えるのが好きで、日記と写真を記録しています。",
  "人との会話からアイデアを得るタイプ。コーヒーと本でリセットします。",
  "仕事も遊びも計画派。だけどときどき予定外の出来事も楽しみたい。",
  "海外カルチャーと和の暮らしをミックスするのがマイブーム。",
  "デザイナーとしてスタートアップで奮闘中。余白がある街歩きが好き。",
];
const favoriteThings = ["フィルムカメラ", "クラフトビール", "北欧インテリア", "スニーカー集め", "ミニマルな家電", "ヴィンテージ雑貨", "ロードバイク", "観葉植物", "スペシャルティコーヒー", "サウナ旅"];
const hobbies = ["カフェ巡り", "ランニング", "サイクリング", "登山", "キャンプ", "写真", "ピラティス", "料理", "イラスト", "ボルダリング", "映画鑑賞", "ライブ", "ダンス", "ガーデニング"];
const skills = ["プレゼン", "UXリサーチ", "チームビルド", "コーチング", "動画編集", "レシピ開発", "ファシリ", "データ整理", "語学", "コミュニティ運営", "イラスト", "DIY"];
const values = ["誠実さ", "挑戦", "余白のある暮らし", "好奇心", "自律", "思いやり", "共創", "バランス感覚", "探究心", "ユーモア"];
const commStyles = ["ナチュラル", "ストレート", "丁寧", "柔らかめ", "ロジカル", "聞き上手", "リアクション多め", "穏やか", "フランク", "メリハリ型"];
const interestsPool = ["テック", "アート", "クラフト", "旅", "サウナ", "アウトドア", "お酒", "読書", "音楽", "シネマ", "DIY", "スタートアップ", "ヨガ", "写真"];
const cities = ["東京都", "神奈川県", "千葉県", "埼玉県", "大阪府", "京都府", "愛知県", "福岡県", "兵庫県", "広島県", "宮城県", "北海道"];

const randomPick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const pickAvatar = (gender: Gender, index: number) => {
  const pools = [...avatarSets[gender], ...avatarSets.neutral];
  return pools[index % pools.length];
};

const buildProfile = (gender: Gender, index: number) => {
  const suffixPool = ["", "っち", "さん", "くん", "ちゃん"];
  const suffix = randomPick(suffixPool);
  const nickname = `${randomPick(nicknames[gender])}${suffix || ""}`.trim();

  const shuffledInterests = [...interestsPool].sort(() => Math.random() - 0.5);
  const interestSample = shuffledInterests.slice(0, 3);

  return {
    id: `mock-${gender}-${String(index + 1).padStart(3, "0")}`,
    nickname,
    age: randomInt(24, 39),
    gender,
    avatarUrl: pickAvatar(gender, index),
    bio: randomPick(bios),
    job: randomPick(jobs),
    favoriteThings: randomPick(favoriteThings),
    hobbies: randomPick(hobbies),
    specialSkills: randomPick(skills),
    values: randomPick(values),
    communication: randomPick(commStyles),
    interests: interestSample,
    city: randomPick(cities),
  };
};

const generateProfiles = () => {
  const profiles = [] as ReturnType<typeof buildProfile>[];

  for (let i = 0; i < TARGET_COUNT; i++) {
    profiles.push(buildProfile("male", i));
  }

  for (let i = 0; i < TARGET_COUNT; i++) {
    profiles.push(buildProfile("female", i));
  }

  return profiles;
};

const buildFile = (profiles: ReturnType<typeof buildProfile>[]) => {
  const header = 'import { MatchingProfile } from "@/types/diagnosis";\n\n';
  const body = `export const mockProfiles: MatchingProfile[] = ${JSON.stringify(profiles, null, 2)};\n`;
  return `${header}${body}`;
};

const main = () => {
  const dir = path.dirname(OUTPUT_PATH);
  mkdirSync(dir, { recursive: true });
  const profiles = generateProfiles();
  const file = buildFile(profiles);
  writeFileSync(OUTPUT_PATH, file);
  console.log(`Generated ${profiles.length} mock profiles at ${OUTPUT_PATH}`);
};

main();
