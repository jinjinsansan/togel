# Handoff 再実装案（改善版）

## 前回の失敗から学んだ改善点

### 問題1: クライアント側の `getSession()` が不安定
**解決策**: サーバー側でのみセッション取得を行う

### 問題2: 非同期タイミング問題
**解決策**: handoff完了を待ってからUIを表示

### 問題3: 実装が複雑すぎる
**解決策**: 暗号化を簡略化、TTLを長くする

---

## 改善案 A: サーバー側セッショントークン生成（推奨）

### フロー
```
1. LINE WebView検出
2. /api/auth/handoff/create を呼び出し（Cookie自動送信）
3. サーバー側：
   - cookies()からセッション取得（確実）
   - 32byte random token生成
   - {token: session.access_token + session.refresh_token} を暗号化
   - DBに保存（5分TTL）
4. クライアント：tokenをURLに付与して外部ブラウザへ
5. 外部ブラウザ：
   - /api/auth/handoff/restore を呼び出し
   - サーバー側：tokenを復号化 → setSession()
   - Cookie書き込み完了を確認
   - リダイレクト完了
6. UI表示
```

### 利点
- ✅ クライアント側の`getSession()`に依存しない
- ✅ サーバー側のcookies()は確実に動作する
- ✅ タイミング問題：サーバー側で完全に処理してからリダイレクト
- ✅ TTL 5分：ユーザーが「外部ブラウザで開く」ボタンを押すまで余裕

### コード例

#### `/api/auth/handoff/create/route.ts`
```typescript
import { cookies } from "next/headers";
import crypto from "crypto";

export async function POST() {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  
  // サーバー側で確実にセッション取得
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }

  const handoffToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(handoffToken);
  
  // セッション全体を暗号化（シンプル）
  const encrypted = encryptSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  
  await admin.from("auth_session_handoffs").insert({
    token_hash: tokenHash,
    user_id: session.user.id,
    encrypted_session: encrypted,
    expires_at: new Date(Date.now() + 5 * 60 * 1000), // 5分
  });
  
  return NextResponse.json({ handoffToken });
}
```

#### `/api/auth/handoff/restore/route.ts`
```typescript
export async function POST(request: Request) {
  const { token } = await request.json();
  const tokenHash = hashToken(token);
  
  const { data } = await admin
    .from("auth_session_handoffs")
    .select("encrypted_session, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  
  if (!data || new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ error: "Invalid or expired" }, { status: 410 });
  }
  
  const session = decryptSession(data.encrypted_session);
  
  // サーバー側でセッション復元
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const { error } = await supabase.auth.setSession(session);
  
  if (error) {
    return NextResponse.json({ error: "Failed to restore" }, { status: 500 });
  }
  
  // クリーンアップ
  await admin.from("auth_session_handoffs").delete().eq("token_hash", tokenHash);
  
  // 成功（cookieは自動的に書き込まれている）
  return NextResponse.json({ success: true });
}
```

---

## 改善案 B: localStorage を使った簡易版（より単純）

### フロー
```
1. LINE WebView検出
2. localStorage に一時的にセッション情報を保存
3. 外部ブラウザで開く
4. localStorage からセッション取得 → setSession()
5. localStorage クリア
```

### 利点
- ✅ 最もシンプル
- ✅ データベース不要
- ✅ サーバー側API不要

### 欠点
- ⚠️ LINE WebView → 外部ブラウザで localStorage が共有されない可能性
- ⚠️ セキュリティ：localStorage は暗号化されていない

---

## 改善案 C: Cookie ベースの簡易版

### フロー
```
1. LINE WebView検出
2. 一時的なcookie "handoff_pending=1" を設定
3. 外部ブラウザで開く
4. cookieがあれば通常通り認証済み
5. cookie "handoff_pending" をクリア
```

### 利点
- ✅ 既存のcookie認証を利用
- ✅ 追加実装ほぼ不要

### 欠点
- ⚠️ LINE WebView → 外部ブラウザで cookie が引き継がれる保証なし

---

## 推奨：改善案 A（サーバー側トークン生成）

**理由**:
1. ✅ 最も確実（サーバー側cookies()は安定）
2. ✅ セキュリティが高い（暗号化 + 短TTL）
3. ✅ タイミング問題を完全に解決
4. ✅ ユーザー体験が良い（シームレス）

**前回との違い**:
- ❌ クライアント側`getSession()` → ✅ サーバー側`cookies()`
- ❌ 60秒TTL → ✅ 5分TTL（余裕を持たせる）
- ❌ 複雑な暗号化 → ✅ シンプルな暗号化（1つのJSON）
- ❌ リダイレクト後すぐUI表示 → ✅ セッション復元完了を待つ

---

## テスト計画

1. **本番で OpenAI stream エラー修正をテスト**
2. **もし Load failed が残るなら**:
   - ログを詳しく分析
   - 認証関連か、OpenAI関連か特定
3. **認証関連なら handoff 実装**:
   - 改善案 A を実装
   - ローカルでテスト（モック）
   - 本番でテスト（実機）
4. **成功基準**:
   - LINE WebView → 外部ブラウザで認証状態維持
   - チャット送信が即座に成功
   - 「Load failed」が出ない

---

## 次のステップ

**今すぐ**: 本番テストを待つ ✅

**もし handoff が必要なら**:
1. 改善案 A を詳細設計
2. 実装
3. テスト
4. デプロイ

どうでしょうか？
