"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { MatchingResult } from "@/types/diagnosis";

const ResultPage = () => {
  const [results] = useState<MatchingResult[]>(() => {
    if (typeof window === "undefined") return [];
    const raw = sessionStorage.getItem("latestMatching");
    if (!raw) return [];
    try {
      return JSON.parse(raw) as MatchingResult[];
    } catch (error) {
      console.error("Failed to parse matching results", error);
      return [];
    }
  });

  return (
    <div className="container py-10">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <p className="text-sm font-semibold text-primary">STEP 2</p>
          <h1 className="mt-2 font-heading text-4xl">マッチング結果</h1>
          <p className="mt-3 text-muted-foreground">
            あなたの回答データから相性の良い5名を抽出しました。カードをクリックすると詳細プロフィールを確認できます。
          </p>
        </div>

        <div className="mt-10 grid gap-6">
          {results.length === 0 && (
            <div className="rounded-3xl border border-dashed border-border px-6 py-12 text-center">
              <p className="text-muted-foreground">まだ診断結果がありません。まずは診断を実施しましょう。</p>
              <Button asChild className="mt-4">
                <Link href="/diagnosis/select">診断ページへ</Link>
              </Button>
            </div>
          )}

          {results.map((result) => (
            <div
              key={result.profile.id}
              className="flex flex-col rounded-3xl border border-border bg-white/90 p-6 shadow-card lg:flex-row"
            >
              <div className="flex flex-1 flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-primary">#{result.ranking}</span>
                  <div>
                    <p className="text-sm text-muted-foreground">マッチングスコア</p>
                    <p className="text-2xl font-semibold">{result.score}%</p>
                  </div>
                </div>
                <p className="text-lg font-semibold">{result.profile.nickname} さん ({result.profile.age}歳)</p>
                <p className="text-sm text-muted-foreground">{result.summary}</p>
                <div className="rounded-2xl bg-muted/60 p-4 text-sm">
                  <p className="font-semibold text-foreground">相性のポイント</p>
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    <li>・{result.compatibility.personality}</li>
                    <li>・{result.compatibility.valueAlignment}</li>
                    <li>・{result.compatibility.communication}</li>
                  </ul>
                </div>
                <Button asChild variant="secondary" className="w-fit">
                  <Link href={`/profile/${result.profile.id}`}>プロフィールを見る</Link>
                </Button>
              </div>
              <div className="mt-6 flex flex-col items-center gap-4 lg:mt-0 lg:w-64">
                <div className="relative h-32 w-32">
                  <Image
                    src={result.profile.avatarUrl}
                    alt={result.profile.nickname}
                    fill
                    sizes="128px"
                    className="rounded-full border border-border object-cover"
                  />
                </div>
                <div className="text-center text-sm text-muted-foreground">
                  <p>{result.profile.job}</p>
                  <p>{result.profile.city}</p>
                  <p>{result.profile.animalType}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResultPage;
