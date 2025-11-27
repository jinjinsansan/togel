import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

type Gender = "male" | "female";

const TARGET_COUNT = 150;
const OUTPUT_PATH = path.resolve(__dirname, "../../web/src/data/mock-profiles.ts");

const avatarPool = [
  // ペット
  "https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1425082661705-1834bfd09dca?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1574158622682-e40e69881006?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1548681528-6a5c45b66b42?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1415369629372-26f2fe60c467?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1560807707-8cc77767d783?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1560743173-567a3b5658b1?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1416184008836-5486f3e2cf58?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1571988840298-3b5301d5109b?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1548366565-6bbab241282d?auto=format&fit=crop&w=400&q=80",
  // 風景・自然
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1507146426996-ef05306b995a?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?auto=format&fit=crop&w=400&q=80",
  // 食べ物・カフェ
  "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1490818387583-1baba5e638af?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1481480551145-2370a440d585?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1551782450-a2132b4ba21d?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1493770348161-369560ae357d?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1512389142860-9c449e58a543?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1529603992250-cdc60ac1c2d1?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&w=400&q=80",
  // 植物・花
  "https://images.unsplash.com/photo-1466637574441-749b8f19452f?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1470058869958-2a77ade41c02?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1502945015378-0e284ca1a5be?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1516307365426-bea591f05011?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1485808191679-5f86510681a2?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1563822249548-9a72b6d466b6?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1600298881974-6be191ceeda1?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1524678606370-a47ad25cb82a?auto=format&fit=crop&w=400&q=80",
  // 音楽・アート・趣味
  "https://images.unsplash.com/photo-1493612276216-ee3925520721?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1523821741446-edb2b68bb7a0?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1536599424071-eee7e5e4c556?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1534452203293-494d7ddbf7e0?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1558980664-769d59546b3d?auto=format&fit=crop&w=400&q=80",
  // インテリア・デザイン・雑貨
  "https://images.unsplash.com/photo-1452570053594-1b985d6ea890?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1497888329096-51c27beff665?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1615486511484-92e172cc4fe0?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1517760444937-f6397edcbbcd?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&w=400&q=80",
  // テクノロジー・ワークスペース
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1510511459019-5dda7724fd87?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1532274402911-5a369e4c4bb5?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1452457807411-4979b707c5be?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1487260211189-670c54da558d?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1504805572947-34fad45aed93?auto=format&fit=crop&w=400&q=80",
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

const pickAvatar = () => {
  return avatarPool[Math.floor(Math.random() * avatarPool.length)];
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
    avatarUrl: pickAvatar(),
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
