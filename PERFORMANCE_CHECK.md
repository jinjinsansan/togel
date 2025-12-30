# サイトパフォーマンスチェックリスト

## ブラウザで確認（Chrome推奨）

### 1. ページ読み込み速度
1. **F12 → Network タブ**
2. **Ctrl+R（ページリロード）**
3. 以下を確認：
   - **DOMContentLoaded**: < 2秒が理想
   - **Load**: < 3秒が理想
   - **Total requests**: 100件以下が理想

### 2. Lighthouse スコア
1. **F12 → Lighthouse タブ**
2. **Mode: Navigation (Default)**
3. **Categories: Performance, Accessibility, Best Practices, SEO**
4. **Analyze page load**
5. スコア確認：
   - Performance: 80+が目標
   - Accessibility: 90+が目標
   - Best Practices: 90+が目標
   - SEO: 90+が目標

### 3. Core Web Vitals
Lighthouseの結果で確認：
- **LCP (Largest Contentful Paint)**: < 2.5秒
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1

### 4. API応答時間
**F12 → Network タブ → XHR/Fetch**でAPIリクエストを確認：
- `/api/michelle/chat`: 応答開始 < 1秒
- `/api/diagnosis/submit`: 完了 < 2秒
- `/api/michelle/sessions`: 完了 < 500ms

### 5. メモリリーク確認
1. **F12 → Performance タブ**
2. **Record（●ボタン）**
3. サイト内を5分間操作
4. **Stop**
5. **Memory グラフ**が右肩上がりでないか確認

---

## 確認すべき症状

### 🔴 重大な問題
- [ ] ページが5秒以上読み込まれない
- [ ] APIが全く応答しない
- [ ] チャットが全く動作しない
- [ ] ログインできない

### 🟡 注意が必要
- [ ] ページ読み込みが3-5秒かかる
- [ ] スクロールがカクカクする
- [ ] 画像読み込みが遅い
- [ ] API応答が2-3秒かかる

### 🟢 軽微（許容範囲）
- [ ] 初回読み込みのみ遅い（2回目以降は速い）
- [ ] 一部の画像が遅い
- [ ] アニメーションが少しカクつく

---

## SINR実装の影響確認

### RAG検索速度
Michelle Chatで質問して、**応答開始までの時間**を確認：
- **期待値**: 1-2秒で応答開始
- **問題**: 3秒以上かかる場合はSINR検索が遅い可能性

### Vercel Logsで確認
```
[RAG] Embedding ready (1536 dims), starting search
[RAG] Mode: SINR
[RAG SINR] Attempting with threshold: 0.XX
[RAG SINR] RPC returned X matches at threshold 0.XX
```
- この一連のログが **500ms以内**が理想

---

## データベースパフォーマンス

Supabaseで以下のクエリを実行して、応答時間を確認：

```sql
-- SINR検索速度テスト（500ms以内が目標）
EXPLAIN ANALYZE
SELECT DISTINCT ON (p.id)
  p.id as parent_id,
  p.content as parent_content,
  1 - (c.embedding <=> '[0.01, 0.02, ...]'::vector) as similarity
FROM michelle_knowledge_children c
JOIN michelle_knowledge_parents p ON c.parent_id = p.id
WHERE c.embedding IS NOT NULL
  AND 1 - (c.embedding <=> '[0.01, 0.02, ...]'::vector) >= 0.45
ORDER BY p.id, c.embedding <=> '[0.01, 0.02, ...]'::vector
LIMIT 8;
```

**Planning Time + Execution Time < 500ms** が目標
