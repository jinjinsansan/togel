import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

type Gender = "male" | "female";

const TARGET_COUNT = 150;
const OUTPUT_PATH = path.resolve(__dirname, "../../web/src/data/mock-profiles.ts");

const avatarSets = {
  male: [
    "https://images.unsplash.com/photo-1504595403659-9088ce801e29?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1448932223592-d1fc686e76ea?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&w=400&q=80",
  ],
  female: [
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1525130413817-d45c1d127c42?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1445633814773-c3ac65bdb48c?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=400&q=80",
  ],
  neutral: [
    "https://images.unsplash.com/photo-1507146426996-ef05306b995a?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1470123808288-1e59739ba8f2?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1477346611705-65d1883cee1e?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=400&q=80",
  ],
};

const petAvatars = [
  "https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1425082661705-1834bfd09dca?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1574158622682-e40e69881006?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=400&q=80",
];

const sceneryAvatars = [
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1470124560017-8d01bee1f5df?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1469470379115-8b3e6690e708?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1508675801627-066ac4346a60?auto=format&fit=crop&w=400&q=80",
];

const nicknames = {
  male: ["レン", "ソウタ", "ユウト", "カイ", "リク", "ショウ", "ハル", "コウ", "ユウマ", "アオイ", "ダイチ", "タイガ", "シュン", "アユム", "ユウタ", "レント", "ツバサ", "ヒロト", "ミナト", "タクト"],
  female: ["ミユ", "サナ", "ハルカ", "アイリ", "レイナ", "ユイ", "カナミ", "ミサキ", "アヤナ", "チサ", "ミオ", "リサ", "マリン", "ヒナタ", "ユズハ", "ノゾミ", "アカリ", "ミレイ", "ナギサ", "レミ"],
};

const fullTimeJobs = ["プロダクトマネージャー", "UI/UXデザイナー", "データアナリスト", "マーケター", "編集者", "プランナー", "スタイリスト", "エンジニア", "コンサルタント", "管理栄養士", "教師", "映像クリエイター", "カフェ経営", "ライター", "イベントプロデューサー", "プロジェクトコーディネーター", "メディアディレクター", "HRスペシャリスト", "コミュニティマネージャー", "リサーチャー", "地方創生プランナー", "データサイエンティスト"];
const freelanceJobs = ["フリーランスデザイナー", "プロボノマーケター", "合同会社の共同創業メンバー", "業務委託エンジニア", "フリー編集者", "コミュニティの発起人", "セラピスト見習い", "スタートアップ顧問"];
const transitionStatuses = [
  "現在は次の挑戦に向けて準備中",
  "育休・学び直し期間",
  "地方移住を計画中",
  "転職活動中",
  "旅しながら複数案件に関わり中",
  "家族のサポート期間",
  "大学院で研究に集中",
  "いまはフルタイムで働いていない",
  "ライフイベントに合わせてゆるく働き方を調整中",
];
const hybridStyles = ["週3リモート勤務", "午前は会社員 / 午後はカフェ手伝い", "複業クリエイター", "スタートアップと地域プロジェクトの二足のわらじ", "合同会社経営 & メディア発信", "平日は会社員 / 週末はイベント主催"];

const bios = [
  "好奇心を軸にした働き方を追求中。週末はインドアとアウトドアのハイブリッドライフ。",
  "暮らしを整えるのが好きで、日記と写真を記録しています。",
  "人との会話からアイデアを得るタイプ。コーヒーと本でリセットします。",
  "仕事も遊びも計画派。だけどときどき予定外の出来事も楽しみたい。",
  "海外カルチャーと和の暮らしをミックスするのがマイブーム。",
  "デザイナーとしてスタートアップで奮闘中。余白がある街歩きが好き。",
  "地域と都市を行き来しながら、小さな実験を続けています。",
  "会社員と個人プロジェクトの二刀流。余裕のある暮らし方を模索中。",
  "身体を整えることがテーマ。食と睡眠にこだわっています。",
  "環境と福祉分野に関心があり、学び直しをしています。",
];
const favoriteThings = ["フィルムカメラ", "クラフトビール", "北欧インテリア", "スニーカー集め", "ミニマルな家電", "ヴィンテージ雑貨", "ロードバイク", "観葉植物", "スペシャルティコーヒー", "サウナ旅", "銭湯スタンプ", "レコード", "和菓子", "キャンプギア", "手帳術"];
const hobbies = ["カフェ巡り", "ランニング", "サイクリング", "登山", "キャンプ", "写真", "ピラティス", "料理", "イラスト", "ボルダリング", "映画鑑賞", "ライブ", "ダンス", "ガーデニング", "陶芸", "ZINEづくり", "サウナ", "カヤック", "街歩き配信", "ギャラリー巡り"];
const skills = ["プレゼン", "UXリサーチ", "チームビルド", "コーチング", "動画編集", "レシピ開発", "ファシリ", "データ整理", "語学", "コミュニティ運営", "イラスト", "DIY", "ワークショップ設計", "資金調達", "カウンセリング", "データ可視化", "企画書づくり"];
const values = ["誠実さ", "挑戦", "余白のある暮らし", "好奇心", "自律", "思いやり", "共創", "バランス感覚", "探究心", "ユーモア", "ローカル愛", "自然体", "信頼", "多様性"];
const commStyles = ["ナチュラル", "ストレート", "丁寧", "柔らかめ", "ロジカル", "聞き上手", "リアクション多め", "穏やか", "フランク", "メリハリ型", "リズミカル", "落ち着いたトーン"];
const interestsPool = ["テック", "アート", "クラフト", "旅", "サウナ", "アウトドア", "お酒", "読書", "音楽", "シネマ", "DIY", "スタートアップ", "ヨガ", "写真", "コミュニティ", "環境", "教育", "福祉", "スポーツ観戦", "eスポーツ"];
const cities = ["東京都", "神奈川県", "千葉県", "埼玉県", "大阪府", "京都府", "愛知県", "福岡県", "兵庫県", "広島県", "宮城県", "北海道", "長野県", "静岡県", "茨城県", "石川県", "沖縄県"];

const randomPick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const pickAvatar = (gender: Gender) => {
  const pools = [...avatarSets[gender], ...avatarSets.neutral, ...petAvatars, ...sceneryAvatars];
  return pools[Math.floor(Math.random() * pools.length)];
};

const buildJobLabel = () => {
  const dice = Math.random();
  if (dice < 0.18) return randomPick(transitionStatuses);
  if (dice < 0.35) return `${randomPick(freelanceJobs)}（フリーランス）`;
  if (dice < 0.45) return randomPick(hybridStyles);
  return randomPick(fullTimeJobs);
};

const nicknameSuffix: Record<Gender, string[]> = {
  male: ["", "くん", "さん", "っち"],
  female: ["", "ちゃん", "さん", "っち"],
};

const buildProfile = (gender: Gender, index: number) => {
  const suffix = randomPick(nicknameSuffix[gender]);
  const nickname = `${randomPick(nicknames[gender])}${suffix || ""}`.trim();

  const shuffledInterests = [...interestsPool].sort(() => Math.random() - 0.5);
  const interestSample = shuffledInterests.slice(0, 3);

  return {
    id: `mock-${gender}-${String(index + 1).padStart(3, "0")}`,
    nickname,
    age: randomInt(24, 39),
    gender,
    avatarUrl: pickAvatar(gender),
    bio: randomPick(bios),
    job: buildJobLabel(),
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
