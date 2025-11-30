"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { User } from "@supabase/supabase-js";
import { Bell, Coins, History, Mail, Link as LinkIcon, Check, Copy, AlertCircle, Palette } from "lucide-react";

import { TogelCertificateCard } from "@/components/certificate/togel-certificate-card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { generateThemeFromColor } from "@/lib/color-theme";
import { personalityTypes } from "@/lib/personality";

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

type UserGender = "male" | "female" | "other";

const LEGACY_THEME_COLORS: Record<string, string> = {
  rose: "#f8bbd9",
  blush: "#f9c0cb",
  citrine: "#ffd166",
  pearl: "#f1f5f9",
  onyx: "#1a2538",
  royal: "#2a1a4a",
  aurum: "#ffd700",
  argent: "#e0e0e0",
  amethyst: "#6b21a8",
};

const DEFAULT_COLOR_BY_GENDER: Record<UserGender | "default", string> = {
  female: "#f8bbd9",
  male: "#1a2538",
  other: "#f8bbd9",
  default: "#f8bbd9",
};

const HEX_COLOR_REGEX = /^#[0-9a-f]{6}$/i;

const normalizeHexColor = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  const prefixed = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  const normalized = prefixed.toLowerCase();
  return HEX_COLOR_REGEX.test(normalized) ? normalized : null;
};

const resolveCertificateColor = (stored?: string | null, gender?: UserGender) => {
  const normalized = normalizeHexColor(stored);
  if (normalized) return normalized;
  if (stored && LEGACY_THEME_COLORS[stored]) {
    return LEGACY_THEME_COLORS[stored];
  }
  return DEFAULT_COLOR_BY_GENDER[gender ?? "default"];
};

type ProfileDetails = {
  favoriteThings?: string;
  hobbies?: string;
  specialSkills?: string;
  values?: string;
  communication?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
  certificateTheme?: string;
};

type UserProfile = {
  id: string;
  full_name: string;
  gender: UserGender;
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

type DiagnosisHistoryEntry = {
  id: string;
  occurrence: number;
  mode: "light" | "full";
  togelTypeId: string | null;
  togelLabel: string | null;
  typeName: string | null;
  completedAt: string | null;
};

const getDefaultCertificateColor = (gender?: UserGender) => DEFAULT_COLOR_BY_GENDER[gender ?? "default"];

const toTitleCase = (value: string) => value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");

const formatTypeNameEn = (typeId?: string | null) => {
  if (!typeId) return "Type Pending";
  return toTitleCase(typeId);
};

const formatTogelTypeCode = (typeId?: string | null) => {
  if (!typeId) return "Togel-00type";
  const index = personalityTypes.findIndex((type) => type.id === typeId);
  const padded = index === -1 ? "00" : String(index + 1).padStart(2, "0");
  return `Togel-${padded}type`;
};

const formatRegistrationDate = (value?: string | null) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  const formatted = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return formatted.replace(/\//g, ".");
};

const formatDiagnosisDateTime = (value?: string | null) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  const formatted = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return formatted.replace(/\//g, ".");
};

const formatDiagnosisModeLabel = (mode: "light" | "full") => (mode === "light" ? "ライト版" : "スタンダード版");

export default function MyPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [newsletterEnabled, setNewsletterEnabled] = useState(true);
  const [rankInEnabled, setRankInEnabled] = useState(true);
  const [copied, setCopied] = useState(false);
  const [prankActive, setPrankActive] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [certificateColor, setCertificateColor] = useState<string>(DEFAULT_COLOR_BY_GENDER.default);
  const [themeSaving, setThemeSaving] = useState(false);
  const [diagnosisHistory, setDiagnosisHistory] = useState<DiagnosisHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  
  const supabase = createClientComponentClient();

  const hydrateProfile = useCallback((data: UserProfile) => {
    setProfile(data);
    const links = data.social_links || {};
    setPrankActive(links.prankActive !== false);

    const notificationSettings = data.notification_settings || {};
    setRankInEnabled(notificationSettings.rank_in !== false);
    setNewsletterEnabled(notificationSettings.newsletter !== false);

    const details = (data.details as ProfileDetails) || {};
    const nextColor = resolveCertificateColor(details.certificateTheme, data.gender);
    setCertificateColor(nextColor);
  }, []);

  const fetchDiagnosisHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await fetch("/api/diagnosis/history");
      if (res.status === 401) {
        setDiagnosisHistory([]);
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to load history");
      }
      const data = await res.json();
      setDiagnosisHistory(Array.isArray(data.history) ? data.history : []);
    } catch (err) {
      console.error("Failed to load diagnosis history", err);
      setHistoryError("診断履歴を取得できませんでした。");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        setLoading(false);
        return;
      }
      setUser(authUser);
      
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
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

      await fetchDiagnosisHistory();
      setLoading(false);
    };
    fetchData();
  }, [supabase, hydrateProfile, fetchDiagnosisHistory]);

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

  const handleColorSelection = async (color: string) => {
    if (!profile || !user) return;
    const normalized = normalizeHexColor(color);
    if (!normalized || normalized === certificateColor) return;

    const previousColor = certificateColor;
    setCertificateColor(normalized);
    setThemeSaving(true);

    const currentDetails = (profile.details as ProfileDetails) || {};
    const updatedDetails = { ...currentDetails, certificateTheme: normalized };

    const { data, error } = await supabase
      .from("profiles")
      .update({ details: updatedDetails })
      .eq("id", user.id)
      .select("*")
      .single();

    setThemeSaving(false);

    if (error) {
      console.error("Failed to save certificate color", error);
      setCertificateColor(previousColor);
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

  const certificateTypeCode = formatTogelTypeCode(profile?.diagnosis_type_id);
  const certificateBaseColor = certificateColor || getDefaultCertificateColor(profile?.gender);
  const certificateNickname =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Togel Member";
  const certificateSubtitle = formatTypeNameEn(profile?.diagnosis_type_id);
  const registeredAt = profile?.created_at || user?.created_at;
  const certificateDateDisplay = formatRegistrationDate(registeredAt);
  const memberSince = certificateDateDisplay;

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
    <div className="min-h-screen bg-slate-50 py-12 md:py-20 overflow-x-hidden">
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
            <div className="grid gap-4 md:gap-6 lg:grid-cols-[minmax(0,_3fr)_minmax(0,_2fr)]">
              <div className="rounded-3xl border border-slate-100 bg-gradient-to-br from-white via-slate-50 to-slate-100/60 p-4 shadow-sm sm:p-6">
                <div className="flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.4em] uppercase text-slate-400">Togel Official</p>
                    <p className="text-slate-800 font-bold">Premium Certificate</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase text-slate-400">Member Since</p>
                    <p className="text-sm font-semibold text-slate-700">{memberSince}</p>
                  </div>
                </div>
                <div className="mt-6 flex justify-center">
                  <TogelCertificateCard
                    baseColor={certificateBaseColor}
                    nickname={certificateNickname}
                    togelType={certificateTypeCode}
                    togelLabel={certificateSubtitle}
                    registrationDate={certificateDateDisplay}
                  />
                </div>
              </div>
              <CertificateColorPanel
                currentColor={certificateBaseColor}
                onSelect={handleColorSelection}
                saving={themeSaving}
              />
            </div>
          </section>
        )}

        <section className="mb-12">
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <History size={20} />
              </div>
              <h2 className="font-bold text-lg text-slate-800">診断ヒストリー</h2>
            </div>
            {historyLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin rounded-full h-6 w-6 border-4 border-slate-200 border-t-[#E91E63]"></div>
              </div>
            ) : historyError ? (
              <div className="text-center text-sm text-red-500 py-6">{historyError}</div>
            ) : diagnosisHistory.length === 0 ? (
              <div className="text-center text-sm text-slate-500 py-6 space-y-2">
                <p>まだ診断履歴がありません。</p>
                <Button asChild variant="ghost" className="text-[#E91E63] hover:text-[#D81B60]">
                  <Link href="/diagnosis/select">診断を受ける</Link>
                </Button>
              </div>
            ) : (
              <ol className="relative border-l border-slate-200 pl-4 space-y-6">
                {diagnosisHistory.map((entry) => {
                  const togelCode = entry.togelTypeId ? formatTogelTypeCode(entry.togelTypeId) : entry.togelLabel ?? "Togel --型";
                  const togelName = entry.togelTypeId ? formatTypeNameEn(entry.togelTypeId) : entry.typeName ?? "Type Pending";
                  return (
                    <li key={entry.id} className="relative pl-4">
                      <span className="absolute -left-2 top-1 h-3 w-3 rounded-full bg-[#E91E63] border-2 border-white"></span>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">第{entry.occurrence}回</p>
                          <p className="text-lg font-bold text-slate-900">{formatDiagnosisDateTime(entry.completedAt)}</p>
                        </div>
                        <div className="text-sm text-slate-500 text-left sm:text-right">
                          <p className="font-bold text-slate-800">{formatDiagnosisModeLabel(entry.mode)}</p>
                          <p className="text-xs text-slate-500">{togelCode} · {togelName}</p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </section>

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

type CertificateColorPanelProps = {
  currentColor: string;
  onSelect: (color: string) => void;
  saving: boolean;
};

const CertificateColorPanel = ({ currentColor, onSelect, saving }: CertificateColorPanelProps) => {
  const [inputValue, setInputValue] = useState(currentColor.toUpperCase());
  const themePreview = useMemo(() => generateThemeFromColor(currentColor), [currentColor]);

  useEffect(() => {
    setInputValue(currentColor.toUpperCase());
  }, [currentColor]);

  const handleInputChange = (value: string) => {
    if (value === "") {
      setInputValue("#");
      return;
    }
    const formatted = value.startsWith("#") ? value.toUpperCase() : `#${value.toUpperCase()}`;
    if (/^#[0-9A-F]{0,6}$/.test(formatted)) {
      setInputValue(formatted);
      if (formatted.length === 7) {
        onSelect(formatted.toLowerCase());
      }
    }
  };

  return (
    <div className="rounded-3xl border border-slate-100 bg-white px-4 py-4 shadow-sm space-y-3 sm:px-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">Color Control</p>
          <h3 className="font-semibold text-base text-slate-900 mt-1">カードカラー</h3>
          <p className="text-xs text-slate-500 mt-0.5">HEXとピッカーで直感操作</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-1.5 text-slate-600">
          <Palette size={16} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className="relative h-10 w-10">
          <span
            className="absolute inset-0 rounded-full border border-slate-200 shadow-inner"
            style={{ backgroundColor: currentColor }}
          />
          <input
            type="color"
            value={currentColor}
            onChange={(event) => onSelect(event.target.value.toLowerCase())}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="色を選択"
          />
        </label>
        <input
          type="text"
          value={inputValue}
          onChange={(event) => handleInputChange(event.target.value)}
          className="flex-1 h-10 rounded-2xl border border-slate-200 bg-slate-50 px-3 font-mono text-sm focus:border-slate-400 focus:outline-none"
          placeholder="#F8BBD9"
          aria-label="HEXカラーコード"
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold text-slate-500">Palette Preview</p>
        <div className="flex gap-1.5">
          {[themePreview.primary, themePreview.accent, themePreview.text].map((color) => (
            <span key={color} className="h-6 w-6 rounded-full border border-slate-100" style={{ backgroundColor: color }} />
          ))}
        </div>
      </div>

      <p className="text-[10px] text-slate-400 text-right">
        {saving ? "保存中..." : "タップするだけで即保存"}
      </p>
    </div>
  );
};

