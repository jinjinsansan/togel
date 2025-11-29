"use client";

import Image from "next/image";
import { notFound } from "next/navigation";
import { SyntheticEvent } from "react";
import { MapPin, Briefcase, Heart, User, Twitter, Instagram, Facebook, MessageCircle } from "lucide-react";

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
    { label: "好きなこと", value: profile.favoriteThings, icon: <Heart className="h-4 w-4" /> },
    { label: "趣味", value: profile.hobbies, icon: <Briefcase className="h-4 w-4" /> },
    { label: "特技", value: profile.specialSkills },
    { label: "価値観", value: profile.values },
    { label: "コミュ力", value: profile.communication },
  ];

  // 仮のSNSリンク（実際にはDBから取得する）
  const socialLinks = [
    { icon: <Twitter className="h-5 w-5" />, href: "#", label: "X (Twitter)", color: "hover:text-black hover:bg-black/5" },
    { icon: <Instagram className="h-5 w-5" />, href: "#", label: "Instagram", color: "hover:text-pink-600 hover:bg-pink-50" },
    { icon: <MessageCircle className="h-5 w-5" />, href: "#", label: "LINE", color: "hover:text-green-500 hover:bg-green-50" },
    { icon: <Facebook className="h-5 w-5" />, href: "#", label: "Facebook", color: "hover:text-blue-600 hover:bg-blue-50" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 md:py-20">
      <div className="container px-4 md:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-[2.5rem] border-2 border-white bg-white/80 backdrop-blur-sm p-8 md:p-12 shadow-xl shadow-slate-200/50">
            
            {/* Header Profile Info */}
            <div className="flex flex-col items-center text-center mb-10">
              <div className="relative h-40 w-40 mb-6">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#E91E63] to-purple-600 opacity-20 blur-2xl animate-pulse"></div>
                <Image
                  src={profile.avatarUrl}
                  alt={profile.nickname}
                  fill
                  sizes="160px"
                  className="rounded-full border-4 border-white object-cover shadow-lg"
                  onError={(e: SyntheticEvent<HTMLImageElement>) => {
                    const target = e.currentTarget;
                    if (!target.src.includes("dicebear.com")) {
                      target.src = buildFallbackAvatar(profile.id, profile.gender);
                    }
                  }}
                />
                <div className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md text-lg">
                  {profile.gender === "male" ? "👨" : "👩"}
                </div>
              </div>
              
              <h1 className="font-heading text-3xl md:text-4xl font-black text-slate-900 mb-2">
                {profile.nickname} <span className="text-lg font-medium text-slate-400">({profile.age}歳)</span>
              </h1>
              
              <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-medium text-slate-500 mb-6">
                <span className="flex items-center gap-1 bg-slate-100 px-3 py-1 rounded-full">
                  <Briefcase className="h-3.5 w-3.5" /> {profile.job}
                </span>
                <span className="flex items-center gap-1 bg-slate-100 px-3 py-1 rounded-full">
                  <MapPin className="h-3.5 w-3.5" /> {profile.city}
                </span>
              </div>

              {/* SNS Links */}
              <div className="flex gap-4 mt-2">
                {socialLinks.map((link, index) => (
                  <a
                    key={index}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition-all hover:scale-110 hover:border-transparent hover:shadow-md ${link.color}`}
                    aria-label={link.label}
                  >
                    {link.icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Personality Type */}
            <div className="rounded-[2rem] bg-gradient-to-br from-slate-50 to-slate-100 p-8 border border-slate-200 mb-10 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#E91E63] to-purple-600"></div>
              <div className="relative z-10 text-center">
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E91E63] mb-3">DIAGNOSIS RESULT</p>
                <h2 className="font-heading text-4xl font-black text-slate-900 mb-2 tracking-tight">{togelLabel}</h2>
                <div className="inline-block px-4 py-1 rounded-full bg-white border border-slate-200 shadow-sm mb-6">
                  <p className="text-sm font-bold text-[#E91E63]">
                    {personalityType.catchphrase || "このタイプの特徴"}
                  </p>
                </div>
                
                <p className="text-base font-medium text-slate-600 mb-8 max-w-lg mx-auto leading-relaxed">
                  {personalityType.description}
                </p>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {(Object.keys(profileScores) as Array<keyof BigFiveScores>).map((trait) => (
                    <div key={trait} className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100 text-left">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-400">{traitLabels[trait]}</span>
                        <span className="text-sm font-black text-slate-900">{profileScores[trait].toFixed(1)}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[#E91E63]"
                          style={{ width: `${(profileScores[trait] / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Detailed Info */}
            <div className="space-y-8">
              {/* Bio Card */}
              <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm relative">
                <div className="absolute top-6 left-6 text-slate-200">
                  <User className="h-8 w-8" />
                </div>
                <div className="relative z-10 text-center">
                   <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400 mb-4">SELF INTRODUCTION</h3>
                   <p className="text-lg text-slate-700 leading-loose whitespace-pre-wrap font-medium">
                     {profile.bio || "自己紹介はまだありません。"}
                   </p>
                </div>
              </div>

              <h3 className="font-heading text-xl font-bold text-slate-900 border-b border-slate-100 pb-4 px-2">基本プロフィール</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {infoItems.map((item, index) => (
                  <div key={index} className="rounded-2xl border border-slate-100 bg-white p-5 transition-colors hover:border-slate-200">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
                      {item.icon} {item.label}
                    </p>
                    <p className="text-base font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {item.value || "未設定"}
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileDetailPage;
