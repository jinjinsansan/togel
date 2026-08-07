"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, ReactNode, use } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { MapPin, Briefcase, Twitter, Instagram, Facebook, MessageCircle, Lock, User } from "lucide-react";

import { getTogelLabel, personalityTypes } from "@/lib/personality";
import type { ExtendedPersonalityTypeDefinition } from "@/lib/personality/definitions";
import { getTypeApproachGuide } from "@/lib/coaching/translations";
import { BigFiveScores } from "@/types/diagnosis";

const buildFallbackAvatar = (seed: string, gender: "male" | "female" | "other"): string => {
  const palette = gender === "male" ? "blue" : "pink";
  const encodedSeed = encodeURIComponent(seed);
  return `https://api.dicebear.com/8.x/adventurer/svg?seed=${encodedSeed}&backgroundColor=ffdfbf,bee3db&scale=90&accessoriesProbability=40&hairColor=4a312c,2f1b0f&skinColor=f2d3b1,eac9a1&shapeColor=${palette}`;
};

const traitLabels: Record<keyof BigFiveScores, string> = {
  openness: "開放性",
  conscientiousness: "誠実性",
  extraversion: "外向性",
  agreeableness: "協調性",
  neuroticism: "神経症傾向",
};

const TRAITS: (keyof BigFiveScores)[] = [
  "openness",
  "conscientiousness",
  "extraversion",
  "agreeableness",
  "neuroticism",
];

type Params = {
  id: string;
};

type ProfileDetails = {
  favoriteThings?: string;
  hobbies?: string;
  specialSkills?: string;
  values?: string;
  communication?: string;
};

type SocialLinks = Partial<Record<"twitter" | "instagram" | "facebook" | "line", string>>;

type SocialLinkMeta = {
  icon: ReactNode;
  key: keyof SocialLinks;
  label: string;
};

const SOCIAL_LINKS: SocialLinkMeta[] = [
  { icon: <Twitter className="h-4 w-4" />, key: "twitter", label: "X (Twitter)" },
  { icon: <Instagram className="h-4 w-4" />, key: "instagram", label: "Instagram" },
  { icon: <MessageCircle className="h-4 w-4" />, key: "line", label: "LINE" },
  { icon: <Facebook className="h-4 w-4" />, key: "facebook", label: "Facebook" },
];

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
  details: ProfileDetails | null;
  social_links: SocialLinks | null;
  diagnosis_type_id?: string;
};

type DiagnosisDetails = {
  bigFiveScores: BigFiveScores;
  detailedNarrative: {
    title: string;
    subtitle: string;
    thinkingStyle: string[];
    communicationStyle: string[];
    loveTendency: string[];
    idealPartner: string[];
    warnings: string[];
    strengths: string[];
  };
};

type ViewerDiagnosis = {
  bigFiveScores: BigFiveScores;
  personalityType: { id: string; typeName: string };
};

const findExtended = (typeId: string | undefined): ExtendedPersonalityTypeDefinition | null =>
  personalityTypes.find((t) => t.id === typeId) ?? null;

/** 相性/非相性の判定（毒はタイプ名にのみ付け、赤は使わない） */
const judgeCompatibility = (
  viewerTypeId: string | undefined,
  targetTypeId: string | undefined,
): "good" | "bad" | "neutral" | null => {
  const viewer = findExtended(viewerTypeId);
  const target = findExtended(targetTypeId);
  if (!viewer || !target) return null;
  if (viewer.badCompatibleTypes.includes(target.id) || target.badCompatibleTypes.includes(viewer.id)) {
    return "bad";
  }
  if (viewer.compatibleTypes.includes(target.id) || target.compatibleTypes.includes(viewer.id)) {
    return "good";
  }
  return "neutral";
};

const ProfileDetailPage = (props: { params: Promise<Params> }) => {
  const params = use(props.params);
  const searchParams = useSearchParams();
  const nicknameHint = searchParams.get("nickname") ?? "";
  const isMockProfile = params.id.startsWith("mock-");
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [loading, setLoading] = useState(!isMockProfile);
  const [accessState, setAccessState] = useState<"private" | "not_found" | null>(
    isMockProfile ? "private" : null,
  );
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [viewerDiagnosis, setViewerDiagnosis] = useState<ViewerDiagnosis | null>(null);
  const [diagnosisDetails, setDiagnosisDetails] = useState<DiagnosisDetails | null>(null);
  const [displayName, setDisplayName] = useState<string>(nicknameHint || "このユーザー");
  const [avatarOverride, setAvatarOverride] = useState<string | null>(null);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    // 自分の直近診断（比較表示用）
    try {
      const raw = sessionStorage.getItem("latestDiagnosis");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorageはクライアントでしか読めない
      if (raw) setViewerDiagnosis(JSON.parse(raw) as ViewerDiagnosis);
    } catch {
      /* ignore */
    }

    if (isMockProfile) {
      return;
    }

    const fetchProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;
      setViewerId(currentUserId || null);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", params.id)
        .maybeSingle();

      if (error) {
        console.error("Failed to load profile", error);
        setDisplayName((prev) => prev || nicknameHint || "このユーザー");
        setAccessState(error.code === "PGRST116" ? "private" : "not_found");
        setLoading(false);
        return;
      }

      if (!data) {
        setDisplayName((prev) => prev || nicknameHint || "このユーザー");
        setAccessState("private");
        setLoading(false);
        return;
      }

      const resolvedName = data.full_name?.trim() || nicknameHint || "このユーザー";
      setDisplayName(resolvedName);

      if (data.is_public || data.id === currentUserId) {
        setProfile(data as DbProfile);
        setAccessState(null);
      } else {
        setProfile(null);
        setAccessState("private");
      }

      setLoading(false);
    };

    const fetchDiagnosisDetails = async () => {
      try {
        const res = await fetch(`/api/profile/${params.id}/diagnosis`);
        if (!res.ok) {
          return;
        }
        const data = await res.json();
        setDiagnosisDetails(data);
      } catch (err) {
        console.error("Error fetching diagnosis details:", err);
      }
    };

    fetchProfile();
    fetchDiagnosisDetails();
  }, [isMockProfile, nicknameHint, params.id, supabase]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-ink">
        <div className="w-[200px] overflow-hidden rounded-full">
          <div className="animate-marquee h-[10px] w-[400%] bg-hazard-sm" />
        </div>
      </div>
    );
  }

  if (accessState === "private") {
    return <PrivateProfileNotice name={displayName} />;
  }

  if (accessState === "not_found" || !profile) {
    return <ProfileNotFoundNotice />;
  }

  const diagnosisTypeId = profile.diagnosis_type_id;
  const targetType = findExtended(diagnosisTypeId);
  const togelLabel = diagnosisTypeId ? getTogelLabel(diagnosisTypeId) : "未診断";
  const isOwner = viewerId === profile.id;
  const subjectName = isOwner ? "私" : profile.full_name;

  const fallbackAvatar = buildFallbackAvatar(profile.id, profile.gender || "other");
  const avatarSource = avatarOverride ?? profile.avatar_url ?? fallbackAvatar;

  const verdict = isOwner
    ? null
    : judgeCompatibility(viewerDiagnosis?.personalityType?.id, diagnosisTypeId);
  const guide = targetType ? getTypeApproachGuide(targetType.id) : null;

  const infoItems = [
    { label: "好きなこと", value: profile.details?.favoriteThings || "未設定" },
    { label: "趣味", value: profile.details?.hobbies || "未設定" },
    { label: "特技", value: profile.details?.specialSkills || "未設定" },
    { label: "価値観", value: profile.details?.values || "未設定" },
    { label: "コミュ力", value: profile.details?.communication || "未設定" },
  ];

  return (
    <div className="min-h-screen bg-ink px-5.5 py-8 text-white">
      <div className="mx-auto max-w-2xl">
        {/* 01 ヘッダー: 写真・ニックネーム・タイプバッジ */}
        <div className="relative rounded-hero border border-line bg-surface p-6">
          {isOwner && (
            <Link
              href="/profile/edit"
              className="absolute right-4 top-4 rounded-full border border-line px-4 py-2 text-[11px] font-bold text-txt-muted transition-colors hover:text-white"
            >
              編集する
            </Link>
          )}
          <div className="flex items-center gap-5">
            <div className="relative h-24 w-24 flex-none">
              <Image
                src={avatarSource}
                alt={profile.full_name}
                fill
                sizes="96px"
                className="rounded-full border-2 border-line object-cover"
                onError={() => {
                  if (avatarSource === fallbackAvatar) return;
                  setAvatarOverride(fallbackAvatar);
                }}
                priority={false}
              />
            </div>
            <div className="min-w-0">
              <h1 className="break-words text-2xl font-black">
                {profile.full_name}
                <span className="ml-2 text-sm font-bold text-txt-subtle">
                  {profile.age ? `${profile.age}歳` : "年齢非公開"}
                </span>
              </h1>
              {targetType ? (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-black text-[#ff8fb4]">
                  {targetType.emoji} {targetType.typeName}
                  <span className="text-txt-subtle">/ {togelLabel}</span>
                </div>
              ) : (
                <div className="mt-2 inline-flex rounded-full border border-line px-3 py-1 text-[11px] font-bold text-txt-subtle">
                  未診断
                </div>
              )}
              <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px] font-bold text-txt-muted">
                {profile.job && (
                  <span className="flex items-center gap-1 rounded-chip bg-surface-alt px-2.5 py-1">
                    <Briefcase className="h-3 w-3" /> {profile.job}
                  </span>
                )}
                {profile.city && (
                  <span className="flex items-center gap-1 rounded-chip bg-surface-alt px-2.5 py-1">
                    <MapPin className="h-3 w-3" /> {profile.city}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* SNS */}
          <div className="mt-4 flex gap-2">
            {SOCIAL_LINKS.map((link) => {
              const url = profile.social_links?.[link.key];
              if (!url) return null;
              return (
                <a
                  key={link.key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={link.label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-txt-muted transition-colors hover:border-primary hover:text-white"
                >
                  {link.icon}
                </a>
              );
            })}
          </div>
        </div>

        {/* 02 相性 or 非相性の判定バー */}
        {verdict && targetType && (
          <div
            className={`mt-3 rounded-card border p-4 ${
              verdict === "bad"
                ? "border-dangerline bg-dangerbg"
                : verdict === "good"
                  ? "border-reliefline bg-reliefbg"
                  : "border-line bg-surface"
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[10px] font-black tracking-[0.22em] ${
                  verdict === "bad" ? "text-primary" : verdict === "good" ? "text-relief" : "text-txt-muted"
                }`}
              >
                {verdict === "bad" ? "非相性" : verdict === "good" ? "相性 良好" : "相性 ふつう"}
              </span>
              <span className="text-[10px] font-bold text-txt-subtle">
                あなた（{viewerDiagnosis?.personalityType?.typeName}）×{" "}
                {targetType.typeName}
              </span>
            </div>
            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-black/30">
              <div
                className={`h-full rounded-full ${verdict === "good" ? "bg-relief" : "bg-primary"}`}
                style={{ width: verdict === "bad" ? "88%" : verdict === "good" ? "82%" : "50%" }}
              />
            </div>
            <p className="mt-2.5 text-[11.5px] leading-[1.85] text-txt-muted">
              {verdict === "bad"
                ? `${targetType.typeName}は、あなたのタイプと相性最悪リストに入っています。個人の話ではなく、タイプの話です。下の「やってはいけないこと」を読んでから接触してください。`
                : verdict === "good"
                  ? "タイプ相性は良好です。とはいえ油断した瞬間に足元をすくわれるのが人間関係です。"
                  : "可もなく不可もなく。関係は2人の努力次第、という一番普通の判定です。"}
            </p>
          </div>
        )}

        {/* 03 ビッグファイブ比較（自分と重ねて表示） */}
        {diagnosisDetails && (
          <div className="mt-3 rounded-card border border-line bg-surface p-5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black tracking-[0.22em] text-txt-muted">
                BIG FIVE 比較
              </span>
              <span className="flex items-center gap-3 text-[9px] font-bold text-txt-subtle">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-3 rounded-full bg-hazard" /> {subjectName}
                </span>
                {viewerDiagnosis && !isOwner && (
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-3 rounded-full bg-primary" /> あなた
                  </span>
                )}
              </span>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              {TRAITS.map((trait) => {
                const targetPct = Math.round((diagnosisDetails.bigFiveScores[trait] / 5) * 100);
                const viewerPct =
                  viewerDiagnosis && !isOwner
                    ? Math.round((viewerDiagnosis.bigFiveScores[trait] / 5) * 100)
                    : null;
                return (
                  <div key={trait}>
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-txt-muted">{traitLabels[trait]}</span>
                      <span className="font-mono text-txt-subtle">
                        {targetPct}
                        {viewerPct !== null ? ` / ${viewerPct}` : ""}
                      </span>
                    </div>
                    <div className="relative mt-[5px] h-2 rounded-full bg-surface-alt">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-hazard/80"
                        style={{ width: `${targetPct}%` }}
                      />
                      {viewerPct !== null && (
                        <div
                          className="absolute top-1/2 h-3 w-[3px] -translate-y-1/2 rounded-full bg-primary"
                          style={{ left: `calc(${viewerPct}% - 1.5px)` }}
                          aria-label={`あなた: ${viewerPct}`}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 04 プロフィール本文 */}
        <div className="mt-3 rounded-card border border-line bg-surface p-5">
          <div className="text-[10px] font-black tracking-[0.22em] text-txt-muted">自己紹介</div>
          <p className="mt-3 whitespace-pre-wrap break-words text-[13px] leading-8 text-txt-muted">
            {profile.bio || "自己紹介はまだありません。"}
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {infoItems.map((item) => (
              <div key={item.label} className="rounded-input border border-line-soft bg-panel px-3.5 py-3">
                <div className="text-[9px] font-black tracking-[0.16em] text-txt-subtle">
                  {item.label}
                </div>
                <div className="mt-1 whitespace-pre-wrap break-words text-xs font-bold text-txt-muted">
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 性格解説（本人の診断詳細） */}
        {diagnosisDetails && (
          <div className="mt-3 rounded-card border border-line bg-surface p-5">
            <div className="text-[10px] font-black tracking-[0.22em] text-txt-muted">
              {subjectName}ってこんな人
            </div>
            <div className="mt-3 flex flex-col gap-3.5">
              {[
                { title: "考え方のクセ", items: diagnosisDetails.detailedNarrative.thinkingStyle },
                {
                  title: "コミュニケーション",
                  items: diagnosisDetails.detailedNarrative.communicationStyle,
                },
                { title: "得意技", items: diagnosisDetails.detailedNarrative.strengths },
              ]
                .filter((block) => block.items.length > 0)
                .map((block) => (
                  <div key={block.title}>
                    <div className="text-[10px] font-black text-txt-subtle">{block.title}</div>
                    <ul className="mt-1.5 flex flex-col gap-1 text-xs leading-[1.9] text-txt-muted">
                      {block.items.map((text, idx) => (
                        <li key={idx} className="break-words">
                          ・{text}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* 05 やってはいけないこと / 会話のきっかけ（タイプに対する記述） */}
        {targetType && guide && !isOwner && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-card border border-warnline bg-warnbg p-[18px]">
              <div className="text-[10px] font-black tracking-[0.22em] text-hazard">
                {targetType.typeName}にやってはいけないこと
              </div>
              <div className="mt-3 rounded-input bg-black/25 px-3.5 py-3 text-xs leading-[1.85] text-[#e2e7f0]">
                ✕ {guide.ng}
              </div>
              <p className="mt-2.5 text-[11px] leading-[1.85] text-txt-subtle">{guide.why}</p>
            </div>
            <div className="rounded-card border border-reliefline bg-reliefbg p-[18px]">
              <div className="text-[10px] font-black tracking-[0.22em] text-relief">
                会話のきっかけ
              </div>
              <div className="mt-3 rounded-input bg-black/25 px-3.5 py-3 text-xs font-bold leading-[1.85] text-[#d5efe3]">
                ◯ {guide.ok}
              </div>
              <p className="mt-2.5 text-[11px] leading-[1.85] text-[#9ccdb8]">{guide.dos[0]}</p>
              <Link
                href="/coaching"
                className="mt-3 inline-flex min-h-[40px] items-center rounded-full bg-relief px-4 text-[11px] font-black text-[#05130e] transition-colors hover:bg-white"
              >
                このタイプの攻略法をすべて見る
              </Link>
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/result"
            className="text-xs font-bold text-txt-subtle transition-colors hover:text-white"
          >
            ← 結果に戻る
          </Link>
        </div>
      </div>
    </div>
  );
};

const formatDisplayName = (raw?: string | null) => {
  const base = raw?.trim();
  if (!base) return "このユーザーさん";
  return base.endsWith("さん") ? base : `${base}さん`;
};

const PrivateProfileNotice = ({ name }: { name?: string | null }) => {
  const formattedName = formatDisplayName(name);
  return (
    <div className="flex min-h-screen items-center bg-ink px-4 py-16 text-white">
      <div className="mx-auto w-full max-w-md rounded-hero border border-line bg-panel p-9 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-card bg-surface-alt text-txt-muted">
          <Lock className="h-6 w-6" />
        </div>
        <p className="text-[10px] font-black tracking-[0.3em] text-txt-subtle">PRIVATE PROFILE</p>
        <h1 className="mt-3 text-lg font-black leading-relaxed">
          {formattedName}はプロフィールを非公開中です。
        </h1>
        <p className="mt-2.5 text-xs leading-relaxed text-txt-subtle">
          公開されるまで今しばらくお待ちください。
        </p>
        <div className="mt-6 flex flex-col gap-2.5">
          <Link
            href="/result"
            className="flex min-h-[48px] items-center justify-center rounded-input bg-hazard text-[13px] font-black text-ink transition-colors hover:bg-white"
          >
            結果ページに戻る
          </Link>
          <Link
            href="/"
            className="flex min-h-[44px] items-center justify-center text-xs font-bold text-txt-subtle transition-colors hover:text-white"
          >
            トップページへ
          </Link>
        </div>
      </div>
    </div>
  );
};

const ProfileNotFoundNotice = () => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-ink p-4 text-center text-white">
    <div className="w-full max-w-md rounded-hero border border-line bg-panel p-9">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-card bg-surface-alt text-txt-muted">
        <User className="h-6 w-6" />
      </div>
      <h1 className="text-lg font-black">プロフィールが見つかりません</h1>
      <p className="mt-2.5 text-xs leading-relaxed text-txt-subtle">
        URLが間違っている可能性があります。トップページから再度アクセスしてください。
      </p>
      <Link
        href="/"
        className="mt-6 flex min-h-[48px] items-center justify-center rounded-input bg-hazard text-[13px] font-black text-ink transition-colors hover:bg-white"
      >
        トップページへ戻る
      </Link>
    </div>
  </div>
);

export default ProfileDetailPage;
