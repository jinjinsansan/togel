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
