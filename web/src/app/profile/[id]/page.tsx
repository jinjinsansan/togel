"use client";

import Image from "next/image";
import { notFound } from "next/navigation";
import { SyntheticEvent } from "react";

import { Button } from "@/components/ui/button";
import { mockProfiles } from "@/data/mock-profiles";
import { determinePersonalityType, estimateProfileScores, getTogelLabel } from "@/lib/personality";
import { BigFiveScores } from "@/types/diagnosis";

const buildFallbackAvatar = (seed: string, gender: "male" | "female"): string => {
  const palette = gender === "male" ? "blue" : "pink";
  const encodedSeed = encodeURIComponent(seed);
  return `https://api.dicebear.com/8.x/adventurer/svg?seed=${encodedSeed}&backgroundColor=ffdfbf,bee3db&scale=90&accessoriesProbability=40&hairColor=4a312c,2f1b0f&skinColor=f2d3b1,eac9a1&shapeColor=${palette}`;
};

const traitLabels: Record<keyof BigFiveScores, string> = {
  openness: "アイデア感度",
  conscientiousness: "計画遂行力",
  extraversion: "交流エネルギー",
  agreeableness: "共感スタイル",
  neuroticism: "ストレス耐性",
};

type Params = {
  id: string;
};

const ProfileDetailPage = ({ params }: { params: Params }) => {
  const profile = mockProfiles.find((item) => item.id === params.id);
  if (!profile) {
    notFound();
  }

  const profileScores = estimateProfileScores(profile);
  const personalityType = determinePersonalityType(profileScores);
  const togelLabel = getTogelLabel(personalityType.id);

  const infoItems = [
    { label: "自己紹介", value: profile.bio },
    { label: "好きなこと", value: profile.favoriteThings },
    { label: "趣味", value: profile.hobbies },
    { label: "特技", value: profile.specialSkills },
    { label: "価値観", value: profile.values },
    { label: "コミュ力", value: profile.communication },
  ];

  return (
    <div className="container py-10">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-border bg-white/90 p-8 shadow-card">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="relative h-32 w-32">
              <Image
                src={profile.avatarUrl}
                alt={profile.nickname}
                fill
                sizes="128px"
                className="rounded-full border border-border object-cover"
                onError={(e: SyntheticEvent<HTMLImageElement>) => {
                  const target = e.currentTarget;
                  if (!target.src.includes("dicebear.com")) {
                    target.src = buildFallbackAvatar(profile.id, profile.gender);
                  }
                }}
              />
            </div>
            <div>
              <h1 className="mt-1 text-3xl font-heading">
                {profile.nickname} さん ({profile.age}歳)
              </h1>
              <p className="text-muted-foreground">{profile.job} / {profile.city}</p>
            </div>
            <Button variant="secondary" className="rounded-full px-6">
              マッチング希望を送る
            </Button>
          </div>
          <div className="mt-6 rounded-2xl bg-muted/40 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">推定タイプ</p>
            <h2 className="mt-2 font-heading text-2xl">{togelLabel}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{togelLabel}の特徴：{personalityType.description}</p>
            <div className="mt-4 grid gap-2 md:grid-cols-3">
              {(Object.keys(profileScores) as Array<keyof BigFiveScores>).map((trait) => (
                <div key={trait} className="rounded-xl bg-white/70 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>{traitLabels[trait]}</span>
                    <span className="font-semibold text-foreground">{profileScores[trait].toFixed(1)}</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(profileScores[trait] / 5) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8 space-y-4">
            {infoItems.map((item) => (
              <div key={item.label} className="rounded-2xl bg-muted/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-2 text-base text-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileDetailPage;
