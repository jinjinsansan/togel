# 性格診断マッチングサイト 要件定義書

## 1. プロジェクト概要
### 1.1 サービス名（仮）
Matching診断（正式名称は後日決定）

### 1.2 サービスコンセプト
性格診断を通じて相性の良い異性5名をAIがマッチングする、カジュアルな出会い支援サービス。

### 1.3 ターゲットユーザー
- 18歳以上の男女
- 新しい出会いを求める人
- 気軽に診断を楽しみたい人

## 2. 技術スタック
### 2.1 フロントエンド
- フレームワーク: Next.js 14+（App Router）
- 言語: TypeScript
- スタイリング: Tailwind CSS
- UIコンポーネント: shadcn/ui（推奨）
- 状態管理: React Context / Zustand
- ホスティング: Vercel

### 2.2 バックエンド
- データベース: Supabase（PostgreSQL）
- 認証: Supabase Auth + LINE Login
- API: Next.js API Routes / Supabase Edge Functions
- サーバー: Vercel / Render / Cloudflare Pages

### 2.3 その他
- 画像ストレージ: Supabase Storage
- AI/ロジック: Claude API（マッチング根拠生成）
- アナリティクス: 後日検討

## 3. 機能要件
### 3.1 ユーザー認証
#### 3.1.1 ログイン方式
- LINEログインのみ（1ユーザー1アカウント制約のため）
- Supabase Auth + LINE Provider統合

#### 3.1.2 年齢制限
- 18歳以上のみ登録可能
- 生年月日入力による年齢確認

### 3.2 診断システム
#### 3.2.1 診断タイプ
| タイプ | 質問数 | 特徴 |
| --- | --- | --- |
| ライト版 | 10問 | カジュアル、気軽なマッチング |
| しっかり版 | 30問 | 詳細、精度の高いマッチング |

#### 3.2.2 質問形式
- 選択式（4択または5段階評価）
- 動物占いロジックを裏側で利用（ユーザーには非表示）
- 質問内容はAIが動物占いを分析して生成

#### 3.2.3 診断の進行
- プログレスバー表示
- 前の質問に戻る機能
- 途中保存機能（未ログイン時はLocalStorage、ログイン済み時はSupabase DB）

#### 3.2.4 診断結果
- 性格タイプ（動物占いベース、60タイプ）を判定
- タイプ名はユーザーには非表示
- マッチング根拠内では「あなたは〇〇タイプ」と表記

### 3.3 マッチングシステム
#### 3.3.1 マッチング対象
- 異性のみ（同性は除外）
- 常に上位5名を表示
- 診断をやり直すとマッチング結果も変化

#### 3.3.2 マッチングアルゴリズム
1. ユーザー診断結果から性格タイプを判定
2. データベースから異性ユーザーを取得
3. 動物占い相性ロジックで相性スコアを計算
4. スコア上位5名を抽出
5. 各マッチング根拠をAIが生成

#### 3.3.3 マッチング根拠の生成
テンプレート例:
```
あなたは優しくて責任感が強い人です。しかし、一人でいることが耐えられない一面もあります。

あなたに相応しい人は、相手を常に思いやり、パートナーが寂しがっていると即座に寄り添ってくれる人です。

【性格の相性】
・あなた: 感情豊かで、人との繋がりを大切にする
・相手: 共感力が高く、相手の気持ちに敏感

【価値観の一致度】
・ともに家族やパートナーを最優先にする傾向
・安定した関係を求める点で一致

【コミュニケーションスタイル】
・あなた: 素直に気持ちを伝えるタイプ
・相手: じっくり話を聞いてくれるタイプ
```

#### 3.3.4 結果表示形式
- スライド型カード（1位→5位）
- カード情報: ランキング、アバター、ニックネーム、年齢、相性スコア、マッチング根拠（要約版）

#### 3.3.5 詳細プロフィールページ
- アバター、ニックネーム、年齢、性別、自己紹介、仕事、年収（任意）、好きなこと、趣味、特技、身長、体重、X URL、Instagram URL、詳細なマッチング根拠を表示

### 3.4 プロフィール機能
#### 3.4.1 プロフィール項目
| 項目 | 必須/任意 | 備考 |
| --- | --- | --- |
| ニックネーム | 必須 | 20文字以内 |
| 性別 | 必須 | 男性/女性 |
| 生年月日 | 必須 | 18歳以上確認 |
| アバター画像 | 必須 | jpg/png、5MB以内 |
| 自己紹介 | 必須 | 50〜500文字 |
| 仕事 | 必須 | 50文字以内 |
| 好きなこと | 必須 | 100文字以内 |
| 趣味 | 必須 | 100文字以内 |
| 特技 | 必須 | 100文字以内 |
| 年収 | 任意 | 選択式 |
| 身長 | 任意 | cm単位 |
| 体重 | 任意 | kg単位 |
| X URL | 任意 | URL形式検証 |
| Instagram URL | 任意 | URL形式検証 |

#### 3.4.2 プロフィール編集
- いつでも編集可能
- 画像再アップロード可
- 変更はリアルタイム反映

#### 3.4.3 プロフィール公開設定
- 年収表示の切り替え
- アカウント削除機能

#### 3.4.4 マイページ
- 自分のプロフィール確認
- 診断結果確認
- マッチング結果再表示
- 設定画面アクセス

### 3.5 紹介リンク機能（男性専用）
#### 3.5.1 紹介リンクの種類
- 通常リンク: 女性が登録すると送り主が自動で1位に表示、残り4名は通常マッチング
- いたずら機能付きリンク: 設定でON/OFF。ONでリンク生成・表示、OFFでグレーアウト。女性には送り主不明。

#### 3.5.2 リンク生成条件（プロフィール充実度）
全必須項目（アバター、ニックネーム、自己紹介50文字以上、仕事、好きなこと、趣味、特技）を満たす必要あり。未達なら警告表示。

#### 3.5.3 URL形式
- `https://example.com/{ランダム文字列}`（8〜12文字英数字）
- 完全隠蔽型、紹介と判別不能な構造

#### 3.5.4 紹介リンク動作フロー
1. 男性がリンク生成
2. 女性に送信
3. 女性がリンク経由でアクセス
4. 女性が診断完了
5. 女性がLINEログイン＆プロフィール登録
6. マッチング結果で送り主が1位表示

#### 3.5.5 制限事項
- 紹介リンクは無制限に生成可だが同時有効は1つ（または複数可）
- 女性側には通常URLにしか見えない

### 3.6 モックデータ
#### 3.6.1 データ量
- 男性1,000名、女性1,000名、計2,000名

#### 3.6.2 データ内容
- 日本人名、18〜45歳、職業、趣味/特技、テンプレ自己紹介、プレースホルダー画像、性格タイプ割当、SNS空欄

#### 3.6.3 マッチング根拠
- タイプ組み合わせごとのテンプレート文章、またはClaude APIで動的生成

#### 3.6.4 データ生成方法
- Python/Nodeスクリプトで生成しSupabaseへCSVインポート、またはSeederで直接投入

### 3.7 設定機能
#### 3.7.1 設定画面項目
- プロフィール編集、診断やり直し、紹介リンク生成（男性のみ、いたずら機能ON/OFF、リンクコピー）
- プライバシー設定（年収表示切替）
- アカウント削除

#### 3.7.2 アカウント削除
- 確認ダイアログ
- 削除で全データ削除・復元不可

## 4. 画面設計
### 4.1 画面一覧
| 画面名 | URL | 説明 |
| --- | --- | --- |
| トップページ | / | サービス説明、診断開始ボタン |
| 診断タイプ選択 | /diagnosis/select | 10問版 or 30問版選択 |
| 診断画面 | /diagnosis/[type] | 質問回答 |
| マッチング結果 | /result | マッチ結果5名表示 |
| プロフィール詳細 | /profile/[id] | 他ユーザーのプロフィール |
| マイページ | /mypage | 自分のプロフィール確認 |
| プロフィール編集 | /mypage/edit | プロフィール編集 |
| 設定 | /settings | 各種設定 |
| 紹介リンク管理 | /settings/invite | 紹介リンク生成（男性のみ） |

### 4.2 画面フロー
トップ → 診断タイプ選択 → 診断画面（10/30問） → マッチング結果（5名） → プロフィール詳細 → 「もっと詳しく見る」 → LINEログイン → プロフィール入力 → マイページ。

### 4.3 デザイン方向性
#### 4.3.1 テイスト
- カジュアル・ポップ、親しみやすい、楽しく診断できる雰囲気

#### 4.3.2 カラーパレット案
- Primary: #FF6B9D
- Secondary: #4A90E2
- Accent: #FFC107
- Background: #F8F9FA
- Text: #333333

#### 4.3.3 フォント
- 日本語: Noto Sans JP
- 英数字: Inter or Poppins

#### 4.3.4 UI要素
- 丸みボタン、グラデーション、アイコン多用、アニメーション控えめ

## 5. データベース設計
### 5.1 テーブル構成
- `users`: LINEユーザー情報、プロフィール、任意項目、収益/身長/体重等、モックデータフラグ
- `diagnosis_results`: 診断結果（タイプ、回答JSON、完了時刻）
- `questions`: 質問マスタ（診断タイプ、番号、本文、選択肢JSON）
- `invite_links`: 紹介リンク（コード、いたずらフラグ、有効期限）
- `invite_registrations`: 紹介経由登録ログ
- `matching_cache`: マッチ結果キャッシュ（5名ID＋根拠JSON）

#### 5.1.1 users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  line_user_id VARCHAR(255) UNIQUE NOT NULL,
  gender VARCHAR(10) NOT NULL,
  nickname VARCHAR(20) NOT NULL,
  birth_date DATE NOT NULL,
  age INTEGER GENERATED ALWAYS AS (
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date))
  ) STORED,
  avatar_url TEXT,
  bio TEXT NOT NULL,
  job VARCHAR(50) NOT NULL,
  favorite_things TEXT NOT NULL,
  hobbies TEXT NOT NULL,
  special_skills TEXT NOT NULL,
  annual_income VARCHAR(50),
  height INTEGER,
  weight INTEGER,
  twitter_url TEXT,
  instagram_url TEXT,
  income_visible BOOLEAN DEFAULT true,
  is_mock_data BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 5.1.2 diagnosis_results
```sql
CREATE TABLE diagnosis_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  diagnosis_type VARCHAR(20) NOT NULL,
  animal_type VARCHAR(50) NOT NULL,
  answers JSONB NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 5.1.3 questions
```sql
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  diagnosis_type VARCHAR(20) NOT NULL,
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 5.1.4 invite_links
```sql
CREATE TABLE invite_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  link_code VARCHAR(20) UNIQUE NOT NULL,
  is_prank_mode BOOLEAN DEFAULT false,
  used_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);
```

#### 5.1.5 invite_registrations
```sql
CREATE TABLE invite_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invite_link_id UUID REFERENCES invite_links(id) ON DELETE CASCADE,
  invited_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  inviter_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 5.1.6 matching_cache
```sql
CREATE TABLE matching_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  diagnosis_result_id UUID REFERENCES diagnosis_results(id) ON DELETE CASCADE,
  matched_users JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5.2 インデックス
```sql
CREATE INDEX idx_users_gender ON users(gender);
CREATE INDEX idx_users_is_mock ON users(is_mock_data);
CREATE INDEX idx_diagnosis_user ON diagnosis_results(user_id);
CREATE INDEX idx_invite_links_code ON invite_links(link_code);
CREATE INDEX idx_invite_registrations_invited ON invite_registrations(invited_user_id);
```

## 6. API設計
### 6.1 認証API
- POST /api/auth/line（LINE OAuth認証）
- POST /api/auth/logout（ログアウト）
- GET /api/auth/session（セッション確認）

### 6.2 診断API
- GET /api/questions?type={light|full}
- POST /api/diagnosis/save（途中保存）
- POST /api/diagnosis/submit（診断結果送信）

### 6.3 マッチングAPI
- POST /api/matching（マッチング実行）
- GET /api/matching/result/{id}（結果取得）

### 6.4 プロフィールAPI
- GET /api/profile/{id}
- PUT /api/profile
- DELETE /api/profile

### 6.5 紹介リンクAPI
- POST /api/invite/generate
- GET /api/invite/{code}
- PUT /api/invite/toggle

## 7. 動物占いロジック
### 7.1 基礎
- 12動物（こじか〜ペガサス）× 5分類（月・地球・太陽・新月・満月）= 60タイプ

### 7.2 質問設計
- 社交性/内向性、決断力/慎重さ、感情/論理、計画性/柔軟性、リーダーシップ/協調性

### 7.3 相性判定
- タイプごとに相性マトリクスを定義し0〜100点でスコアリング、上位5名抽出

## 8. セキュリティ要件
- Supabase Auth JWT認証、RLS設定、CSRF対策
- パスワード不要（LINE OAuth）、個人情報暗号化、画像アップロードのファイルタイプ検証
- 利用規約・プライバシーポリシー明示、アカウント削除時の完全データ削除

## 9. パフォーマンス要件
- ページ読み込み3秒以内、診断結果生成5秒以内、マッチング10秒以内
- 初期同時接続100ユーザー、スケール可能な設計

## 10. 開発フェーズ
1. Phase1: MVP（セットアップ、Supabase設定、LINE統合、10問診断、基礎マッチング、モックデータ）
2. Phase2: 30問診断、プロフィール編集、AI根拠、紹介リンク/いたずら機能
3. Phase3: UI/UX改善（デザイン、アニメーション、レスポンシブ）
4. Phase4: 運用準備（テスト、バグ修正、パフォーマンス、デプロイ）

## 11. 今後の拡張
- メッセージ機能、お気に入り、ブロック、通知、マッチング履歴、有料プラン

## 12. 補足
- 動物占い参考資料（書籍・Webリサーチ）
- 法的確認: 利用規約、プライバシーポリシー、特商法、出会い系サイト規制法
