# Droid作業メモ - TOGEL（性格診断マッチングサイト）

## 📍 プロジェクト基本情報

### プロジェクト名
**TOGEL** (旧名: Matching診断)

### 概要
Big Five性格診断に基づく24パターン分類のAIマッチングサイト。診断結果から相性の良い異性5名を抽出し、詳細な根拠とミスマッチランキングも提供。

### プロジェクトパス
```
/mnt/e/dev/Cusor/tugeru
```

### Git情報
- **リポジトリ**: `https://github.com/jinjinsansan/togel.git`
- **デフォルトブランチ**: `main`
- **最新コミット** (2025-11-27時点):
  - `b7aa7a8` - 画像なしプロフィールのフィルタリング
  - `87d85f8` - モックデータのスコア多様化
  - `d5d9517` - ミスマッチランキング機能追加
  - `c497ad1` - Big Fiveベース詳細診断システム

### デプロイ先
- **Vercel**: https://togel-sigma.vercel.app
- 自動デプロイ: main ブランチにpushすると自動デプロイ

---

## 🏗️ ディレクトリ構造

```
tugeru/
├── docs/                          # 設計ドキュメント
│   ├── requirements.md            # 要件定義書（超詳細）
│   └── implementation-plan.md     # 実装計画
│
├── supabase/                      # Supabase関連
│   ├── migrations/                # DBマイグレーション
│   │   └── 0001_init.sql         # 初期スキーマ（users, diagnosis_results, etc）
│   └── mock-data/                 # モックデータ生成スクリプト
│
└── web/                           # Next.jsアプリケーション（メイン）
    ├── src/
    │   ├── app/                   # Next.js App Router
    │   │   ├── page.tsx           # トップページ
    │   │   ├── diagnosis/
    │   │   │   ├── select/        # 診断タイプ選択
    │   │   │   │   └── gender/    # 性別選択
    │   │   │   └── [type]/        # 診断実施（light/full）
    │   │   ├── result/
    │   │   │   ├── page.tsx       # マッチング結果（明るいデザイン）
    │   │   │   ├── page-old.tsx   # 旧版バックアップ
    │   │   │   └── mismatch/
    │   │   │       └── page.tsx   # ミスマッチ結果（ダークデザイン）
    │   │   ├── profile/[id]/      # プロフィール詳細
    │   │   ├── mypage/            # マイページ
    │   │   ├── settings/          # 設定
    │   │   ├── types/             # TOGEL型一覧
    │   │   └── api/
    │   │       ├── diagnosis/
    │   │       │   └── submit/
    │   │       │       └── route.ts  # 診断結果生成API
    │   │       └── questions/[type]/
    │   │
    │   ├── components/            # UIコンポーネント
    │   │   ├── ui/               # shadcn/ui（Button, Progress等）
    │   │   ├── diagnosis/        # 診断関連
    │   │   └── layout/           # レイアウト
    │   │
    │   ├── lib/                   # ビジネスロジック
    │   │   ├── personality/       # 性格診断ロジック（重要！）
    │   │   │   ├── index.ts      # エクスポート
    │   │   │   ├── definitions.ts # 24パターン定義
    │   │   │   ├── utils.ts      # Big Five判定・スコア推定
    │   │   │   ├── narrative.ts  # 詳細診断文生成（多様なバリエーション）
    │   │   │   ├── matching-narrative.ts  # マッチング説明生成
    │   │   │   └── mismatch-narrative.ts  # ミスマッチ説明生成（超厳しい）
    │   │   │
    │   │   ├── matching/
    │   │   │   └── engine.ts     # マッチングエンジン（最重要！）
    │   │   │                     # - generateMatchingResults()
    │   │   │                     # - generateMismatchingResults()
    │   │   │                     # - generateDiagnosisResult()
    │   │   │
    │   │   ├── supabase/         # Supabaseクライアント
    │   │   └── diagnosis/        # 診断フロー管理
    │   │
    │   ├── store/                 # 状態管理（Zustand）
    │   │   └── diagnosis-store.ts
    │   │
    │   ├── types/                 # TypeScript型定義
    │   │   └── diagnosis.ts      # Big Five, PersonalityType, MatchingResult, MismatchResult
    │   │
    │   └── data/                  # 静的データ
    │       ├── mock-profiles.ts  # モックユーザープロフィール
    │       └── questions.ts      # 診断質問データ
    │
    ├── package.json
    ├── tsconfig.json
    └── tailwind.config.ts
```

---

## 🛠️ 技術スタック

### フロントエンド
- **Next.js 16.0.4** (App Router)
- **React 19.2.0**
- **TypeScript 5.x**
- **Tailwind CSS 3.4.18**
- **shadcn/ui** - UIコンポーネント

### バックエンド
- **Supabase** (PostgreSQL + Auth + Storage)
- **Next.js API Routes**

### 状態管理
- **Zustand 5.0.8**

### その他
- **Zod 4.1.13** - バリデーション
- **Faker.js** - モックデータ生成

---

## 🔑 重要な概念

### Big Five性格診断
5つの特性スコア（各1.0〜5.0）:
- **Openness (開放性)**: 新しいこと好き ↔ 慣れたこと好き
- **Conscientiousness (誠実性)**: 計画的 ↔ 柔軟
- **Extraversion (外向性)**: 社交的 ↔ 内向的
- **Agreeableness (協調性)**: 優しい ↔ 率直
- **Neuroticism (神経症傾向)**: 心配性 ↔ 冷静

### 24パターン分類（TOGEL型）
Big Fiveスコアの組み合わせで24種類に分類:
- TOGEL 01型: creative-leader（創造的リーダー）
- TOGEL 02型: social-innovator（社交的革新者）
- ...
- TOGEL 24型: methodical-thinker（方法的思考家）

### マッチングアルゴリズム
1. ユーザーのBig Fiveスコアを算出
2. 24パターンに分類
3. 異性のプロフィールと相性スコア計算（0-100%）
4. **上位5名** = マッチング結果
5. **下位5名** = ミスマッチ結果

---

## 📝 よく使うコマンド

### 開発サーバー起動
```bash
cd /mnt/e/dev/Cusor/tugeru/web
npm run dev
```

### ビルド
```bash
cd /mnt/e/dev/Cusor/tugeru/web
npm run build
```

### 型チェック
```bash
cd /mnt/e/dev/Cusor/tugeru/web
npm run typecheck
```

### Lint
```bash
cd /mnt/e/dev/Cusor/tugeru/web
npm run lint
```

### Git操作
```bash
cd /mnt/e/dev/Cusor/tugeru

# 状態確認
git status
git log --oneline -5

# コミット
git add -A
git commit -m "feat: ..." -m "Co-authored-by: factory-droid[bot] <138933559+factory-droid[bot]@users.noreply.github.com>"

# プッシュ
git push origin main
```

---

## 🎯 実装済み主要機能

### 1. **詳細な性格診断**
- **場所**: `lib/personality/narrative.ts`
- Big Fiveスコアベースで数千パターンの診断文生成
- スコアの強度（very-low 〜 very-high）で5段階判定
- ユーザーIDをシードに一貫性のあるバリエーション
- 内容:
  - 🎯 考え方のクセ
  - 💬 コミュニケーションスタイル
  - 💑 恋愛傾向
  - 💕 理想の相手
  - ⚠️ 要注意ポイント

### 2. **マッチング結果**
- **場所**: `app/result/page.tsx`, `lib/personality/matching-narrative.ts`
- 相性の良い5名をランキング表示
- 各人について:
  - 👤 この人ってこんな人（具体的な人物像）
  - 🤖 なぜマッチ？（4つの理由）
  - 💭 付き合ったらこんな感じ（良い点・注意点）
  - 💡 初デート提案・会話ネタ・NG行動
- 明るく楽しいデザイン（白・青・緑・ピンク）

### 3. **ミスマッチランキング**
- **場所**: `app/result/mismatch/page.tsx`, `lib/personality/mismatch-narrative.ts`
- 相性の悪い5名をワーストランキング表示
- 各人について:
  - 💀 ヤバい特徴
  - 🚨 なぜミスマッチ？（超厳しい理由）
  - 🔥 地獄のシナリオ
  - 🚫 絶対にやってはいけないこと
- ダークカジュアルデザイン（グレー・赤・黒）
- 表現例: 「この2人が付き合ったら1000人以上の人を振り回す可能性がある」

### 4. **モックデータの多様化**
- **場所**: `lib/personality/utils.ts` の `estimateProfileScores()`
- プロフィールIDをシードに疑似ランダムでBig Fiveスコア生成
- 0.5〜5.0の全範囲で分布（極端な性格も登場）
- 同じIDなら常に同じスコア（一貫性）
- 画像が無効なプロフィールは自動除外

### 5. **セッションストレージ管理**
- `latestDiagnosis`: 診断結果
- `latestMatching`: マッチング結果5名
- `latestMismatch`: ミスマッチ結果5名

---

## ⚠️ 重要な注意点

### 1. **モックデータの扱い**
- 現在は男女各150名ずつのモックデータ（`data/mock-profiles.ts`）
- 実際のユーザーが増えるまでの「繋ぎ」
- **必ず多様性を持たせる**（極端な性格も含む）
- 画像なしプロフィールは除外される

### 2. **Big Fiveスコアの算出**
- ユーザー: 診断回答から正確に算出
- モックユーザー: `estimateProfileScores()` で推定
  - IDベースのシード値で一貫性のあるランダム生成
  - プロフィール情報から微調整（±0.3程度）

### 3. **24パターン判定ロジック**
- **場所**: `lib/personality/utils.ts` の `determinePersonalityType()`
- Big Fiveスコアの高低（≥4.0, ≤2.0）の組み合わせで判定
- 複雑な条件分岐があるので変更時は注意

### 4. **相性計算**
- **場所**: `lib/matching/engine.ts` の `calculate24TypeCompatibility()`
- 特性の類似度 + 補完性 + 価値観 + コミュニケーション
- スコア範囲: 0〜100%
- ミスマッチ度 = 100 - マッチング度

### 5. **API構造**
- **診断結果生成**: `/api/diagnosis/submit`
  - POST: `{ diagnosisType, userGender, answers }`
  - 返却: `{ results, mismatchResults, diagnosis }`
- ゲストユーザー自動作成（`guest-male`, `guest-female`）

### 6. **デプロイ**
- Vercelに自動デプロイ（mainブランチpush時）
- 環境変数はVercelダッシュボードで設定済み
- ビルドコマンド: `npm run build`

---

## 🎨 デザイン方針

### マッチング結果ページ
- 明るく楽しい雰囲気
- カラー: 白、青、緑、ピンク、黄色
- 絵文字多用: 🎯💡💬✓
- 読みやすいセクション分け

### ミスマッチ結果ページ
- ダークカジュアル
- カラー: グレー（900〜700）、赤（900〜400）
- 絵文字多用: 💀⚠️🚨💥🔥🚫
- 警告・危険を強調

### 診断文のトーン
- **カジュアル・現代的**
- 教科書的な表現は避ける
- 若者が共感できる言葉遣い
- 具体的でリアルなシチュエーション

---

## 🔄 開発フロー

### 新機能追加時
1. 要件を確認（`docs/requirements.md`参照）
2. 関連ファイルを特定（上記ディレクトリ構造参照）
3. 型定義を先に追加（`types/diagnosis.ts`）
4. ロジック実装（`lib/`配下）
5. UI実装（`app/`配下）
6. 型チェック: `npm run typecheck`
7. Lint: `npm run lint`
8. Git commit & push

### コミットメッセージ規約
```
feat: 新機能追加
fix: バグ修正
refactor: リファクタリング
docs: ドキュメント更新
chore: その他の変更

必ず Co-authored-by を含める
```

---

## 📚 参考資料

### 社内ドキュメント
- **要件定義**: `docs/requirements.md`（超詳細！必読）
- **実装計画**: `docs/implementation-plan.md`

### 外部リソース
- Next.js App Router: https://nextjs.org/docs
- Supabase: https://supabase.com/docs
- shadcn/ui: https://ui.shadcn.com
- Tailwind CSS: https://tailwindcss.com

---

## 🚀 次回セッション開始時のチェックリスト

1. [ ] プロジェクトパスに移動: `cd /mnt/e/dev/Cusor/tugeru`
2. [ ] 最新状態を確認: `git status`, `git log --oneline -5`
3. [ ] ブランチ確認: `git branch`（mainにいることを確認）
4. [ ] 必要に応じてpull: `git pull origin main`
5. [ ] このメモを読み返す
6. [ ] ユーザーの指示を待つ

---

## 💡 よくある質問

### Q: モックデータを変更したい
**A**: `web/src/data/mock-profiles.ts` を編集。または `supabase/mock-data/` のスクリプトで生成。

### Q: 24パターンの定義を変更したい
**A**: `web/src/lib/personality/definitions.ts` を編集。

### Q: 診断質問を追加/変更したい
**A**: `web/src/data/questions.ts` または Supabase の `questions` テーブル。

### Q: マッチングアルゴリズムを調整したい
**A**: `web/src/lib/matching/engine.ts` の `calculate24TypeCompatibility()` を編集。

### Q: デザインを変更したい
**A**: `tailwind.config.ts` でカラー設定、各ページの `className` を編集。

### Q: ミスマッチの表現を変更したい
**A**: `web/src/lib/personality/mismatch-narrative.ts` を編集。

---

## ✅ 最終更新

- **日付**: 2025-11-27
- **最終コミット**: `b7aa7a8` - 画像なしプロフィールのフィルタリング
- **主な実装済み機能**:
  - ✅ Big Fiveベース詳細診断（数千パターン）
  - ✅ マッチング結果（詳細な説明付き）
  - ✅ ミスマッチランキング（超厳しい表現）
  - ✅ モックデータの多様化（極端な性格含む）
  - ✅ 画像なしプロフィールの自動除外

---

**このメモを参照すれば、次回のセッションでスムーズに作業を開始できます！** 🚀
