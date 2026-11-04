"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { currentNextPath, rememberNextPath } from "@/components/auth/remember-next";
import { authErrorMessage } from "@/lib/auth/messages";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password";

/**
 * メールアドレス＋パスワードの認証。ログイン・新規登録・再設定の3つを1枚で切り替える。
 *
 * 【Googleログインからの移行】
 * 以前の利用者は Google でしか入れなかった。同じメールアドレスで「パスワードを忘れた」から
 * 再設定すれば、同じアカウント（診断履歴ごと）にパスワードが付く。
 * 新規登録を試すと「登録済み」になるので、そこでも再設定へ案内する。
 */

type Mode = "login" | "signup" | "reset";

const inputClass =
  "min-h-[50px] w-full rounded-input border border-line bg-surface px-3.5 text-base text-white placeholder:text-txt-disabled focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/20 transition-colors";

const primaryButtonClass =
  "flex min-h-[52px] w-full items-center justify-center rounded-full bg-hazard px-6 text-[15px] font-black text-ink transition-colors hover:bg-white disabled:opacity-60";

const callbackUrl = (type?: "recovery") =>
  `${window.location.origin}/auth/callback${type ? `?type=${type}` : ""}`;

export const EmailAuthForm = () => {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);

  // コールバック側の失敗は ?error= で戻ってくる
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("error");
    if (code) setError(authErrorMessage(code));
    if (params.get("mode") === "login") setMode("login");
  }, []);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
    setUnconfirmed(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setUnconfirmed(false);
    setPending(true);

    const supabase = createSupabaseBrowserClient();
    const next = currentNextPath();
    const trimmedEmail = email.trim();

    try {
      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        if (signInError) {
          if (signInError.code === "email_not_confirmed") setUnconfirmed(true);
          setError(authErrorMessage(signInError.code ?? signInError.message));
          return;
        }
        router.replace(next);
        router.refresh();
        return;
      }

      if (mode === "signup") {
        if (password.length < PASSWORD_MIN_LENGTH) {
          setError(`パスワードは${PASSWORD_MIN_LENGTH}文字以上にしてください。`);
          return;
        }
        rememberNextPath(next);
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            emailRedirectTo: callbackUrl(),
            // 同意の記録。メルマガの宛先は、診断を終えた時点でこれを見て作る
            data: { newsletter_opt_in: newsletter, newsletter_opt_in_at: newsletter ? new Date().toISOString() : null },
          },
        });
        if (signUpError) {
          setError(authErrorMessage(signUpError.code ?? signUpError.message));
          return;
        }
        // 確認済みの既存アカウント（以前 Google で登録した人を含む）は、
        // identities が空で返ってくる。メールは送られていない
        if (data.user && (data.user.identities?.length ?? 0) === 0) {
          setError(authErrorMessage("user_already_exists"));
          return;
        }
        if (data.session) {
          // 確認メールを無効にしている設定なら、そのまま入れる
          router.replace(next);
          router.refresh();
          return;
        }
        setNotice(
          `${trimmedEmail} に確認メールを送りました。メールのリンクを開くと登録が完了します。届かないときは迷惑メールフォルダも見てください。`,
        );
        return;
      }

      // reset
      rememberNextPath(next);
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: callbackUrl("recovery"),
      });
      if (resetError) {
        setError(authErrorMessage(resetError.code ?? resetError.message));
        return;
      }
      // 登録の有無は答えない（メールアドレスの存在確認に使われないように）
      setNotice(
        `${trimmedEmail} が登録されていれば、パスワード再設定のメールが届きます。リンクを開いて新しいパスワードを決めてください。`,
      );
    } catch (unexpected) {
      console.error("[Auth] unexpected error", unexpected);
      setError(authErrorMessage("unexpected"));
    } finally {
      setPending(false);
    }
  };

  const resendConfirmation = async () => {
    setPending(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      rememberNextPath(currentNextPath());
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: { emailRedirectTo: callbackUrl() },
      });
      if (resendError) {
        setError(authErrorMessage(resendError.code ?? resendError.message));
        return;
      }
      setUnconfirmed(false);
      setNotice("確認メールをもう一度送りました。");
    } finally {
      setPending(false);
    }
  };

  const heading =
    mode === "signup" ? "無料で登録して診断する" : mode === "login" ? "ログイン" : "パスワードの再設定";

  return (
    <div>
      <div className="text-[15px] font-black leading-relaxed">{heading}</div>
      {mode === "signup" && (
        <p className="mt-1.5 text-xs leading-relaxed text-txt-subtle">
          診断結果はアカウントに保存され、あとから読み返せます。
        </p>
      )}

      {mode !== "reset" && (
        <div className="mt-4 grid grid-cols-2 gap-1 rounded-full border border-line p-1 text-sm font-bold">
          {(
            [
              ["signup", "新規登録"],
              ["login", "ログイン"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => switchMode(value)}
              aria-pressed={mode === value}
              className={`min-h-[40px] rounded-full transition-colors ${
                mode === value ? "bg-white text-ink" : "text-txt-subtle hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-left" noValidate={false}>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-txt-muted">メールアドレス</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
            placeholder="you@example.com"
          />
        </label>

        {mode !== "reset" && (
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-txt-muted">
              パスワード
              {mode === "signup" && (
                <span className="ml-1 font-normal text-txt-subtle">（{PASSWORD_MIN_LENGTH}文字以上）</span>
              )}
            </span>
            <input
              type="password"
              name="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              minLength={mode === "signup" ? PASSWORD_MIN_LENGTH : undefined}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClass}
            />
          </label>
        )}

        {mode === "signup" && (
          <label className="flex items-start gap-2.5 py-1 text-xs leading-relaxed text-txt-muted">
            <input
              type="checkbox"
              checked={newsletter}
              onChange={(event) => setNewsletter(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
            />
            <span>
              メルマガを受け取る（あなたのタイプの「地雷の踏み方・避け方」を週1通。いつでも解除できます）
            </span>
          </label>
        )}

        {error && (
          <p role="alert" className="rounded-input bg-dangerbg px-3 py-2.5 text-xs leading-relaxed text-white">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-input border border-line px-3 py-2.5 text-xs leading-relaxed text-white">
            {notice}
          </p>
        )}

        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending
            ? "送信中…"
            : mode === "signup"
              ? "登録する"
              : mode === "login"
                ? "ログイン"
                : "再設定メールを送る"}
        </button>
      </form>

      <div className="mt-4 space-y-2 text-xs">
        {unconfirmed && (
          <button
            type="button"
            onClick={resendConfirmation}
            disabled={pending}
            className="block w-full font-bold text-white underline"
          >
            確認メールをもう一度送る
          </button>
        )}
        {mode === "reset" ? (
          <button
            type="button"
            onClick={() => switchMode("login")}
            className="font-bold text-txt-subtle underline hover:text-white"
          >
            ログインに戻る
          </button>
        ) : (
          <button
            type="button"
            onClick={() => switchMode("reset")}
            className="font-bold text-txt-subtle underline hover:text-white"
          >
            パスワードを忘れた／以前Googleで登録した
          </button>
        )}
      </div>

      {mode === "signup" && (
        <div className="mt-3.5 text-[10px] leading-relaxed text-txt-subtle">
          登録すると
          <Link href="/terms" className="underline">
            利用規約
          </Link>
          ・
          <Link href="/privacy" className="underline">
            プライバシーポリシー
          </Link>
          に同意したものとみなします
        </div>
      )}
    </div>
  );
};
