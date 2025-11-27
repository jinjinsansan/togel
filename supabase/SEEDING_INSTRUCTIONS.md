# データ管理について

このプロジェクトでは、開発中に必要なデータを**コードで管理**しています。

## コード管理されているデータ

### 1. 質問データ
**場所**: `web/src/data/questions.ts`

- Light版 10問 + Full版 30問
- 質問内容を変更したい場合はこのファイルを編集
- Git commit してデプロイすれば自動反映

### 2. モックユーザーデータ
**場所**: `web/src/data/mock-profiles.ts`

- 男性10名 + 女性10名の固定プロフィール
- マッチング表示のテスト用
- プロフィール内容を変更したい場合はこのファイルを編集

## Supabaseについて

**開発中はSupabaseへのデータ投入は不要です。**

- `questions` テーブル → 使用していません（コードから取得）
- `users` テーブル → 本番環境でLINEログイン後の実ユーザーが保存されます

## 動作確認

開発サーバーを起動して診断フローをテスト：

```bash
cd web
pnpm dev
```

ブラウザで http://localhost:3000 にアクセス：
- 「診断をはじめる」→ 「サクッと10問」を選択
- 質問が表示される（`questions.ts` から）
- 全問回答後、マッチング結果が表示される（`mock-profiles.ts` から）

## データの変更方法

### 質問を変更したい場合

`web/src/data/questions.ts` を編集：

```typescript
{
  id: "q1",
  diagnosisType: "light",
  number: 1,
  text: "質問文を変更",  // ここを編集
  scale: "likert",
  options: likertOptions,
  trait: "sociability",
}
```

### モックユーザーを変更したい場合

`web/src/data/mock-profiles.ts` を編集：

```typescript
{
  id: "mock-male-001",
  nickname: "名前を変更",  // ここを編集
  age: 30,
  bio: "プロフィールを変更",  // ここを編集
  // ...
}
```

### 変更を反映

```bash
git add .
git commit -m "update questions/profiles"
git push
```

Vercelが自動でデプロイして反映されます。

## 本番環境について

本番リリース後は：
- **質問データ**: コード管理のまま（変更はデプロイで反映）
- **ユーザーデータ**: LINEログインした実ユーザーがSupabaseに保存される
- **モックデータ**: 開発・テスト用として残る
