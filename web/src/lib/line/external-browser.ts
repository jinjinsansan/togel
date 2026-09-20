/**
 * LINEのアプリ内ブラウザから外に出るための処理。
 *
 * 外に出る必要があるのはログインだけ。Googleは埋め込みブラウザからのOAuthを
 * 拒否する（disallowed_useragent）ので、LINE内では認証が成立しない。
 * 読み物・診断・LIFFはLINE内のまま動くので、外に出す対象にしない。
 *
 * 仕組みはLINE公式の `openExternalBrowser=1`。このパラメータが付いたURLを
 * LINEが開くと、LINE側が自動で外部ブラウザに渡す。案内を読んでメニューを
 * 探してもらう必要がない。
 *
 * 注意: 外に出す仕組みはこれ1つにする。以前は全ページに出る案内モーダルが
 * 別にあり、LIFF（LINE内でしか動かない）まで塞いでいた。網が2つあると
 * 片方だけ更新される。
 */

/** LINEアプリ内ブラウザか。LIFFもここに含まれる（UAは同じ） */
export const isLineInAppBrowser = (userAgent: string | undefined | null): boolean =>
  /Line\//i.test(userAgent ?? "");

const EXTERNAL_BROWSER_PARAM = "openExternalBrowser";

/**
 * LINEに「外部ブラウザで開け」と伝えるパラメータを足す。
 *
 * 自分を開き直すとき（externalBrowserUrl）だけでなく、LINEのトークに貼る
 * リンクを作るときにも使う。後者は相手のブラウザで踏ませたいリンク
 * （招待リンクなど）で、LINE内で開かれると紹介の紐付けが残らない。
 */
export const withExternalBrowserParam = (url: URL): URL => {
  url.searchParams.set(EXTERNAL_BROWSER_PARAM, "1");
  return url;
};

/**
 * 外部ブラウザで開き直すためのURLを作る。
 * 開き直す必要が無ければ null を返す（LINE以外、または既に付いている場合）。
 *
 * 既に付いているときに返さないのは、LINEがパラメータを尊重しなかった場合に
 * 同じURLへ飛び続けるのを防ぐため。外部ブラウザで開けていればUAはLINEでは
 * なくなるので、そちらでは最初の条件で止まる。
 */
export const externalBrowserUrl = (href: string, userAgent: string | undefined | null): string | null => {
  if (!isLineInAppBrowser(userAgent)) return null;

  const url = new URL(href);
  if (url.searchParams.has(EXTERNAL_BROWSER_PARAM)) return null;

  return withExternalBrowserParam(url).toString();
};
