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
import { generateThemeFromColor, presetColors } from "@/lib/color-theme";
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

const getDefaultCertificateColor = (gender?: UserGender) => DEFAULT_COLOR_BY_GENDER[gender ?? "default"];

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

  const diagnosisDefinition = profile?.diagnosis_type_id
    ? personalityTypes.find((type) => type.id === profile.diagnosis_type_id) || null
    : null;

  const diagnosisLabel = profile?.diagnosis_type_id ? getTogelLabel(profile.diagnosis_type_id) : "診断未実施";
  const registeredAt = profile?.created_at || user?.created_at;
  const memberSince = registeredAt
    ? new Date(registeredAt).toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" })
    : "--";

  const certificateBaseColor = certificateColor || getDefaultCertificateColor(profile?.gender);
  const certificateNickname =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Togel Member";
  const certificateSubtitle = diagnosisDefinition?.typeName ?? "タイプ未選択";
  const certificateDate = registeredAt
    ? new Date(registeredAt).toISOString().split("T")[0].replace(/-/g, ".")
    : "--";

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
                    togelType={diagnosisLabel}
                    togelLabel={certificateSubtitle}
                    registrationDate={certificateDate}
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
  const normalizedColor = currentColor.toLowerCase();

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
    <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm space-y-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Custom Color</p>
          <h3 className="font-bold text-lg text-slate-900 mt-1">カードカラーを調整</h3>
          <p className="text-sm text-slate-500 mt-1">プリセットやHEX入力だけで質感が丸ごと変わります。</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-2 text-slate-600">
          <Palette size={18} />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <input
          type="color"
          value={currentColor}
          onChange={(event) => onSelect(event.target.value.toLowerCase())}
          className="w-12 h-12 rounded-full border border-slate-200 shadow-inner cursor-pointer"
        />
        <input
          type="text"
          value={inputValue}
          onChange={(event) => handleInputChange(event.target.value)}
          className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm focus:border-slate-400 focus:outline-none"
          placeholder="#F8BBD9"
        />
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-500 mb-3">プリセット</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
          {presetColors.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => onSelect(preset.color.toLowerCase())}
              className={`h-12 rounded-2xl border transition-all ${
                normalizedColor === preset.color.toLowerCase()
                  ? "ring-2 ring-offset-2 ring-slate-900"
                  : "hover:opacity-90"
              }`}
              style={{
                background: preset.isDark
                  ? `linear-gradient(145deg, ${preset.color} 0%, #000 100%)`
                  : `linear-gradient(145deg, #fff 0%, ${preset.color} 100%)`,
                borderColor: preset.color,
              }}
            >
              <span className="sr-only">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-500 mb-2">テーマプレビュー</p>
        <div className="flex gap-2">
          {[themePreview.primary, themePreview.secondary, themePreview.accent, themePreview.text, themePreview.textMuted].map((color) => (
            <div key={color} className="flex-1 h-10 rounded-xl border border-slate-100" style={{ backgroundColor: color }} />
          ))}
        </div>
      </div>

      <p className="text-[11px] text-slate-400 text-right">
        {saving ? "保存中..." : "選択すると即座に保存されます"}
      </p>
    </div>
  );
};

