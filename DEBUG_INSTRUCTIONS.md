# デバッグ手順

## ブラウザのコンソールログを確認する方法

### Chrome / Edge
1. ブラウザで https://www.to-gel.com/michelle/chat を開く
2. **F12キー**を押す（または右クリック → 「検証」）
3. 上部のタブで **「Console」** を選択
4. ページをリロード（F5キー）
5. コンソールに表示されるログを確認

### 期待されるログ
```
[Mount] Component mounted
[Sessions] Loading sessions...
[Session Restore] Effect triggered - isMounted: true, hasRestored: false, sessions.length: 0
[Session Restore] Skipped - no sessions loaded yet
[Session Restore] Effect triggered - isMounted: true, hasRestored: false, sessions.length: 3
[Session Restore] Stored ID: "xxx-xxx-xxx", Sessions count: 3
[Session Restore] Session exists: true
[Session Restore] Restoring session: "xxx-xxx-xxx"
[Load Messages] activeSessionId: "xxx-xxx-xxx"
[Load Messages] Loading messages for: "xxx-xxx-xxx"
```

### もしログが表示されない場合
- 「Errors」タブも確認
- 赤いエラーメッセージがあればスクリーンショット
- コンソールのフィルターが「All levels」になっているか確認

## 現在の状況から推測される問題

Vercelログを見ると：
- `/api/michelle/sessions` → 200 OK（sessions取得成功）
- `/api/michelle/sessions/xxx/messages` → 200 OK（messages取得成功）

APIは正常に動作しているので、問題は以下の可能性：
1. フロントエンドのレンダリング問題
2. Reactの状態管理の問題
3. ビルドキャッシュの問題

## 試してほしいこと

### 1. ハードリロード
- **Ctrl + Shift + R** (Windows)
- **Cmd + Shift + R** (Mac)

### 2. キャッシュクリア
1. F12でDevToolsを開く
2. 「Network」タブを選択
3. 「Disable cache」にチェック
4. ページをリロード

### 3. プライベートブラウジング
- Ctrl + Shift + N で新しいシークレットウィンドウを開く
- https://www.to-gel.com/michelle/chat にアクセス
- 動作を確認
