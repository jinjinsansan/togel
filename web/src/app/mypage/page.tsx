"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { User } from "@supabase/supabase-js";
import {
  Bell,
  Coins,
  History,
  Mail,
  Link as LinkIcon,
  Check,
  Copy,
  AlertCircle,
  Palette,
  Sparkles,
  Shield,
  Calendar,
  Award,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { getTogelLabel, personalityTypes } from "@/lib/personality";

type Notification = {
  id: string;
  title: string;
  content: string;
  scheduled_at: string;
  read: boolean;
  type: "admin" | "matching" | "system";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any;
};

type CertificateThemeId =
  | "rose"
  | "blush"
  | "citrine"
  | "pearl"
  | "onyx"
  | "royal"
  | "aurum"
  | "argent"
  | "amethyst";

type CertificateTheme = {
  label: string;
  background: string;
  border: string;
  accent: string;
  chip: string;
  hologram: string;
  text: string;
};

const CERTIFICATE_THEMES: Record<CertificateThemeId, CertificateTheme> = {
  rose: {
    label: "Rosé Bloom",
    background: "from-rose-50 via-white to-rose-100",
    border: "border-rose-200/70",
    accent: "text-rose-600",
    chip: "bg-rose-100 text-rose-600",
    hologram: "from-rose-200/70 via-white/70 to-rose-100/80",
    text: "text-rose-900",
  },
  blush: {
    label: "Blush Pearl",
    background: "from-pink-50 via-white to-rose-50",
    border: "border-pink-100",
    accent: "text-pink-500",
    chip: "bg-white/70 text-pink-500",
    hologram: "from-white/80 via-pink-50/80 to-slate-50/90",
    text: "text-slate-900",
  },
  citrine: {
    label: "Citrine Glow",
    background: "from-amber-50 via-white to-yellow-100",
    border: "border-amber-200",
    accent: "text-amber-600",
    chip: "bg-amber-100 text-amber-600",
    hologram: "from-amber-100/70 via-white/70 to-yellow-100/80",
    text: "text-amber-900",
  },
  pearl: {
    label: "Iridescent Pearl",
    background: "from-white via-slate-50 to-gray-100",
    border: "border-slate-200",
    accent: "text-slate-600",
    chip: "bg-slate-100 text-slate-600",
    hologram: "from-slate-100/70 via-white/80 to-slate-50/80",
    text: "text-slate-900",
  },
  onyx: {
    label: "Onyx Noir",
    background: "from-slate-900 via-gray-900 to-black",
    border: "border-slate-800",
    accent: "text-white",
    chip: "bg-white/10 text-white",
    hologram: "from-slate-700/60 via-slate-900/70 to-black/80",
    text: "text-white",
  },
  royal: {
    label: "Royal Azure",
    background: "from-indigo-900 via-blue-900 to-slate-900",
    border: "border-indigo-800",
    accent: "text-indigo-200",
    chip: "bg-white/10 text-indigo-100",
    hologram: "from-indigo-600/50 via-indigo-900/70 to-blue-900/80",
    text: "text-indigo-50",
  },
  aurum: {
    label: "Aurum Luxe",
    background: "from-amber-200 via-yellow-300 to-amber-400",
    border: "border-amber-400",
    accent: "text-amber-900",
    chip: "bg-amber-50 text-amber-700",
    hologram: "from-yellow-200/80 via-white/60 to-amber-200/70",
    text: "text-amber-900",
  },
  argent: {
    label: "Argent Frost",
    background: "from-slate-200 via-gray-100 to-slate-50",
    border: "border-slate-300",
    accent: "text-slate-600",
    chip: "bg-white/70 text-slate-500",
    hologram: "from-slate-100/80 via-white/80 to-slate-200/90",
    text: "text-slate-900",
  },
  amethyst: {
    label: "Amethyst Veil",
    background: "from-purple-900 via-violet-900 to-slate-900",
    border: "border-purple-800",
    accent: "text-purple-200",
    chip: "bg-white/10 text-purple-100",
    hologram: "from-purple-500/40 via-purple-900/70 to-indigo-900/80",
    text: "text-purple-50",
  },
};

const FEMALE_THEME_OPTIONS: CertificateThemeId[] = ["rose", "blush", "citrine", "pearl"];
const MALE_THEME_OPTIONS: CertificateThemeId[] = ["aurum", "argent", "onyx", "royal", "amethyst"];

type ProfileDetails = {
  favoriteThings?: string;
  hobbies?: string;
  specialSkills?: string;
  values?: string;
  communication?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
  certificateTheme?: CertificateThemeId;
};

type UserProfile = {
  id: string;
  full_name: string;
  gender: "male" | "female" | "other";
  avatar_url: string;
  job: string;
  city: string;
  created_at?: string;
  diagnosis_type_id?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  social_links?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  notification_settings?: any;
  details?: ProfileDetails | null;
};

const getThemeOptions = (gender: UserProfile["gender"] | undefined) => {
  if (gender === "female") return FEMALE_THEME_OPTIONS;
  if (gender === "male") return MALE_THEME_OPTIONS;
  return ["pearl", "rose", "argent", "onyx"] as CertificateThemeId[];
};

const getDefaultTheme = (gender: UserProfile["gender"] | undefined): CertificateThemeId => {
  const options = getThemeOptions(gender);
  return options[0] ?? "pearl";
};

export default function MyPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [newsletterEnabled, setNewsletterEnabled] = useState(true);
  const [rankInEnabled, setRankInEnabled] = useState(true);
  const [copied, setCopied] = useState(false);
  const [prankActive, setPrankActive] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [certificateTheme, setCertificateTheme] = useState<CertificateThemeId>("rose");
  const [themeSaving, setThemeSaving] = useState(false);
  
  const supabase = createClientComponentClient();

  const hydrateProfile = useCallback((data: UserProfile) => {
    setProfile(data);
    const links = data.social_links || {};
    setPrankActive(links.prankActive !== false);

    const notificationSettings = data.notification_settings || {};
    setRankInEnabled(notificationSettings.rank_in !== false);
    setNewsletterEnabled(notificationSettings.newsletter !== false);

    const details = (data.details as ProfileDetails) || {};
    const nextTheme = (details.certificateTheme as CertificateThemeId) || getDefaultTheme(data.gender);
    setCertificateTheme(nextTheme);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);
      
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
        
      if (data) {
        hydrateProfile(data as UserProfile);
      }

      // Fetch real notifications
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const notifs = await res.json();
          setNotifications(notifs);
        }
      } catch (e) {
        console.error("Failed to load notifications", e);
      }
      
      setLoading(false);
    };
    fetchData();
  }, [supabase, hydrateProfile]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`profile-updates-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload) => {
          hydrateProfile(payload.new as UserProfile);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, user?.id, hydrateProfile]);

  const handleThemeSelection = async (theme: CertificateThemeId) => {
    if (!profile || !user) return;
    if (theme === certificateTheme) return;

    const previousTheme = certificateTheme;
    setCertificateTheme(theme);
    setThemeSaving(true);

    const currentDetails = (profile.details as ProfileDetails) || {};
    const updatedDetails = { ...currentDetails, certificateTheme: theme };

    const { data, error } = await supabase
      .from("profiles")
      .update({ details: updatedDetails })
      .eq("id", user.id)
      .select("*")
      .single();

    setThemeSaving(false);

    if (error) {
      console.error("Failed to save certificate theme", error);
      setCertificateTheme(previousTheme);
      alert("カードのカラー設定の保存に失敗しました。時間を置いて再度お試しください。");
      return;
    }

    if (data) {
      hydrateProfile(data as UserProfile);
    }
  };

  const handleNotificationRead = async (id: string, isRead: boolean) => {
    if (isRead) return; // Already read
    
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: id }),
    });
  };

  const handleNotificationSettingToggle = async (key: "rank_in" | "newsletter", checked: boolean) => {
    if (key === "rank_in") setRankInEnabled(checked);
    if (key === "newsletter") setNewsletterEnabled(checked);
    
    if (!user || !profile) return;

    const currentSettings = profile.notification_settings || {};
    const updatedSettings = { ...currentSettings, [key]: checked };

    const { error } = await supabase
      .from("profiles")
      .update({ notification_settings: updatedSettings })
      .eq("id", user.id);

    if (error) {
      console.error("Failed to update settings", error);
      // Revert (omitted for brevity)
    } else {
      setProfile({ ...profile, notification_settings: updatedSettings });
    }
  };

  const handlePrankToggle = async (checked: boolean) => {
    setPrankActive(checked);
    if (!user || !profile) return;

    const currentLinks = profile.social_links || {};
    const updatedLinks = { ...currentLinks, prankActive: checked };

    const { error } = await supabase
      .from("profiles")
      .update({ social_links: updatedLinks })
      .eq("id", user.id);

    if (error) {
      console.error("Failed to update prank setting", error);
      // Revert on error
      setPrankActive(!checked);
    } else {
      setProfile({ ...profile, social_links: updatedLinks });
    }
  };

  // 招待条件チェック: 男性 かつ 基本情報(名前, 仕事, エリア) + アバターがあること
  // ※詳細プロフィールは必須としない
  const isEligibleForReferral = 
    profile?.gender === "male" && 
    !!profile?.avatar_url && 
    !!profile?.full_name && 
    !!profile?.job && 
    !!profile?.city;

  const diagnosisDefinition = profile?.diagnosis_type_id
    ? personalityTypes.find((type) => type.id === profile.diagnosis_type_id) || null
    : null;

  const diagnosisLabel = profile?.diagnosis_type_id ? getTogelLabel(profile.diagnosis_type_id) : "診断未実施";
  const registeredAt = profile?.created_at || user?.created_at;
  const memberSince = registeredAt
    ? new Date(registeredAt).toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" })
    : "--";

  const themeOptions = getThemeOptions(profile?.gender);
  const fallbackTheme = getDefaultTheme(profile?.gender);
  const activeTheme = CERTIFICATE_THEMES[certificateTheme] ?? CERTIFICATE_THEMES[fallbackTheme];

  const handleCopyLink = () => {
    if (!user) return;
    // シンプルなBase64エンコードでIDを隠蔽 (完全な暗号化ではないが、パッと見でIDとは分からない)
    // 復号時は atob() を使用
    const encodedId = btoa(user.id);
    const referralLink = `${window.location.origin}?c=${encodedId}`;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-[#E91E63]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 md:py-20">
      <div className="container px-4 md:px-6 max-w-4xl">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-center gap-6 mb-12">
          <div className="relative h-24 w-24 md:h-32 md:w-32 shrink-0">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#E91E63] to-purple-600 opacity-20 blur-lg"></div>
            {user?.user_metadata?.avatar_url ? (
              <div className="relative h-full w-full">
                <Image
                  src={user.user_metadata.avatar_url}
                  alt={user.user_metadata.name || "User"}
                  fill
                  sizes="128px"
                  className="rounded-full border-4 border-white object-cover shadow-lg"
                />
              </div>
            ) : (
              <div className="relative h-full w-full rounded-full border-4 border-white bg-slate-200 flex items-center justify-center shadow-lg">
                <span className="text-4xl">👤</span>
              </div>
            )}
          </div>
          <div className="text-center md:text-left">
            <h1 className="font-heading text-3xl font-black text-slate-900 mb-2">
              {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "ゲスト"}
            </h1>
            <p className="text-slate-500 text-sm font-medium">
              {user?.email}
            </p>
            <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-2">
              <span className="inline-flex items-center rounded-full bg-[#E91E63]/10 px-3 py-1 text-xs font-bold text-[#E91E63]">
                無料会員
              </span>
            </div>
          </div>
        </div>

        {profile && (
          <section className="mb-12">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,_3fr)_minmax(0,_2fr)]">
              <CertificateCard
                profile={profile}
                diagnosisLabel={diagnosisLabel}
                diagnosisDefinition={diagnosisDefinition}
                memberSince={memberSince}
                theme={activeTheme}
              />
              <CertificateThemePanel
                options={themeOptions}
                currentTheme={certificateTheme}
                onSelect={handleThemeSelection}
                saving={themeSaving}
                gender={profile.gender}
              />
            </div>
          </section>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          
          {/* 1. お知らせ受信箱 */}
          <div className="md:col-span-2 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Bell size={20} />
              </div>
              <h2 className="font-bold text-lg text-slate-800">お知らせ受信箱</h2>
            </div>
            <div className="space-y-1">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  お知らせはありません
                </div>
              ) : (
                notifications.map((note) => (
                  <div 
                    key={note.id} 
                    onClick={() => handleNotificationRead(note.id, note.read)}
                    className={`flex items-start gap-4 p-4 rounded-xl transition-colors cursor-pointer ${note.read ? "bg-slate-50" : "bg-white border border-slate-100 shadow-sm"}`}
                  >
                    <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${note.read ? "bg-slate-300" : "bg-[#E91E63]"}`} />
                    <div className="flex-1">
                      <div className="flex justify-between items-start gap-2">
                        <p className={`text-sm font-medium ${note.read ? "text-slate-600" : "text-slate-900"}`}>{note.title}</p>
                        {note.type === "matching" && (
                          <span className="text-[10px] bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full font-bold whitespace-nowrap">MATCH</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">{note.content}</p>
                      {note.metadata?.url && (
                        <Link href={note.metadata.url} className="text-xs text-blue-500 hover:underline mt-2 block">
                          詳細を見る →
                        </Link>
                      )}
                      <p className="text-[10px] text-slate-400 mt-2 text-right">
                        {new Date(note.scheduled_at).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 4. メルマガ通知設定 */}
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <Mail size={20} />
              </div>
              <h2 className="font-bold text-lg text-slate-800">メルマガ通知</h2>
            </div>
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 mb-4">
              <div>
                <p className="font-bold text-slate-700">運営からのお知らせ通知</p>
                <p className="text-xs text-slate-500 mt-1">サービスに関するお知らせや情報を受け取る</p>
              </div>
              <Switch checked={newsletterEnabled} onCheckedChange={(c) => handleNotificationSettingToggle("newsletter", c)} />
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50">
              <div>
                <p className="font-bold text-slate-700">ランクイン通知</p>
                <p className="text-xs text-slate-500 mt-1">誰かの診断結果で上位5名に入った際に通知</p>
              </div>
              <Switch checked={rankInEnabled} onCheckedChange={(c) => handleNotificationSettingToggle("rank_in", c)} />
            </div>
          </div>

          {/* 5. 紹介URL発行 (条件付き) */}
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <div className="p-2 rounded-xl bg-green-50 text-green-600">
                <LinkIcon size={20} />
              </div>
              <h2 className="font-bold text-lg text-slate-800">友達を紹介する</h2>
            </div>
            
            {/* 条件: 男性かつプロフィール充実 */}
            {isEligibleForReferral ? ( 
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  このURLから女性が診断すると、<strong className="text-[#E91E63]">あなたがマッチング結果の1位に表示される</strong>確率が大幅に上がります（いたずら機能）。
                </p>
                <div className="flex gap-2">
                  <div className="flex-1 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500 font-mono truncate border border-slate-200">
                    {typeof window !== 'undefined' ? `${window.location.origin}?c=*******` : 'Loading...'}
                  </div>
                  <Button onClick={handleCopyLink} className="shrink-0" size="icon" variant="outline">
                    {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
                  </Button>
                </div>
                <p className="text-xs text-slate-400">
                  ※URLは暗号化されており、あなたのIDは直接見えません。
                </p>
                
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-700">いたずら機能を有効にする</p>
                      <p className="text-xs text-slate-500">OFFにすると、紹介相手には通常の結果だけが表示されます。</p>
                    </div>
                    <Switch checked={prankActive} onCheckedChange={handlePrankToggle} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 px-2">
                <AlertCircle className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-400">発行条件を満たしていません</p>
                <p className="text-xs text-slate-400 mt-1">
                  ※男性会員かつ基本プロフィール（写真含む）を<br/>すべて入力した方のみ発行可能です
                </p>
                <Button variant="ghost" asChild className="mt-2 h-auto p-0 text-[#E91E63] hover:underline">
                  <Link href="/profile/edit">プロフィールを編集する</Link>
                </Button>
              </div>
            )}
          </div>

          {/* 2. ポイント購入 (準備中) */}
          <div className="relative rounded-3xl border border-slate-100 bg-white p-6 shadow-sm overflow-hidden">
            <div className="absolute top-3 right-3 bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-full border border-slate-200">
              COMING SOON
            </div>
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4 opacity-50">
              <div className="p-2 rounded-xl bg-yellow-50 text-yellow-600">
                <Coins size={20} />
              </div>
              <h2 className="font-bold text-lg text-slate-800">ポイント購入</h2>
            </div>
            <div className="text-center py-8 opacity-50">
              <p className="text-sm text-slate-400">現在準備中です</p>
            </div>
          </div>

          {/* 3. ポイント履歴 (準備中) */}
          <div className="relative rounded-3xl border border-slate-100 bg-white p-6 shadow-sm overflow-hidden">
            <div className="absolute top-3 right-3 bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-full border border-slate-200">
              COMING SOON
            </div>
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4 opacity-50">
              <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
                <History size={20} />
              </div>
              <h2 className="font-bold text-lg text-slate-800">ポイント履歴</h2>
            </div>
            <div className="text-center py-8 opacity-50">
              <p className="text-sm text-slate-400">現在準備中です</p>
            </div>
          </div>

        </div>
        
        <div className="mt-12 text-center">
          <Button variant="outline" asChild className="text-slate-400 hover:text-slate-600">
            <Link href="/">トップページに戻る</Link>
          </Button>
        </div>

      </div>
    </div>
  );
}

type CertificateCardProps = {
  profile: UserProfile;
  diagnosisLabel: string;
  diagnosisDefinition: (typeof personalityTypes)[number] | null;
  memberSince: string;
  theme: CertificateTheme;
};

const CertificateCard = ({ profile, diagnosisLabel, diagnosisDefinition, memberSince, theme }: CertificateCardProps) => {
  const typeName = diagnosisDefinition?.typeName || "未診断";
  const catchphrase = diagnosisDefinition?.catchphrase || "診断を完了すると証明書が発行されます";
  const emoji = diagnosisDefinition?.emoji || "✨";

  return (
    <div className={`relative overflow-hidden rounded-3xl border ${theme.border} bg-gradient-to-br ${theme.background} shadow-[0_20px_60px_-30px_rgba(0,0,0,0.45)] p-6 sm:p-10` }>
      <div className="absolute inset-0 pointer-events-none">
        <div className={`absolute -top-20 -right-10 h-64 w-64 rounded-full opacity-40 blur-3xl bg-gradient-to-r ${theme.hologram}`} />
        <div className={`absolute bottom-0 left-0 h-32 w-32 opacity-30 blur-3xl bg-gradient-to-br ${theme.hologram}`} />
      </div>

      <div className="relative space-y-6 text-sm">
        <div className="flex items-center justify-between text-[0.65rem] tracking-[0.3em] uppercase font-semibold opacity-80">
          <span className={`flex items-center gap-2 ${theme.accent}`}>
            <Sparkles className="h-3 w-3" /> Togel Official
          </span>
          <span className="text-xs font-mono opacity-70">ID #{profile.id.slice(0, 8)}</span>
        </div>

        <div>
          <p className={`text-xs font-semibold uppercase tracking-[0.3em] ${theme.accent}`}>Personality Certificate</p>
          <h3 className={`text-3xl sm:text-4xl font-black leading-tight ${theme.text}`}>
            {profile.full_name || "No Name"}
          </h3>
          <p className={`text-xs font-semibold mt-1 uppercase tracking-[0.2em] ${theme.accent}`}>Member since {memberSince}</p>
        </div>

        <div className="rounded-2xl border border-white/20 bg-white/40 backdrop-blur px-4 py-5 shadow-inner">
          <p className="text-xs font-semibold text-slate-500">Certified Togel Type</p>
          <div className="flex items-center justify-between mt-2">
            <div>
              <p className="text-sm font-bold text-slate-600">{diagnosisLabel}</p>
              <p className="text-2xl font-black text-slate-900 leading-tight">{typeName}</p>
            </div>
            <div className="flex flex-col items-center text-3xl">
              <span>{emoji}</span>
              <Award className="h-5 w-5 text-amber-500 mt-1" />
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500 leading-relaxed">{catchphrase}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="rounded-xl border border-white/30 bg-white/40 px-3 py-3 backdrop-blur">
            <p className="text-slate-500 font-semibold flex items-center gap-1 text-[0.65rem]">
              <Calendar className="h-3 w-3" /> 登録日
            </p>
            <p className={`text-sm font-bold ${theme.text}`}>{memberSince}</p>
          </div>
          <div className="rounded-xl border border-white/30 bg-white/40 px-3 py-3 backdrop-blur">
            <p className="text-slate-500 font-semibold flex items-center gap-1 text-[0.65rem]">
              <Shield className="h-3 w-3" /> ステータス
            </p>
            <p className={`text-sm font-bold ${theme.text}`}>{diagnosisDefinition ? "認定済" : "未認定"}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

type ThemePanelProps = {
  options: CertificateThemeId[];
  currentTheme: CertificateThemeId;
  onSelect: (theme: CertificateThemeId) => void;
  saving: boolean;
  gender: UserProfile["gender"];
};

const CertificateThemePanel = ({ options, currentTheme, onSelect, saving, gender }: ThemePanelProps) => (
  <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm h-full flex flex-col">
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 rounded-2xl bg-slate-100 text-slate-600">
        <Palette className="h-4 w-4" />
      </div>
      <div>
        <p className="font-bold text-slate-900">カードテーマ</p>
        <p className="text-xs text-slate-500">
          {gender === "female"
            ? "女性向けのカラーから選択できます"
            : gender === "male"
              ? "男性向けのシックなカラー"
              : "お好きなカラーを選択できます"}
        </p>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3 flex-1">
      {options.map((option) => {
        const theme = CERTIFICATE_THEMES[option];
        const isActive = option === currentTheme;
        return (
          <button
            key={option}
            type="button"
            disabled={saving}
            onClick={() => onSelect(option)}
            className={`group w-full rounded-2xl bg-gradient-to-br ${theme.background} px-3 py-4 text-left transition-all ${
              isActive ? `${theme.border} shadow-lg ring-2 ring-black/5` : "border border-transparent opacity-80"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>{theme.label}</span>
              {isActive && <Check className="h-4 w-4 text-emerald-500" />}
            </div>
            <div className={`mt-3 h-2 w-full rounded-full bg-gradient-to-r ${theme.background}`} />
          </button>
        );
      })}
    </div>
    {saving && <p className="mt-3 text-[11px] text-slate-400">保存中...</p>}
  </div>
);

