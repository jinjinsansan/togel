import Link from "next/link";

import { EmailAuthForm } from "@/components/auth/email-auth-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-ink px-6 py-10 text-white">
      <div className="w-full max-w-sm">
        <div className="rounded-card border border-line bg-[#07090F] px-[18px] py-[22px] text-center">
          <EmailAuthForm />
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
