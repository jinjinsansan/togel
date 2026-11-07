"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth/messages";
import { NEXT_COOKIE, readNextCookie } from "@/lib/auth/next-path";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password";

/**
 * 再設定メールのリンク → /auth/callback（type=recovery）→ ここ。
 * この時点でログイン済み（再設定用のセッション）なので、新しいパスワードを決めるだけ。
 *
 * 以前 Google で登録した人も、ここでパスワードを付ければ同じアカウントのまま入れる。
 */

const inputClass =
  "min-h-[50px] w-full rounded-input border border-line bg-surface px-3.5 text-base text-white placeholder:text-txt-disabled focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/20 transition-colors";

const readCookie = (name: string) =>
  document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.slice(name.length + 1);

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data }) => setHasSession(Boolean(data.user)));
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(`パスワードは${PASSWORD_MIN_LENGTH}文字以上にしてください。`);
      return;
    }
    if (password !== confirm) {
      setError("確認用のパスワードが一致しません。");
      return;
    }
    setPending(true);
    try {
      const { error: updateError } = await createSupabaseBrowserClient().auth.updateUser({ password });
      if (updateError) {
        setError(authErrorMessage(updateError.code ?? updateError.message));
        return;
      }
      const next = readNextCookie(readCookie(NEXT_COOKIE));
      document.cookie = `${NEXT_COOKIE}=; path=/; max-age=0`;
      router.replace(next);
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-ink px-6 py-10 text-white">
      <div className="w-full max-w-sm">
        <div className="rounded-card border border-line bg-[#07090F] px-[18px] py-[22px] text-center">
          <div className="text-[15px] font-black leading-relaxed">新しいパスワードを決める</div>

          {hasSession === false ? (
            <div className="mt-4 space-y-3 text-xs leading-relaxed text-txt-muted">
              <p>{authErrorMessage("session_missing")}</p>
              <p>
                再設定メールのリンクの有効期限が切れている可能性があります。もう一度
                <Link href="/login" className="font-bold text-white underline">
                  ログイン画面
                </Link>
                の「パスワードを忘れた」からメールを送ってください。
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-left">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-txt-muted">
                  新しいパスワード
                  <span className="ml-1 font-normal text-txt-subtle">（{PASSWORD_MIN_LENGTH}文字以上）</span>
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={PASSWORD_MIN_LENGTH}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-txt-muted">確認のためもう一度</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  className={inputClass}
                />
              </label>
              {error && (
                <p role="alert" className="rounded-input bg-dangerbg px-3 py-2.5 text-xs leading-relaxed text-white">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={pending || hasSession === null}
                className="flex min-h-[52px] w-full items-center justify-center rounded-full bg-hazard px-6 text-[15px] font-black text-ink transition-colors hover:bg-white disabled:opacity-60"
              >
                {pending ? "保存中…" : "このパスワードにする"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
