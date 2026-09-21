/**
 * フッターを出さないページ（除外リスト）。**それ以外の本文ページには全部出す。**
 *
 * 以前はトップ（/）だけに出す許可リストだった。そのせいで、お問い合わせと
 * 特商法・プライバシー・利用規約へのリンクが、トップ以外の全ページで画面から消えていた
 * （ヘッダーからお問い合わせを外したときに、導線が0件のページが出て発覚）。
 *
 * 出さない理由は、ページの側にある:
 * - /diagnosis … 回答中。下に余計なものを置かない
 * - /liff … LINE の中で開く画面
 * - /admin … 管理画面
 * - /login … ログインの1画面
 * - /michelle/chat・/michelle/attraction/chat … 画面の高さいっぱいのチャット
 *   （calc(100vh - 4rem) 固定。下に何か出ると入力欄が押し出される）。
 *   講座の入口（/michelle・/michelle/attraction）には出す。購入が起きる側から
 *   特商法の表示へ辿れるように
 * - /dev … 開発用プレビュー（本番は404）
 */
export const FOOTER_EXCLUDED_PATHS = [
  "/diagnosis",
  "/liff",
  "/admin",
  "/login",
  "/michelle/chat",
  "/michelle/attraction/chat",
  "/dev",
];

/** そのページにフッターを出すか。前方一致は「/」の区切りでだけ（/login が /loginx に当たらない） */
export const showsFooter = (pathname: string) =>
  !FOOTER_EXCLUDED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
