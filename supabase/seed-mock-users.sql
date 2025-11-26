-- モックユーザーデータのシード（サンプル20名）
-- 実際の運用では200名程度用意することを推奨

INSERT INTO users (line_id, display_name, picture_url, status_message, gender, birthday, occupation, income_range, location, animal_zodiac_type, is_profile_complete) VALUES
-- 男性10名
('mock-male-001', '田中 太郎', 'https://api.dicebear.com/7.x/avataaars/svg?seed=male001', '人生は冒険だ！', 'male', '1995-04-15', 'エンジニア', '600-800', '東京都', 'energetic_tiger', true),
('mock-male-002', '佐藤 健', 'https://api.dicebear.com/7.x/avataaars/svg?seed=male002', 'コーヒーとコードが好き', 'male', '1992-08-22', 'デザイナー', '400-600', '神奈川県', 'calm_elephant', true),
('mock-male-003', '鈴木 誠', 'https://api.dicebear.com/7.x/avataaars/svg?seed=male003', '週末はキャンプ', 'male', '1998-03-10', '営業', '500-700', '千葉県', 'adventurous_lion', true),
('mock-male-004', '高橋 翔', 'https://api.dicebear.com/7.x/avataaars/svg?seed=male004', 'データ分析が趣味', 'male', '1990-11-05', 'コンサルタント', '800-1000', '東京都', 'analytical_owl', true),
('mock-male-005', '伊藤 隼人', 'https://api.dicebear.com/7.x/avataaars/svg?seed=male005', '旅と音楽と映画', 'male', '1996-06-18', 'マーケター', '600-800', '大阪府', 'creative_dolphin', true),
('mock-male-006', '渡辺 大輔', 'https://api.dicebear.com/7.x/avataaars/svg?seed=male006', 'チームワーク重視', 'male', '1993-02-28', 'プロジェクトマネージャー', '700-900', '埼玉県', 'gentle_panda', true),
('mock-male-007', '山本 駿', 'https://api.dicebear.com/7.x/avataaars/svg?seed=male007', 'スポーツ観戦が日課', 'male', '1994-09-12', '公務員', '400-600', '愛知県', 'playful_monkey', true),
('mock-male-008', '中村 健太', 'https://api.dicebear.com/7.x/avataaars/svg?seed=male008', '読書と哲学', 'male', '1991-12-03', '研究者', '500-700', '京都府', 'wise_fox', true),
('mock-male-009', '小林 亮', 'https://api.dicebear.com/7.x/avataaars/svg?seed=male009', 'アウトドア派', 'male', '1997-07-25', 'インストラクター', '300-500', '北海道', 'brave_wolf', true),
('mock-male-010', '加藤 翼', 'https://api.dicebear.com/7.x/avataaars/svg?seed=male010', 'クリエイティブ思考', 'male', '1995-01-30', 'アーティスト', '200-400', '福岡県', 'imaginative_peacock', true),

-- 女性10名
('mock-female-001', '山田 花子', 'https://api.dicebear.com/7.x/avataaars/svg?seed=female001', 'カフェ巡りが趣味', 'female', '1996-05-20', 'デザイナー', '400-600', '東京都', 'gentle_cat', true),
('mock-female-002', '鈴木 美咲', 'https://api.dicebear.com/7.x/avataaars/svg?seed=female002', 'ヨガとランニング', 'female', '1994-09-14', 'ヨガインストラクター', '300-500', '神奈川県', 'energetic_rabbit', true),
('mock-female-003', '高橋 愛', 'https://api.dicebear.com/7.x/avataaars/svg?seed=female003', 'アートと音楽が好き', 'female', '1992-03-08', 'キュレーター', '500-700', '大阪府', 'creative_butterfly', true),
('mock-female-004', '田中 優子', 'https://api.dicebear.com/7.x/avataaars/svg?seed=female004', '旅行と写真', 'female', '1998-11-22', 'フォトグラファー', '400-600', '京都府', 'adventurous_bird', true),
('mock-female-005', '伊藤 舞', 'https://api.dicebear.com/7.x/avataaars/svg?seed=female005', 'データサイエンス勉強中', 'female', '1995-07-17', 'データアナリスト', '600-800', '東京都', 'analytical_dolphin', true),
('mock-female-006', '渡辺 結衣', 'https://api.dicebear.com/7.x/avataaars/svg?seed=female006', '料理とお菓子作り', 'female', '1993-12-05', '栄養士', '300-500', '千葉県', 'nurturing_deer', true),
('mock-female-007', '中村 咲', 'https://api.dicebear.com/7.x/avataaars/svg?seed=female007', '本と映画の世界', 'female', '1997-02-10', '編集者', '400-600', '神奈川県', 'wise_owl', true),
('mock-female-008', '小林 瞳', 'https://api.dicebear.com/7.x/avataaars/svg?seed=female008', 'ファッションとコスメ', 'female', '1996-08-28', 'バイヤー', '500-700', '東京都', 'stylish_flamingo', true),
('mock-female-009', '加藤 葵', 'https://api.dicebear.com/7.x/avataaars/svg?seed=female009', '自然とハイキング', 'female', '1994-04-15', '環境コンサルタント', '600-800', '長野県', 'calm_koala', true),
('mock-female-010', '佐藤 椛', 'https://api.dicebear.com/7.x/avataaars/svg?seed=female010', 'ボランティア活動中', 'female', '1999-10-03', 'NPOスタッフ', '200-400', '沖縄県', 'compassionate_swan', true)

ON CONFLICT (line_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  picture_url = EXCLUDED.picture_url,
  status_message = EXCLUDED.status_message,
  gender = EXCLUDED.gender,
  birthday = EXCLUDED.birthday,
  occupation = EXCLUDED.occupation,
  income_range = EXCLUDED.income_range,
  location = EXCLUDED.location,
  animal_zodiac_type = EXCLUDED.animal_zodiac_type,
  is_profile_complete = EXCLUDED.is_profile_complete;

-- 必要に応じて200名分まで増やすことを推奨
-- 以下のような形式で追加してください：
-- ('mock-male-011', '名前', 'URL', 'メッセージ', 'male', '1990-01-01', '職業', '400-600', '地域', 'animal_type', true),
