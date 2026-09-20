/**
 * ログイン後の行き先。
 *
 * 保護された画面をタップした人は、その画面に用があって来ている。
 * ログインを挟んだあとに別の場所へ落とすと、何をしに来たのか分からなくなる。
 * LINEから来た場合は外部ブラウザに切り替わる分、戻るのも難しい。
 *
 * 運び方は2段階。proxy → /login はクエリ、/login → OAuth → /auth/callback は
 * クッキー（理由は NEXT_COOKIE を参照）。どちらも外から値を渡せる経路なので、
 * 外部サイトへの踏み台にならないよう safeNextPath を必ず通す。
 */

/** 行き先の指定が無い・信用できないときの既定 */
export const DEFAULT_AFTER_LOGIN = "/diagnosis/select";

/** 行き先を運ぶクエリの名前（proxy → /login） */
export const NEXT_PARAM = "next";

/**
 * 行き先を OAuth の往復ごしに運ぶクッキー。
 *
 * `redirectTo` に積まないのは、Supabase が redirectTo を許可リストと
 * 突き合わせるため。許可リストにクエリ無しのURLだけが登録されていると
 * `?next=` を足した時点で一致せず、黙って SITE_URL に落ちる。
 * ダッシュボードの設定に依存しない形にしておく。
 *
 * Google への往復から戻るのはトップレベルのGET遷移なので SameSite=Lax で届く。
 */
export const NEXT_COOKIE = "togel_login_next";

/** 押してから戻るまでの間だけ持てばいい */
export const NEXT_COOKIE_MAX_AGE = 60 * 10;

/**
 * 受け取った行き先を、サイト内の相対パスに正規化する。
 * 外部URL・プロトコル相対（//evil.example）・バックスラッシュ混じりは既定に落とす。
 */
export const safeNextPath = (value: string | null | undefined): string => {
  if (!value) return DEFAULT_AFTER_LOGIN;
  // バックスラッシュはURLパーサによって / と解釈され、//evil.example と同じ罠になる
  if (!value.startsWith("/") || value.includes("\\")) return DEFAULT_AFTER_LOGIN;
  if (/[\u0000-\u001f\u007f]/.test(value)) return DEFAULT_AFTER_LOGIN;

  // 同一オリジンとして解釈できるかをパーサに判定させる（//host や https:// を弾く）
  const marker = "https://origin.invalid";
  let url: URL;
  try {
    url = new URL(value, marker);
  } catch {
    return DEFAULT_AFTER_LOGIN;
  }
  if (url.origin !== marker) return DEFAULT_AFTER_LOGIN;

  // ログイン画面自身を行き先にすると輪になる
  if (url.pathname === "/login") return DEFAULT_AFTER_LOGIN;

  return `${url.pathname}${url.search}${url.hash}`;
};

/** 行き先を積んだログイン画面のURLを作る */
export const loginUrlFor = (pathWithQuery: string, base: string | URL): URL => {
  const login = new URL("/login", base);
  login.searchParams.set(NEXT_PARAM, safeNextPath(pathWithQuery));
  return login;
};

/**
 * クッキーに預けた行き先を読む。
 *
 * 書くときに encodeURIComponent しているが、読む側が既に復号しているかは
 * 実装に依るので、どちらでも通るようにしておく（復号済みの値をもう一度
 * 復号しても、%を含まない限り変わらない）。
 */
export const readNextCookie = (raw: string | undefined | null): string => {
  if (!raw) return DEFAULT_AFTER_LOGIN;
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    /* 壊れた値はそのまま判定に回す（安全側に落ちる） */
  }
  return safeNextPath(value);
};
