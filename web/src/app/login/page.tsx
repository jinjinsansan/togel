"use client";

import Link from "next/link";

import { LoginButton } from "@/components/auth/login-button";

export default function LoginPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-ink px-6 py-10 text-white">
      <div className="w-full max-w-sm">
        <div className="rounded-card border border-line bg-[#07090F] px-[18px] py-[22px] text-center">
          <div className="text-[15px] font-black leading-relaxed">
            結果を保存して
            <br />
            あとから読み返す
          </div>
          <div className="mt-4 [&>button]:min-h-[52px] [&>button]:w-full">
            <LoginButton />
          </div>
          <div className="mt-3.5 text-[10px] leading-relaxed text-txt-subtle">
            続行すると
            <Link href="/terms" className="underline">
              利用規約
            </Link>
            ・
            <Link href="/privacy" className="underline">
              プライバシーポリシー
            </Link>
            に同意したものとみなします
          </div>
        </div>
        <div className="mt-4 text-center">
          <Link
            href="/"
            className="text-xs font-bold text-txt-subtle transition-colors hover:text-white"
          >
            ← トップに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
