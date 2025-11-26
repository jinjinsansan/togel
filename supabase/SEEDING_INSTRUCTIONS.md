# データシード手順書

WSL環境でのNode.js実行が困難なため、Supabase SQL Editorを使って直接データを投入します。

## 手順

### 1. Supabaseダッシュボードにアクセス

https://supabase.com/dashboard にログインして、プロジェクトを開く

### 2. SQL Editorを開く

左サイドバーから **SQL Editor** をクリック

### 3. 質問データを投入

1. `New query` をクリック
2. `supabase/seed-questions.sql` の内容をコピー&ペースト
3. `Run` または `Ctrl+Enter` で実行
4. 成功メッセージ: `Success. No rows returned`
5. 確認: 左サイドバーの **Table Editor** → `questions` テーブルで40行確認

### 4. モックユーザーを投入

1. SQL Editorで `New query` をクリック
2. `supabase/seed-mock-users.sql` の内容をコピー&ペースト
3. `Run` で実行
4. 成功メッセージ: `Success. No rows returned`
5. 確認: **Table Editor** → `users` テーブルで20行確認

### 5. 動作確認

ローカル環境で開発サーバーを起動して診断フローをテスト：

```bash
cd web
pnpm dev
```

ブラウザで http://localhost:3000 にアクセスして以下を確認：
- トップページが表示される
- 「診断をはじめる」→ 「サクッと10問」を選択
- 質問が表示される（Supabaseから取得）
- 全問回答後、マッチング結果が表示される

## トラブルシューティング

### RLS Policy エラーが出る場合

SQL Editorで以下を実行してRLSを一時的に無効化（開発中のみ）：

```sql
ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

本番環境では必ずRLSを有効にしてください。

### データが反映されない場合

キャッシュをクリア：
```sql
-- 既存データを削除して再投入
DELETE FROM questions;
DELETE FROM users WHERE line_id LIKE 'mock-%';
```

その後、再度 `seed-questions.sql` と `seed-mock-users.sql` を実行。

## 本番環境への適用

Vercel環境でも同じデータが必要な場合：
1. Supabase Productionプロジェクトで同じSQL実行
2. または、Vercel環境変数が同じSupabaseを指していれば自動的に反映される

## モックユーザーの追加

`seed-mock-users.sql` には20名のみ含まれています。
200名に増やす場合は以下の形式で追加してください：

```sql
('mock-male-011', '名前', 'https://api.dicebear.com/7.x/avataaars/svg?seed=unique-seed', 'ステータスメッセージ', 'male', '1990-01-01', '職業', '400-600', '東京都', 'energetic_tiger', true),
```

animal_zodiac_typeの種類：
- energetic_tiger, calm_elephant, adventurous_lion, analytical_owl
- creative_dolphin, gentle_panda, playful_monkey, wise_fox
- brave_wolf, imaginative_peacock, gentle_cat, energetic_rabbit
- creative_butterfly, adventurous_bird, analytical_dolphin, nurturing_deer
- wise_owl, stylish_flamingo, calm_koala, compassionate_swan

など、自由に設定可能です。
