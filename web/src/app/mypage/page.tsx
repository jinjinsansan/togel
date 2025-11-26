"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { DiagnosisSession, loadSession } from "@/lib/diagnosis/session";

const MyPage = () => {
  const [session, setSession] = useState<DiagnosisSession | null>(() => loadSession());

  useEffect(() => {
    const handleStorage = () => setSession(loadSession());
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <div className="container py-10">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-col gap-6 rounded-3xl border border-border bg-white/90 p-8 shadow-card">
          <div>
            <p className="text-sm font-semibold text-primary">プロフィール</p>
            <h1 className="mt-2 font-heading text-3xl">マイページ</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              LINEログイン実装まではサンプルデータを表示しています。プロフィールの編集や紹介リンクは今後のアップデートで利用可能になります。
            </p>
          </div>
          <div className="rounded-2xl border border-dashed border-border/60 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              現在ログインしていません。LINEログイン機能の提供までは診断データはブラウザに保存されます。
            </p>
            <Button variant="secondary" className="mt-4" asChild>
              <Link href="/diagnosis/select">診断をやり直す</Link>
            </Button>
          </div>
          <div className="rounded-2xl bg-muted/40 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              最新診断セッション
            </p>
            {session ? (
              <div className="mt-2 text-sm text-foreground">
                <p>タイプ: {session.diagnosisType === "light" ? "ライト版" : "しっかり版"}</p>
                <p>{session.answers.length} 問回答済み</p>
                <p>最終更新: {new Date(session.updatedAt).toLocaleString()}</p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">まだ診断データはありません。</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyPage;
