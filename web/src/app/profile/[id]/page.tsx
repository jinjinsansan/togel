"use client";

import Image from "next/image";
import { notFound } from "next/navigation";
import { useEffect, useState, SyntheticEvent } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { MapPin, Briefcase, Heart, User, Twitter, Instagram, Facebook, MessageCircle, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { determinePersonalityType, estimateProfileScores, getTogelLabel } from "@/lib/personality";
import { BigFiveScores } from "@/types/diagnosis";

const buildFallbackAvatar = (seed: string, gender: "male" | "female" | "other"): string => {
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

// Database Profile Type
type DbProfile = {
  id: string;
  full_name: string;
  bio: string;
  gender: "male" | "female" | "other";
  age: number | null;
  job: string;
  city: string;
  avatar_url: string;
  is_public: boolean;
  details: any;
  social_links: any;
};

const ProfileDetailPage = ({ params }: { params: Params }) => {
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;
      setViewerId(currentUserId || null);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error || !data) {
        setError("Profile not found");
      } else {
        // Check visibility: Public OR Owner
        if (data.is_public || data.id === currentUserId) {
          setProfile(data);
        } else {
          setError("Private profile");
        }
      }
      setLoading(false);
    };

    fetchProfile();
  }, [params.id, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-[#E91E63]"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-lg max-w-md w-full">
          <Lock className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <h1 className="text-xl font-bold text-slate-800 mb-2">
            {error === "Private profile" ? "このプロフィールは非公開です" : "プロフィールが見つかりません"}
          </h1>
          <p className="text-sm text-slate-500 mb-6">
            URLが間違っているか、公開設定がオフになっている可能性があります。
          </p>
          <Button asChild>
            <a href="/">トップページへ戻る</a>
          </Button>
        </div>
      </div>
    );
  }

  // TODO: Estimate scores from real data (e.g. diagnosis history)
  // For now, generate pseudo-scores based on ID hash to be consistent
  const profileScores = estimateProfileScores({ ...profile } as any);
  const personalityType = determinePersonalityType(profileScores);
  const togelLabel = getTogelLabel(personalityType.id);

  const infoItems = [
    { label: "好きなこと", value: profile.details?.favoriteThings || "未設定", icon: <Heart className="h-4 w-4" /> },
    { label: "趣味", value: profile.details?.hobbies || "未設定", icon: <Briefcase className="h-4 w-4" /> },
    { label: "特技", value: profile.details?.specialSkills || "未設定" },
    { label: "価値観", value: profile.details?.values || "未設定" },
    { label: "コミュ力", value: profile.details?.communication || "未設定" },
  ];

  // SNS Links from DB
  const socialLinks = [
    { icon: <Twitter className="h-5 w-5" />, key: "twitter", label: "X (Twitter)", color: "hover:text-black hover:bg-black/5" },
    { icon: <Instagram className="h-5 w-5" />, key: "instagram", label: "Instagram", color: "hover:text-pink-600 hover:bg-pink-50" },
    { icon: <MessageCircle className="h-5 w-5" />, key: "line", label: "LINE", color: "hover:text-green-500 hover:bg-green-50" },
    { icon: <Facebook className="h-5 w-5" />, key: "facebook", label: "Facebook", color: "hover:text-blue-600 hover:bg-blue-50" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 md:py-20">
      <div className="container px-4 md:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-[2.5rem] border-2 border-white bg-white/80 backdrop-blur-sm p-8 md:p-12 shadow-xl shadow-slate-200/50 relative">
            
            {/* Edit Button for Owner */}
            {viewerId === profile.id && (
              <div className="absolute top-6 right-6 z-10">
                <Button variant="outline" size="sm" className="rounded-full bg-white/80 backdrop-blur" asChild>
                  <a href="/profile/edit">編集する</a>
                </Button>
              </div>
            )}

            {/* Header Profile Info */}
            <div className="flex flex-col items-center text-center mb-10">
              <div className="relative h-40 w-40 mb-6">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#E91E63] to-purple-600 opacity-20 blur-2xl animate-pulse"></div>
                <Image
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  fill
                  sizes="160px"
                  className="rounded-full border-4 border-white object-cover shadow-lg"
                  onError={(e: SyntheticEvent<HTMLImageElement>) => {
                    const target = e.currentTarget;
                    if (!target.src.includes("dicebear.com")) {
                      target.src = buildFallbackAvatar(profile.id, profile.gender || "other");
                    }
                  }}
                />
                <div className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md text-lg">
                  {profile.gender === "male" ? "👨" : profile.gender === "female" ? "👩" : "🧑"}
                </div>
              </div>
              
              <h1 className="font-heading text-3xl md:text-4xl font-black text-slate-900 mb-2">
                {profile.full_name} <span className="text-lg font-medium text-slate-400">({profile.age ? `${profile.age}歳` : "年齢非公開"})</span>
              </h1>
              
              <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-medium text-slate-500 mb-6">
                {profile.job && (
                  <span className="flex items-center gap-1 bg-slate-100 px-3 py-1 rounded-full">
                    <Briefcase className="h-3.5 w-3.5" /> {profile.job}
                  </span>
                )}
                {profile.city && (
                  <span className="flex items-center gap-1 bg-slate-100 px-3 py-1 rounded-full">
                    <MapPin className="h-3.5 w-3.5" /> {profile.city}
                  </span>
                )}
              </div>

              {/* SNS Links */}
              <div className="flex gap-4 mt-2">
                {socialLinks.map((link, index) => {
                  const url = profile.social_links?.[link.key];
                  if (!url) return null;
                  
                  return (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition-all hover:scale-110 hover:border-transparent hover:shadow-md ${link.color}`}
                      aria-label={link.label}
                    >
                      {link.icon}
                    </a>
                  );
                })}
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
                      {item.value}
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
