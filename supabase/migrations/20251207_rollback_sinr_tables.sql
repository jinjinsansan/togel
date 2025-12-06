-- SINRテーブルを削除してロールバック
-- 
-- この操作により以下が削除されます：
-- - michelle_knowledge_children テーブル
-- - michelle_knowledge_parents テーブル
-- - match_michelle_knowledge_sinr 関数
--
-- 既存のmichelle_knowledgeテーブルは影響を受けません

BEGIN;

-- データ削除前に件数を記録
DO $$
DECLARE
  parent_count INTEGER;
  child_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO parent_count FROM michelle_knowledge_parents;
  SELECT COUNT(*) INTO child_count FROM michelle_knowledge_children;
  
  RAISE NOTICE 'Deleting % parent chunks', parent_count;
  RAISE NOTICE 'Deleting % child chunks', child_count;
END $$;

-- 検索関数を削除
DROP FUNCTION IF EXISTS match_michelle_knowledge_sinr(vector, int, double precision);

-- 子テーブルを削除（親との外部キー制約があるため先に削除）
DROP TABLE IF EXISTS michelle_knowledge_children CASCADE;

-- 親テーブルを削除
DROP TABLE IF EXISTS michelle_knowledge_parents CASCADE;

COMMIT;

-- 元のテーブルが残っていることを確認
SELECT 
  'michelle_knowledge (original)' as status,
  COUNT(*) as record_count
FROM michelle_knowledge;
