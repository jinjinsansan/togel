# モバイルLoad Failed問題 - ✅ 解決完了

## 🎯 根本原因（特定完了）
**Vercel Function タイムアウト（10秒デフォルト） + モバイルネットワークの遅延**

### なぜモバイルだけで起きたのか
| 環境 | ネットワーク | OpenAI応答 | 合計 | 結果 |
|------|------------|-----------|------|------|
| デスクトップ（Wi-Fi） | 高速 | 5-8秒 | < 10秒 | ✅ 成功 |
| モバイル（4G/5G） | 中速〜低速 | 7-12秒 | > 10秒 | ❌ タイムアウト |

プリセットボタンの長い詳細な指示 → OpenAI応答時間が長い → モバイルの遅いネットワークで10秒を超える

---

## ✅ 実装した解決策

### 1. Vercel Function タイムアウトを60秒に延長
**ファイル**: `web/vercel.json`

```json
{
  "installCommand": "npm install",
  "functions": {
    "src/app/api/michelle/chat/route.ts": {
      "maxDuration": 60
    },
    "src/app/api/michelle-attraction/chat/route.ts": {
      "maxDuration": 60
    }
  }
}
```

### 2. クライアント側タイムアウトハンドリング（60秒）
**ファイル**: 
- `web/src/app/michelle/chat/chat-client.tsx`
- `web/src/app/michelle/attraction/chat/chat-client.tsx`

```typescript
const TIMEOUT_MS = 60000; // 60秒
const startTime = Date.now();

try {
  while (true) {
    const timeoutPromise = new Promise<never>((_, reject) => {
      const elapsed = Date.now() - startTime;
      const remaining = TIMEOUT_MS - elapsed;
      if (remaining <= 0) {
        reject(new Error("TIMEOUT"));
      } else {
        setTimeout(() => reject(new Error("TIMEOUT")), remaining);
      }
    });

    let readResult;
    try {
      readResult = await Promise.race([reader.read(), timeoutPromise]);
    } catch (err) {
      if (err instanceof Error && err.message === "TIMEOUT") {
        await reader.cancel();
        throw new Error(
          "応答に時間がかかりすぎています。ネットワークが不安定な可能性があります。もう一度お試しください。"
        );
      }
      throw err;
    }

    const { value, done } = readResult;
    if (done) break;
    
    // ... SSE処理
  }
} catch (streamError) {
  await reader.cancel();
  throw streamError;
}
```

### 3. エラーハンドリングの改善
- タイムアウト時にユーザーフレンドリーなメッセージ表示
- reader.cancel()で適切にストリームをクリーンアップ
- 既存の429エラー（OpenAI run競合）処理も維持

---

## 🔬 以前の調査メモ（参考）

## 🚨 最優先：Vercelログ確認（調査時）

### 手順
1. https://vercel.com/dashboard
2. プロジェクトを開く
3. **Logs** タブ
4. **Real-time** を選択
5. モバイルで操作しながらログを見る

### 探すべきエラー

#### パターンA: Function Timeout
```
Task timed out after 10.00 seconds
Function execution duration: 10000 ms
```
→ **原因**: モバイルネットワークが遅い → SSE接続タイムアウト

#### パターンB: OpenAI Timeout
```
OpenAI error: timeout
ReadTimeoutError
```
→ **原因**: OpenAI APIレスポンスが遅い

#### パターンC: Connection Closed
```
Connection closed
Client disconnected
```
→ **原因**: モバイルブラウザがSSE接続を切断

#### パターンD: Memory Error
```
JavaScript heap out of memory
```
→ **原因**: モバイルのメモリ不足

---

## 🔬 可能性の高い原因

### 仮説1: Vercel Function タイムアウト（最有力）

**問題**:
- Vercel Functionのデフォルトタイムアウト: **10秒**
- モバイルネットワーク: 遅い
- OpenAI応答: 長い（プリセットボタン）
- 合計時間: 10秒超える → タイムアウト

**検証方法**:
Vercelログで "Task timed out" を探す

**解決策**:
`vercel.json` でタイムアウトを延長
```json
{
  "functions": {
    "app/api/michelle/chat/route.ts": {
      "maxDuration": 60
    },
    "app/api/michelle-attraction/chat/route.ts": {
      "maxDuration": 60
    }
  }
}
```

---

### 仮説2: モバイルブラウザのSSE接続制限

**問題**:
- iOSのSafari/WebViewはSSE接続を積極的に切断する
- バックグラウンドになると即座に切断
- 長時間の接続を嫌う

**検証方法**:
- モバイルで操作中に画面を切り替えるとエラーが出るか？
- 長い応答でエラーが出るか？

**解決策**:
- SSE → WebSocket（複雑）
- または接続リトライ機構

---

### 仮説3: モバイルネットワークの不安定性

**問題**:
- 4G/5G接続が不安定
- パケットロス
- SSEチャンクが欠落

**検証方法**:
Wi-Fi接続で試して問題が減るか？

**解決策**:
- リトライ機構
- エラー時の再接続

---

## 🔍 詳細調査

### 調査1: モバイルでのエラーメッセージ

**質問**:
1. モバイルで "Load failed" が出た時、その前に何か表示されますか？
   - 「前の応答がまだ処理中です」
   - 「ストリームが正常に完了しませんでした」
   - 何も表示されずいきなり "Load failed"？

2. どのタイミングで起きますか？
   - AIが応答し始める前？
   - 応答の途中？
   - 応答の最後？

3. 毎回起きますか？それとも時々？
   - 毎回: タイムアウトの可能性高
   - 時々: ネットワーク不安定の可能性高

### 調査2: 応答時間

**質問**:
1. デスクトップでプリセットボタンを押してから応答完了まで何秒かかりますか？
   - 5秒以内？
   - 10秒以上？

2. モバイルで失敗する時、どのくらい待ってから "Load failed" が出ますか？
   - すぐ（1-2秒）？
   - しばらく待ってから（10秒以上）？

---

## 💡 暫定対策（すぐ実装できる）

### 対策A: タイムアウト延長（最優先）

`vercel.json` を作成/更新：
```json
{
  "functions": {
    "app/api/**/route.ts": {
      "maxDuration": 60
    }
  }
}
```

これでVercel Functionのタイムアウトが60秒になります。

### 対策B: クライアント側タイムアウトハンドリング

SSE読み取り時にタイムアウトを検出：
```typescript
const timeoutId = setTimeout(() => {
  reader.cancel();
  throw new Error("応答タイムアウト。ネットワークが不安定な可能性があります。");
}, 30000); // 30秒

// 応答完了時
clearTimeout(timeoutId);
```

### 対策C: リトライ機構

失敗時に自動リトライ：
```typescript
let retryCount = 0;
const maxRetries = 2;

while (retryCount <= maxRetries) {
  try {
    // SSEストリーム処理
    break; // 成功
  } catch (error) {
    retryCount++;
    if (retryCount > maxRetries) throw error;
    await new Promise(r => setTimeout(r, 1000)); // 1秒待機
  }
}
```

---

## 🎯 次のアクション

### 最優先
1. **Vercelログを確認**してください
2. 上記の「調査1」「調査2」の質問に答えてください

### それができない場合
以下を教えてください：
1. モバイルで "Load failed" が出る時の**正確なタイミング**
2. どんなメッセージが表示されるか
3. 毎回起きるか、時々か

これらの情報で原因を特定します。
