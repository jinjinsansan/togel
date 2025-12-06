-- ロールバック用バックアップテーブルを作成
-- このマイグレーションを実行すると、現在のデータがバックアップされます

BEGIN;

-- バックアップテーブルが既に存在する場合は削除
DROP TABLE IF EXISTS michelle_knowledge_backup;

-- 現在のデータを完全にコピー
CREATE TABLE michelle_knowledge_backup AS 
SELECT * FROM michelle_knowledge;

-- インデックスも再作成
CREATE INDEX michelle_knowledge_backup_embedding_idx
  ON michelle_knowledge_backup USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- バックアップ日時を記録
COMMENT ON TABLE michelle_knowledge_backup IS 
  'Backup created at ' || NOW()::text || ' before SINR implementation';

COMMIT;

-- 確認用
SELECT 
  'michelle_knowledge' as table_name,
  COUNT(*) as record_count
FROM michelle_knowledge
UNION ALL
SELECT 
  'michelle_knowledge_backup' as table_name,
  COUNT(*) as record_count
FROM michelle_knowledge_backup;
