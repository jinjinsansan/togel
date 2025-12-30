-- ===========================================
-- サイト健全性チェックSQL（全部まとめて実行）
-- 以下をSupabase SQL Editorにまるごとコピペして実行
-- ===========================================

-- 1. 基本テーブル件数確認
SELECT 
  'users' as table_name,
  COUNT(*) as record_count,
  'Basic' as category
FROM auth.users
UNION ALL
SELECT 
  'diagnosis_results' as table_name,
  COUNT(*) as record_count,
  'Basic' as category
FROM diagnosis_results
UNION ALL
SELECT 
  'michelle_sessions' as table_name,
  COUNT(*) as record_count,
  'Michelle' as category
FROM michelle_sessions
UNION ALL
SELECT 
  'michelle_messages' as table_name,
  COUNT(*) as record_count,
  'Michelle' as category
FROM michelle_messages
UNION ALL
SELECT 
  'michelle_knowledge (original)' as table_name,
  COUNT(*) as record_count,
  'RAG Original' as category
FROM michelle_knowledge
UNION ALL
SELECT 
  'michelle_knowledge_parents' as table_name,
  COUNT(*) as record_count,
  'RAG SINR' as category
FROM michelle_knowledge_parents
UNION ALL
SELECT 
  'michelle_knowledge_children' as table_name,
  COUNT(*) as record_count,
  'RAG SINR' as category
FROM michelle_knowledge_children
UNION ALL
SELECT 
  'michelle_attraction_sessions' as table_name,
  COUNT(*) as record_count,
  'Attraction' as category
FROM michelle_attraction_sessions
UNION ALL
SELECT 
  'michelle_attraction_progress' as table_name,
  COUNT(*) as record_count,
  'Attraction' as category
FROM michelle_attraction_progress

UNION ALL

-- 2. RPC関数存在確認
SELECT 
  'RPC: ' || proname as table_name,
  pronargs as record_count,
  'Functions' as category
FROM pg_proc 
WHERE proname IN (
  'match_michelle_knowledge',
  'match_michelle_knowledge_sinr'
)

UNION ALL

-- 3. 孤児レコード確認（外部キー整合性）
SELECT 
  'Orphan: michelle_messages without session' as table_name,
  COUNT(*) as record_count,
  'Integrity Check' as category
FROM michelle_messages m
LEFT JOIN michelle_sessions s ON m.session_id = s.id
WHERE s.id IS NULL

UNION ALL

SELECT 
  'Orphan: michelle_children without parent' as table_name,
  COUNT(*) as record_count,
  'Integrity Check' as category
FROM michelle_knowledge_children c
LEFT JOIN michelle_knowledge_parents p ON c.parent_id = p.id
WHERE p.id IS NULL

ORDER BY category, table_name;
