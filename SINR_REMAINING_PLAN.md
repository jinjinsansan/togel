# SINR実装 残りの計画書

## 現在の状態
- ✅ **フェーズ0完了：** バックアップ作成済み（472件確認）
- 📍 **現在地：** フェーズ1（ベースライン測定）から開始

---

## フェーズ1：ベースライン性能測定

**目的：** 改善前の性能を記録し、後で比較できるようにする

**所要時間：** 30分

**リスク：** なし（測定のみ）

### 実施内容

#### テストクエリ（5つ）

新しいチャットで以下の質問を1つずつ投げる：

```
1. 「恐怖を感じる時はどうすればいい？」
2. 「怒りの下にある感情は何ですか？」
3. 「アラジンのランプテストとは何ですか？」
4. 「五大ネガティブとは何ですか？」
5. 「ピールダウンの方法を教えてください」
```

#### 記録する項目

各クエリについて以下を記録：

| 項目 | 評価方法 |
|------|---------|
| **ヒット件数** | 何個のチャンクが検索されたか（開発者ツールで確認可能） |
| **関連性** | 返ってきた内容は質問に関連しているか（1-5点） |
| **文脈の一貫性** | 文章が途中で切れていないか（1-5点） |
| **回答の品質** | 全体として良い回答か（1-5点） |

#### 記録テンプレート

```
## ベースライン測定結果（2025/12/06）

### クエリ1：「恐怖を感じる時はどうすればいい？」
- ヒット件数: X件
- 関連性: X/5点
- 文脈一貫性: X/5点
- 回答品質: X/5点
- メモ: （気づいた点があれば）

### クエリ2：「怒りの下にある感情は何ですか？」
- ヒット件数: X件
- 関連性: X/5点
- 文脈一貫性: X/5点
- 回答品質: X/5点
- メモ:

（以下同様）

### 全体の平均スコア
- 関連性平均: X.X/5点
- 文脈一貫性平均: X.X/5点
- 回答品質平均: X.X/5点
```

### ✅ 完了条件
- [ ] 5つのクエリ全てをテスト済み
- [ ] 各クエリの評価を記録済み
- [ ] スクリーンショットを保存済み（オプション）

### 🔄 次のステップ
フェーズ2（SINRテーブル追加）に進む

---

## フェーズ2：SINRテーブル追加

**目的：** 親子チャンク構造のテーブルを追加（既存データは触らない）

**所要時間：** 5分

**リスク：** 低（新規テーブル追加のみ）

### 実施内容

#### ステップ1：マイグレーション実行

Supabase SQL Editorで以下を実行：

```sql
-- supabase/migrations/20251207_add_sinr_tables.sql の内容をコピペ
```

<details>
<summary>📋 実行するSQL全文を表示</summary>

```sql
-- SINR手法実装：親子テーブル構造の追加
-- 
-- この変更は既存のmichelle_knowledgeテーブルに影響を与えません
-- 新しいテーブルを追加するだけです

BEGIN;

-- 親チャンク（LLMに渡す用・大きいチャンク）
CREATE TABLE IF NOT EXISTS michelle_knowledge_parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  source text NOT NULL,           -- ファイル名（例: 01_gairon/tape_shinrigaku_toha.md）
  parent_index integer NOT NULL,  -- 同じソース内での順番
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- 子チャンク（検索用・小さいチャンク）
CREATE TABLE IF NOT EXISTS michelle_knowledge_children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES michelle_knowledge_parents(id) ON DELETE CASCADE,
  content text NOT NULL,
  embedding vector(1536),         -- 検索用ベクトル
  child_index integer NOT NULL,   -- 親の中での順番
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS michelle_knowledge_parents_source_idx 
  ON michelle_knowledge_parents(source);

CREATE INDEX IF NOT EXISTS michelle_knowledge_children_parent_idx 
  ON michelle_knowledge_children(parent_id);

CREATE INDEX IF NOT EXISTS michelle_knowledge_children_embedding_idx
  ON michelle_knowledge_children USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- RLS設定（既存と同じポリシー）
ALTER TABLE michelle_knowledge_parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE michelle_knowledge_children ENABLE ROW LEVEL SECURITY;

CREATE POLICY michelle_knowledge_parents_service_role
  ON michelle_knowledge_parents
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY michelle_knowledge_children_service_role
  ON michelle_knowledge_children
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- SINR検索関数：子で検索→親を返す
CREATE OR REPLACE FUNCTION match_michelle_knowledge_sinr(
  query_embedding vector(1536),
  match_count int DEFAULT 5,
  similarity_threshold double precision DEFAULT 0.65
)
RETURNS TABLE (
  parent_id uuid,
  parent_content text,
  parent_metadata jsonb,
  parent_source text,
  child_similarity double precision
)
LANGUAGE sql
STABLE
AS $$
  -- 子チャンクで検索して、親チャンクを返す
  -- 同じ親が複数の子でヒットした場合、最も類似度が高いものを採用
  SELECT DISTINCT ON (p.id)
    p.id as parent_id,
    p.content as parent_content,
    p.metadata as parent_metadata,
    p.source as parent_source,
    1 - (c.embedding <=> query_embedding) as child_similarity
  FROM michelle_knowledge_children c
  JOIN michelle_knowledge_parents p ON c.parent_id = p.id
  WHERE c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY p.id, c.embedding <=> query_embedding
  LIMIT match_count;
$$;

COMMIT;

-- 確認用クエリ
SELECT 
  'michelle_knowledge_parents' as table_name,
  COUNT(*) as record_count
FROM michelle_knowledge_parents
UNION ALL
SELECT 
  'michelle_knowledge_children' as table_name,
  COUNT(*) as record_count
FROM michelle_knowledge_children
UNION ALL
SELECT 
  'michelle_knowledge (original)' as table_name,
  COUNT(*) as record_count
FROM michelle_knowledge;
```

</details>

#### ステップ2：結果確認

実行後、以下のような結果が表示されるはず：

```json
[
  {
    "table_name": "michelle_knowledge_parents",
    "record_count": 0
  },
  {
    "table_name": "michelle_knowledge_children",
    "record_count": 0
  },
  {
    "table_name": "michelle_knowledge (original)",
    "record_count": 472
  }
]
```

**確認ポイント：**
- 新テーブルは`0件`（まだデータを入れていないため）
- 既存テーブルは`472件`のまま（無傷）

#### ステップ3：関数確認

```sql
SELECT proname 
FROM pg_proc 
WHERE proname = 'match_michelle_knowledge_sinr';
```

関数が存在することを確認。

### ✅ 完了条件
- [ ] マイグレーション実行成功
- [ ] 新テーブル2つ作成確認（0件）
- [ ] 既存テーブル無傷確認（472件）
- [ ] 検索関数作成確認

### 🔄 ロールバック方法（問題があった場合）

```sql
-- supabase/migrations/20251207_rollback_sinr_tables.sql を実行
```

### 🔄 次のステップ
フェーズ3（チャンキングスクリプト開発）に進む

---

## フェーズ3：チャンキングスクリプト開発

**目的：** 親子チャンクを生成するスクリプトを作成

**所要時間：** 2-3時間（コーディング）

**リスク：** 低（ローカル開発、本番データに影響なし）

### 実施内容

#### ファイル1：`web/scripts/michelle-knowledge/chunk-sinr.ts`

親子チャンク生成ロジック：

```typescript
export interface SINRChunkOptions {
  parentSize?: number;      // 親チャンクサイズ（デフォルト: 1500）
  childSize?: number;       // 子チャンクサイズ（デフォルト: 400）
  parentOverlap?: number;   // 親のオーバーラップ（デフォルト: 300）
  childOverlap?: number;    // 子のオーバーラップ（デフォルト: 80）
}

export interface ParentChunk {
  content: string;
  index: number;
  children: ChildChunk[];
}

export interface ChildChunk {
  content: string;
  index: number;
}

export function chunkTextSINR(
  text: string,
  options: SINRChunkOptions = {}
): ParentChunk[] {
  const {
    parentSize = 1500,
    childSize = 400,
    parentOverlap = 300,
    childOverlap = 80,
  } = options;

  // 1. 親チャンク生成
  const parents = chunkText(text, {
    chunkSize: parentSize,
    overlap: parentOverlap,
  });

  // 2. 各親から子チャンクを生成
  return parents.map((parent) => ({
    content: parent.content,
    index: parent.index,
    children: chunkText(parent.content, {
      chunkSize: childSize,
      overlap: childOverlap,
    }),
  }));
}
```

#### ファイル2：`web/scripts/michelle-knowledge/process-knowledge-sinr.ts`

データベースに保存するスクリプト：

```typescript
import { chunkTextSINR } from "./chunk-sinr";

async function processFileSINR(filePath: string) {
  const relativeSource = sanitizeUnicode(
    path.relative(KNOWLEDGE_DIR, filePath) || path.basename(filePath)
  );
  console.log(`\n📄 Processing ${relativeSource}`);

  const content = await fs.readFile(filePath, "utf-8");
  const parentChunks = chunkTextSINR(content, {
    parentSize: 1500,
    childSize: 400,
    parentOverlap: 300,
    childOverlap: 80,
  });

  if (parentChunks.length === 0) {
    console.log("  ⚠️  No content found, skipping.");
    return;
  }

  // 既存データ削除
  const { error: deleteParentsError } = await supabase
    .from("michelle_knowledge_parents")
    .delete()
    .eq("source", relativeSource);
  if (deleteParentsError) throw deleteParentsError;

  // 親チャンクを挿入
  for (const parentChunk of parentChunks) {
    const { data: parentData, error: parentError } = await supabase
      .from("michelle_knowledge_parents")
      .insert({
        content: sanitizeUnicode(parentChunk.content),
        source: relativeSource,
        parent_index: parentChunk.index,
        metadata: { file_path: relativeSource },
      })
      .select("id")
      .single();

    if (parentError) throw parentError;

    // 子チャンクを挿入
    const childrenWithEmbeddings = [];
    for (const child of parentChunk.children) {
      const embedding = await embedText(child.content);
      childrenWithEmbeddings.push({
        parent_id: parentData.id,
        content: sanitizeUnicode(child.content),
        embedding: embedding,
        child_index: child.index,
        metadata: {},
      });
    }

    const { error: childError } = await supabase
      .from("michelle_knowledge_children")
      .insert(childrenWithEmbeddings);

    if (childError) throw childError;

    console.log(
      `  ✅ Parent ${parentChunk.index}: ${parentChunk.children.length} children`
    );
  }
}
```

#### ステップ：実装とテスト

1. **ファイル作成**
   - `chunk-sinr.ts`を作成
   - `process-knowledge-sinr.ts`を作成

2. **ローカルテスト**
   ```bash
   # 1個のファイルだけで試す
   node web/scripts/michelle-knowledge/process-knowledge-sinr.ts
   ```

3. **結果確認**
   ```sql
   SELECT COUNT(*) FROM michelle_knowledge_parents;
   SELECT COUNT(*) FROM michelle_knowledge_children;
   ```

### ✅ 完了条件
- [ ] chunk-sinr.ts 作成完了
- [ ] process-knowledge-sinr.ts 作成完了
- [ ] ローカルで1ファイルのテスト成功
- [ ] 親子の関係が正しく保存されている

### 🔄 次のステップ
フェーズ4（小規模テスト）に進む

---

## フェーズ4：小規模テスト（10ファイル）

**目的：** 少数のファイルで動作確認

**所要時間：** 30分（実行） + 1週間（観察）

**リスク：** 低（10ファイルのみ、すぐに戻せる）

### 実施内容

#### ステップ1：10ファイルを選ぶ

代表的なファイルを選択：

```
1. counseling_nagare.md（最重要）
2. godai_negative.md（五大ネガティブ）
3. gum_tape.md（ガムテープ）
4. aladdin_lamp.md（アラジンのランプ）
5. peel_down.md（ピールダウン）
6. tape_shinrigaku_toha.md（テープ式心理学とは）
7. negative_hassei_3step.md（ネガティブ発生3ステップ）
8. naritai_watashi.md（なりたい私）
9. inner_child_gainen.md（インナーチャイルド）
10. godai_negative_hagashikata.md（五大ネガティブの剥がし方）
```

#### ステップ2：SINR形式でインポート

```bash
# 10ファイルだけ処理
node web/scripts/michelle-knowledge/process-knowledge-sinr.ts --files 10
```

#### ステップ3：RAGコードに切り替えロジック追加

`web/src/lib/michelle/rag.ts`に追加：

```typescript
// 環境変数で制御
const USE_SINR = process.env.NEXT_PUBLIC_USE_SINR === "true";

export async function retrieveKnowledgeMatches(
  text: string,
  options: RetrieveOptions = {}
): Promise<KnowledgeMatch[]> {
  if (USE_SINR) {
    return await retrieveKnowledgeMatchesSINR(text, options);
  } else {
    return await retrieveKnowledgeMatchesOld(text, options);
  }
}

// SINR検索関数
async function retrieveKnowledgeMatchesSINR(
  text: string,
  options: RetrieveOptions = {}
): Promise<KnowledgeMatch[]> {
  const embedding = await embedText(text);
  if (!embedding.length) {
    return [];
  }

  const supabase = createSupabaseAdminClient();
  const rpcArgs = {
    query_embedding: embedding,
    match_count: options.matchCount ?? 8,
    similarity_threshold: options.similarityThreshold ?? 0.65,
  };

  const { data, error } = await supabase.rpc(
    "match_michelle_knowledge_sinr",
    rpcArgs as never
  );

  if (error) {
    console.error("match_michelle_knowledge_sinr error", error);
    return [];
  }

  // 親チャンクをKnowledgeMatch形式に変換
  return (data ?? []).map((item: any) => ({
    id: item.parent_id,
    content: item.parent_content,
    metadata: item.parent_metadata,
    similarity: item.child_similarity,
  }));
}

// 旧検索関数（リネーム）
async function retrieveKnowledgeMatchesOld(
  text: string,
  options: RetrieveOptions = {}
): Promise<KnowledgeMatch[]> {
  // 既存のコードをそのまま
  // ...
}
```

#### ステップ4：A/Bテスト（1週間）

```bash
# .env.local
# SINR無効（旧システム）
NEXT_PUBLIC_USE_SINR=false

# または

# SINR有効（新システム）
NEXT_PUBLIC_USE_SINR=true
```

日替わりで切り替えて比較：
- 月・水・金：SINR有効
- 火・木・土：SINR無効
- 日：好きな方

#### ステップ5：ログ記録

両方の結果をログに記録：

```typescript
console.log("Search method:", USE_SINR ? "SINR" : "Old");
console.log("Matches found:", matches.length);
console.log("Query:", text);
```

### ✅ 完了条件
- [ ] 10ファイルがSINR形式でインポート済み
- [ ] 切り替えロジック実装済み
- [ ] 1週間のA/Bテスト完了
- [ ] 両方の結果をログで比較済み

### 📊 判断基準

**SINR採用の条件：**
- ヒット数が適切（多すぎず少なすぎず）
- 文脈の一貫性が向上している
- 回答の品質が維持または向上
- エラーが発生していない

**旧システムに戻す条件：**
- 検索精度が明らかに悪化
- エラーが頻発
- 回答の品質が低下

### 🔄 次のステップ
- 成功 → フェーズ5（全ファイル移行）
- 失敗 → ロールバック、再検討

---

## フェーズ5：全ファイル移行

**目的：** 全85ファイルをSINR形式に変換

**所要時間：** 1時間（実行） + 2週間（観察）

**リスク：** 中（全データ変換、ただしロールバック可能）

### 実施内容

#### ステップ1：全ファイル変換

```bash
# 全ファイル処理
node web/scripts/michelle-knowledge/process-knowledge-sinr.ts --all
```

#### ステップ2：データ確認

```sql
-- 親チャンク数
SELECT COUNT(*) FROM michelle_knowledge_parents;

-- 子チャンク数
SELECT COUNT(*) FROM michelle_knowledge_children;

-- 親あたりの子の平均数
SELECT AVG(child_count) as avg_children_per_parent
FROM (
  SELECT parent_id, COUNT(*) as child_count
  FROM michelle_knowledge_children
  GROUP BY parent_id
) subquery;
```

#### ステップ3：フェーズ1のテストを再実行

ベースラインと同じ5つのクエリを実行：

```
1. 「恐怖を感じる時はどうすればいい？」
2. 「怒りの下にある感情は何ですか？」
3. 「アラジンのランプテストとは何ですか？」
4. 「五大ネガティブとは何ですか？」
5. 「ピールダウンの方法を教えてください」
```

#### ステップ4：比較分析

| 項目 | ベースライン | SINR | 変化 |
|------|------------|------|------|
| 関連性平均 | X.X/5 | X.X/5 | +X.X |
| 文脈一貫性平均 | X.X/5 | X.X/5 | +X.X |
| 回答品質平均 | X.X/5 | X.X/5 | +X.X |

#### ステップ5：2週間の本番運用

```bash
# .env.local
NEXT_PUBLIC_USE_SINR=true
```

毎日の確認項目：
- [ ] エラーログを確認
- [ ] ユーザーからの問い合わせを確認
- [ ] 回答の品質を抜き打ちチェック

### ✅ 完了条件
- [ ] 全85ファイル変換完了
- [ ] テストクエリでベースライン以上の性能
- [ ] 2週間エラーなし
- [ ] ユーザーフィードバック良好

### 📊 成功の指標

**定量的：**
- 検索精度：+15%以上（論文では+15-25%）
- 文脈一貫性：+30%以上（論文では+30%）
- レスポンス時間：維持または改善

**定性的：**
- 回答が途中で切れない
- 関連情報がより多く含まれる
- ユーザーの満足度が維持または向上

### 🔄 次のステップ
フェーズ6（旧システム削除）

---

## フェーズ6：旧システム削除

**目的：** 旧データとコードをクリーンアップ

**所要時間：** 30分

**リスク：** 低（ただし実行前に最終確認必須）

### 実施前の確認

**絶対条件：**
- ✅ フェーズ5で2週間以上問題なく動作
- ✅ ユーザーフィードバックが良好
- ✅ パフォーマンス指標が改善
- ✅ ロールバックの必要性がゼロ

### 実施内容

#### ステップ1：最終バックアップ

念のため、旧テーブルをもう一度バックアップ：

```sql
CREATE TABLE michelle_knowledge_final_backup AS 
SELECT * FROM michelle_knowledge;
```

#### ステップ2：旧テーブル削除

```sql
DROP TABLE IF EXISTS michelle_knowledge CASCADE;
DROP TABLE IF EXISTS michelle_knowledge_backup CASCADE;
```

#### ステップ3：旧スクリプト削除

```bash
# ファイル削除
rm web/scripts/michelle-knowledge/chunk.ts
rm web/scripts/michelle-knowledge/process-knowledge.ts
```

#### ステップ4：コードクリーンアップ

`web/src/lib/michelle/rag.ts`から旧コード削除：

```typescript
// retrieveKnowledgeMatchesOld() を削除
// USE_SINR の分岐を削除
```

#### ステップ5：環境変数クリーンアップ

```bash
# .env.local から削除
# NEXT_PUBLIC_USE_SINR=true
```

### ✅ 完了条件
- [ ] 旧テーブル削除完了
- [ ] 旧スクリプト削除完了
- [ ] 旧コード削除完了
- [ ] 環境変数クリーンアップ完了
- [ ] 本番で問題なく動作確認

---

## 全体スケジュール

| フェーズ | 期間 | 累積期間 | 状態 |
|---------|------|---------|------|
| 0. バックアップ | 10分 | 10分 | ✅ 完了 |
| 1. ベースライン測定 | 30分 | 40分 | ⏳ 次 |
| 2. テーブル追加 | 5分 | 45分 | 🔲 待機 |
| 3. スクリプト開発 | 2-3日 | 3日 | 🔲 待機 |
| 4. 小規模テスト | 1週間 | 10日 | 🔲 待機 |
| 5. 全体移行 | 2週間 | 24日 | 🔲 待機 |
| 6. 旧システム削除 | 30分 | 24.5日 | 🔲 待機 |

**合計：約1ヶ月**

---

## 緊急時の対応

### レベル1：機能オフ（即座、リスクなし）

```bash
# .env.local
NEXT_PUBLIC_USE_SINR=false
```

```bash
git add -A
git commit -m "emergency: disable SINR"
git push origin main
```

### レベル2：SINR削除（5分、低リスク）

```sql
-- 20251207_rollback_sinr_tables.sql を実行
DROP FUNCTION IF EXISTS match_michelle_knowledge_sinr;
DROP TABLE IF EXISTS michelle_knowledge_children CASCADE;
DROP TABLE IF EXISTS michelle_knowledge_parents CASCADE;
```

### レベル3：データ復元（10分、最終手段）

```sql
-- 20251206_rollback_from_backup.sql を実行
TRUNCATE TABLE michelle_knowledge;
INSERT INTO michelle_knowledge SELECT * FROM michelle_knowledge_backup;
```

---

## 成功の定義

### 必須条件
- [x] バックアップ作成済み（フェーズ0）
- [ ] ベースライン測定完了（フェーズ1）
- [ ] SINR実装完了（フェーズ2-5）
- [ ] 検索精度が向上（+15%以上）
- [ ] 文脈一貫性が向上（+30%以上）
- [ ] エラー率が増加していない
- [ ] ユーザー満足度が維持または向上

### オプション目標
- [ ] レスポンス時間が改善（-20-30%）
- [ ] インデックスサイズが削減（-40-60%）
- [ ] コスト削減（ベクトルストレージ料金）

---

## 次のアクション

**今すぐ：**
- [ ] フェーズ1（ベースライン測定）を実施

**その後：**
- [ ] Droidに「フェーズ1完了」と報告
- [ ] フェーズ2に進むかどうか判断

---

## 参考資料

- [元論文] https://arxiv.org/abs/2511.04939
- [Zenn記事] https://zenn.dev/knowledgesense/articles/746ceb4e4dd87e
- [バックアップSQL] `supabase/migrations/20251206_backup_michelle_knowledge.sql`
- [ロールバックSQL] `supabase/migrations/20251206_rollback_from_backup.sql`
- [SINR追加SQL] `supabase/migrations/20251207_add_sinr_tables.sql`
- [SINR削除SQL] `supabase/migrations/20251207_rollback_sinr_tables.sql`
