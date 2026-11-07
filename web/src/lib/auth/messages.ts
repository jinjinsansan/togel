/**
 * 認証エラーの日本語。Supabase のエラーコード（または英語のメッセージ）と、
 * /auth/callback が `?error=` で返すキーの両方を受ける。
 *
 * 知らないコードは汎用の文言に落とす。英語の原文は画面に出さない。
 */
const MESSAGES: Record<string, string> = {
  invalid_credentials: "メールアドレスかパスワードが違います。",
  "Invalid login credentials": "メールアドレスかパスワードが違います。",
  email_not_confirmed:
    "メールアドレスの確認がまだです。登録時に届いたメールのリンクを開いてください。",
  "Email not confirmed":
    "メールアドレスの確認がまだです。登録時に届いたメールのリンクを開いてください。",
  user_already_exists:
    "このメールアドレスは登録済みです。「ログイン」から入るか、パスワードが分からなければ「パスワードを忘れた」から再設定してください（以前Googleで登録した方も同じです）。",
  "User already registered":
    "このメールアドレスは登録済みです。「ログイン」から入るか、パスワードが分からなければ「パスワードを忘れた」から再設定してください（以前Googleで登録した方も同じです）。",
  weak_password: "パスワードが弱すぎます。もっと長く、推測されにくいものにしてください。",
  email_address_invalid: "メールアドレスの形式が正しくありません。",
  validation_failed: "メールアドレスかパスワードの形式が正しくありません。",
  over_email_send_rate_limit:
    "メールの送信が混み合っています。少し時間をおいてからもう一度お試しください。",
  over_request_rate_limit: "試行回数が多すぎます。少し時間をおいてからもう一度お試しください。",
  same_password: "今と同じパスワードです。別のパスワードにしてください。",
  signup_disabled: "現在、新規登録を受け付けていません。",
  // /auth/callback から
  link_invalid:
    "リンクの有効期限が切れたか、すでに使われています。もう一度メールを送ってください。",
  no_code: "リンクが正しくありません。メールのリンクをもう一度開いてください。",
  session_missing: "ログインの有効期限が切れました。もう一度ログインしてください。",
  unexpected: "エラーが発生しました。時間をおいてもう一度お試しください。",
};

export const authErrorMessage = (codeOrMessage: string | null | undefined): string =>
  (codeOrMessage && MESSAGES[codeOrMessage]) || MESSAGES.unexpected;
