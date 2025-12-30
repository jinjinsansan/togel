"use client";

import Link from "next/link";

import { LoginButton } from "@/components/auth/login-button";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fdf2f8] via-white to-[#e8f0ff] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-4xl grid gap-10 lg:grid-cols-2 items-center">
        <div className="space-y-4 text-center lg:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">Welcome back</p>
          <h1 className="text-3xl lg:text-4xl font-black text-slate-900 leading-tight">
            サインインして<br />診断・マッチングをはじめましょう
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Googleでサインインすると、診断結果の保存や相性マッチングを継続して利用できます。<br />
            登録は無料・数秒で完了します。
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-center lg:justify-start pt-2">
            <LoginButton />
            <Button asChild variant="ghost" className="text-slate-600 hover:text-slate-900">
              <Link href="/">トップに戻る</Link>
            </Button>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 blur-3xl bg-gradient-to-br from-[#ff8ac0]/30 via-[#8ec5ff]/25 to-[#ffd1dc]/30" aria-hidden />
          <div className="relative rounded-3xl bg-white/80 backdrop-blur shadow-xl border border-white/60 p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#E91E63] to-[#C2185B] flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-[#E91E63]/30">
                T
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Togel</p>
                <p className="text-lg font-bold text-slate-900">24タイプ性格診断AI</p>
              </div>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              <p>・診断結果を保存して後から見返せます</p>
              <p>・マッチング結果を継続的にアップデート</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-xs text-slate-500 leading-relaxed">
              ログインできない場合は、ブラウザのシークレットモードや別ブラウザをお試しください。<br />
              それでも解決しない場合はトップページの「お問い合わせ」からご連絡ください。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
