/**
 * パスワードの最低文字数。画面の案内と検査で同じ値を使う。
 * Supabase 側（Authentication → Providers → Email → Minimum password length）も
 * **この値以上に**しておくこと。画面だけ厳しくしても、API を直接叩けば通ってしまう。
 */
export const PASSWORD_MIN_LENGTH = 8;
