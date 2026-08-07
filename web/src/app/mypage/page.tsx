"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";

import { RecommendationsSection } from "@/components/recommendations/recommendations-section";
import { Switch } from "@/components/ui/switch";
import { TogelMark } from "@/components/brand/togel-mark";
import { personalityTypes } from "@/lib/personality";
import type { ExtendedPersonalityTypeDefinition } from "@/lib/personality/definitions";

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details?: any;
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

const findExtended = (typeId: string | null | undefined): ExtendedPersonalityTypeDefinition | null =>
  personalityTypes.find((t) => t.id === typeId) ?? null;

const formatCardNo = (typeId?: string | null) => {
  const index = personalityTypes.findIndex((type) => type.id === typeId);
  return index === -1 ? "NO. 00-X" : `NO. ${String(index + 1).padStart(2, "0")}-${"ABC"[index % 3]}`;
};

const formatYearMonth = (value?: string | null) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const formatDate = (value?: string | null) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(date)
    .replace(/\//g, ".");
};

/** 危険物取扱者カード: ドラッグ（またはホバー）で回転するメタリックカード */
const HazardLicenseCard = ({
  typeName,
  catchphrase,
  caution,
  cardNo,
  since,
}: {
  typeName: string;
  catchphrase: string;
  caution: string;
  cardNo: string;
  since: string;
}) => {
  const [rotation, setRotation] = useState({ x: 7, y: -16 });
  const [isDragging, setIsDragging] = useState(false);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    setIsDragging(true);
    last.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    setRotation((prev) => ({
      x: Math.max(-28, Math.min(28, prev.x - dy * 0.4)),
      y: Math.max(-45, Math.min(45, prev.y + dx * 0.4)),
    }));
  };
  const onPointerUp = () => {
    dragging.current = false;
    setIsDragging(false);
  };

  return (
    <div className="flex justify-center [perspective:1000px]">
      <div
        role="img"
        aria-label={`危険物取扱者カード: ${typeName}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative flex aspect-[1.586] w-full max-w-[340px] cursor-grab touch-none select-none flex-col justify-between overflow-hidden rounded-[18px] border border-[#2c3a58] bg-metal p-5.5 shadow-[0_34px_70px_-28px_rgba(255,46,116,.6)] active:cursor-grabbing"
        style={{
          transform: `rotateY(${rotation.y}deg) rotateX(${rotation.x}deg)`,
          transition: isDragging ? "none" : "transform .55s cubic-bezier(.2,.8,.2,1)",
        }}
      >
        <div
          className="animate-sheen pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent_35%,rgba(255,255,255,.14)_50%,transparent_65%)] bg-[length:200%_100%]"
          aria-hidden="true"
        />
        <div className="relative flex items-start justify-between">
          <div>
            <div className="text-[9px] font-black tracking-[0.26em] text-hazard">
              HAZARDOUS TYPE LICENSE
            </div>
            <div className="mt-2 text-xl font-black text-white">{typeName}</div>
            <div className="mt-[3px] text-[10px] font-bold text-[#8fa2c0]">{catchphrase}</div>
          </div>
          <TogelMark size={26} className="flex-none" />
        </div>
        <div className="relative flex items-end justify-between gap-3">
          <div>
            <div className="text-[9px] tracking-[0.2em] text-[#7d879b]">注意事項</div>
            <div className="mt-1 text-[11px] font-bold text-txt-muted">{caution}</div>
          </div>
          <div className="flex-none text-right font-mono text-[9px] leading-relaxed text-[#7d879b]">
            <div>{cardNo}</div>
            <div>{since}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function MyPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [history, setHistory] = useState<DiagnosisHistoryEntry[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [prankActive, setPrankActive] = useState(true);
  const [newsletterEnabled, setNewsletterEnabled] = useState(true);

  const supabase = createSupabaseBrowserClient();

  const hydrateProfile = useCallback((data: UserProfile) => {
    setProfile(data);
    setPrankActive(data.social_links?.prankActive ?? true);
    setNewsletterEnabled(data.notification_settings?.newsletter ?? true);
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const json = await res.json();
      if (Array.isArray(json)) {
        setNotifications(json as Notification[]);
      }
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "20", offset: "0" });
      const res = await fetch(`/api/diagnosis/history?${params.toString()}`);
      if (!res.ok) return;
      const json = await res.json();
      if (Array.isArray(json.history)) {
        setHistory(json.history as DiagnosisHistoryEntry[]);
        setHistoryTotal(json.meta?.total ?? json.history.length);
      }
    } catch (error) {
      console.error("Failed to fetch diagnosis history", error);
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

      const profilePromise = supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      await Promise.all([
        profilePromise.then((res) => {
          if (res?.data) hydrateProfile(res.data as UserProfile);
        }),
        fetchNotifications(),
        fetchHistory(),
      ]);
      setLoading(false);
    };
    void fetchData();
  }, [supabase, hydrateProfile, fetchNotifications, fetchHistory]);

  const handleNotificationRead = async (id: string, isRead: boolean) => {
    if (isRead) return;
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: id }),
    });
  };

  const handlePrankToggle = async (checked: boolean) => {
    setPrankActive(checked);
    if (!user || !profile) return;
    const updatedLinks = { ...(profile.social_links || {}), prankActive: checked };
    const { error } = await supabase
      .from("profiles")
      .update({ social_links: updatedLinks })
      .eq("id", user.id);
    if (error) {
      console.error("Failed to update prank setting", error);
      setPrankActive(!checked);
    } else {
      setProfile({ ...profile, social_links: updatedLinks });
    }
  };

  const handleNewsletterToggle = async (checked: boolean) => {
    setNewsletterEnabled(checked);
    if (!user || !profile) return;
    const updatedSettings = { ...(profile.notification_settings || {}), newsletter: checked };
    const { error } = await supabase
      .from("profiles")
      .update({ notification_settings: updatedSettings })
      .eq("id", user.id);
    if (error) {
      console.error("Failed to update settings", error);
      setNewsletterEnabled(!checked);
    } else {
      setProfile({ ...profile, notification_settings: updatedSettings });
    }
  };

  const buildInviteUrl = async (): Promise<string | null> => {
    // サーバーで HMAC 署名された招待コードを取得（偽造不可・自分専用）
    const res = await fetch("/api/invite/generate");
    if (!res.ok) return null;
    const { code, enabled } = await res.json();
    if (!enabled || !code) return null;
    const referralUrl = new URL(window.location.origin);
    referralUrl.searchParams.set("c", code);
    referralUrl.searchParams.set("openExternalBrowser", "1");
    return referralUrl.toString();
  };

  const handleCopyLink = async () => {
    if (typeof window === "undefined" || !user) return;
    try {
      const url = await buildInviteUrl();
      if (!url) {
        alert("招待リンク機能は現在利用できません。");
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy invite link", e);
      alert("招待リンクの生成に失敗しました。");
    }
  };

  const handleLineShare = async () => {
    if (typeof window === "undefined" || !user) return;
    try {
      const url = await buildInviteUrl();
      if (!url) {
        alert("招待リンク機能は現在利用できません。");
        return;
      }
      const text = "私たち、どれくらい合わないか診断してみない？";
      window.open(
        `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
        "_blank",
      );
    } catch (e) {
      console.error("Failed to build invite link", e);
    }
  };

  const selfType = findExtended(profile?.diagnosis_type_id);
  const worstTypes = useMemo(
    () =>
      (selfType?.badCompatibleTypes ?? [])
        .map((id) => findExtended(id))
        .filter((t): t is ExtendedPersonalityTypeDefinition => Boolean(t)),
    [selfType],
  );

  const caution = worstTypes[0]
    ? `${worstTypes[0].typeName}と密閉空間に置かないこと`
    : "診断を受けると注意事項が刻印されます";
  const unreadCount = notifications.filter((n) => !n.read).length;
  const visibleHistory = showAllHistory ? history : history.slice(0, 3);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-ink">
        <div className="w-[200px] overflow-hidden rounded-full">
          <div className="animate-marquee h-[10px] w-[400%] bg-hazard-sm" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink text-white">
      {/* ヒーロー: 危険物取扱者カード */}
      <section
        className="bg-[radial-gradient(120%_90%_at_50%_-10%,rgba(255,46,116,.2),transparent_60%)] px-5.5 pb-[26px] pt-7"
        style={{ containerType: "inline-size" }}
      >
        <div className="mx-auto grid max-w-[1120px] items-center gap-6 md:grid-cols-2">
          <HazardLicenseCard
            typeName={selfType?.typeName ?? "取扱区分 未判定"}
            catchphrase={selfType?.catchphrase ?? "診断すると判定されます"}
            caution={caution}
            cardNo={formatCardNo(profile?.diagnosis_type_id)}
            since={formatYearMonth(profile?.created_at ?? user?.created_at)}
          />
          <div>
            <div className="text-[11px] font-black tracking-[0.24em] text-hazard">MEMBER CARD</div>
            <h1 className="mt-3 text-[clamp(24px,3.6cqw,36px)] font-black leading-[1.35] tracking-[-0.02em]">
              あなたの取扱区分
            </h1>
            <p className="mt-3 max-w-[30em] text-[13px] leading-8 text-txt-muted">
              ドラッグで回転します。診断を受け直すと区分と注意事項が更新されます。
            </p>
            <div className="mt-[18px] flex flex-wrap gap-[9px]">
              {selfType && (
                <a
                  href={`/api/og?type=${selfType.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-[48px] items-center rounded-full bg-hazard px-5 text-[13px] font-black text-ink transition-colors hover:bg-white"
                >
                  カードを保存
                </a>
              )}
              <Link
                href="/diagnosis/select"
                className="flex min-h-[48px] items-center rounded-full border border-[#29303f] px-5 text-[13px] font-bold text-txt-muted transition-colors hover:border-primary hover:text-white"
              >
                診断を受け直す
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* カードグリッド */}
      <section className="px-5.5 pb-[34px] pt-2">
        <div className="mx-auto grid max-w-[1120px] items-start gap-3.5 md:grid-cols-2">
          {/* 診断履歴 */}
          <div className="rounded-[18px] border border-line bg-surface p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black tracking-[0.2em] text-txt-muted">
                診断履歴
              </span>
              {historyTotal > 3 && (
                <button
                  type="button"
                  onClick={() => setShowAllHistory((prev) => !prev)}
                  className="text-[11px] font-black text-hazard hover:text-white"
                >
                  {showAllHistory ? "閉じる" : "すべて"}
                </button>
              )}
            </div>
            <div className="mt-4 flex flex-col gap-2.5">
              {visibleHistory.length === 0 && (
                <p className="text-xs text-txt-subtle">まだ診断履歴がありません。</p>
              )}
              {visibleHistory.map((entry, i) => (
                <div
                  key={entry.id}
                  className={`flex items-center gap-3 rounded-input border border-line-soft bg-panel px-3.5 py-[13px] ${
                    i > 0 ? "opacity-[.65]" : ""
                  }`}
                >
                  <div
                    className={`h-2 w-2 flex-none rounded-full ${i === 0 ? "bg-primary" : "bg-txt-disabled"}`}
                  />
                  <div className="flex-1">
                    <div className="text-[13px] font-black">{entry.typeName ?? "不明なタイプ"}</div>
                    <div className="mt-[2px] text-[10px] text-txt-subtle">
                      {formatDate(entry.completedAt)} ／{" "}
                      {entry.mode === "light" ? "ライト10問" : "スタンダード40問"}
                    </div>
                  </div>
                  <Link
                    href="/result"
                    className={`flex-none text-[11px] font-black ${i === 0 ? "text-hazard" : "text-txt-subtle"} hover:text-white`}
                  >
                    結果
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* お知らせ */}
          <div className="rounded-[18px] border border-line bg-surface p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black tracking-[0.2em] text-txt-muted">
                お知らせ
              </span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary px-2 py-[3px] text-[10px] font-black text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="mt-4 flex flex-col gap-3">
              {notifications.length === 0 && (
                <p className="text-xs text-txt-subtle">お知らせはまだありません。</p>
              )}
              {notifications.slice(0, 5).map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleNotificationRead(notification.id, notification.read)}
                  className="flex gap-[11px] text-left"
                >
                  <span
                    className={`mt-1.5 h-[7px] w-[7px] flex-none rounded-full ${
                      notification.read ? "bg-[#2a3348]" : "bg-primary"
                    }`}
                  />
                  <span className={notification.read ? "opacity-60" : ""}>
                    <span className="block text-[12.5px] font-bold leading-relaxed">
                      {notification.title}
                    </span>
                    <span className="mt-[3px] block text-[10px] text-txt-subtle">
                      {formatDate(notification.scheduled_at)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 友達を招待 */}
          <div className="rounded-[18px] border border-[#1e3557] bg-[linear-gradient(160deg,#0b1f3a,#0d111b)] p-5">
            <span className="text-[11px] font-black tracking-[0.2em] text-[#8fa2c0]">
              友達を招待
            </span>
            <p className="mt-3 text-[12.5px] leading-[1.95] text-txt-muted">
              2人の「合わなさ」を判定します。仲がいいほど盛り上がります。
            </p>
            <div className="mt-3.5 flex items-center gap-2 rounded-input border border-dashed border-[#2a3348] bg-ink px-3.5 py-3">
              <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xs text-txt-muted">
                {copied ? "コピーしました！" : "あなた専用の招待リンク"}
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-none rounded-chip bg-hazard px-3 py-[7px] text-[11px] font-black text-ink transition-colors hover:bg-white"
              >
                コピー
              </button>
            </div>
            <button
              type="button"
              onClick={handleLineShare}
              className="mt-2.5 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-input bg-linegreen text-[13px] font-black text-white transition-opacity hover:opacity-90"
            >
              LINEで送る
            </button>
          </div>

          {/* あなたの地雷リスト */}
          <div className="rounded-[18px] border border-line bg-surface p-5">
            <span className="text-[11px] font-black tracking-[0.2em] text-txt-muted">
              あなたの地雷リスト
            </span>
            <div className="mt-4 flex flex-col gap-2">
              {worstTypes.length === 0 && (
                <p className="text-xs text-txt-subtle">診断を受けると地雷リストが作成されます。</p>
              )}
              {worstTypes.slice(0, 3).map((type, i) => (
                <div
                  key={type.id}
                  className={`flex items-center gap-2.5 rounded-[11px] border px-[13px] py-[11px] ${
                    i === 0 ? "border-dangerline bg-dangerbg" : "border-line-soft bg-panel"
                  }`}
                >
                  <span
                    className={`flex-none text-[11px] font-black ${i === 0 ? "text-primary" : "text-txt-subtle"}`}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 text-[12.5px] font-bold">{type.typeName}</span>
                  <Link
                    href="/coaching"
                    className="flex-none text-[10px] font-black text-hazard hover:text-white"
                  >
                    攻略
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* 設定 */}
          <div className="rounded-[18px] border border-line bg-surface p-5 md:col-span-2">
            <span className="text-[11px] font-black tracking-[0.2em] text-txt-muted">設定</span>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[12.5px] font-bold">運命モード（いたずら）</div>
                  <div className="mt-[2px] text-[10px] text-txt-subtle">
                    招待した相手の結果に自分を1位表示
                  </div>
                </div>
                <Switch checked={prankActive} onCheckedChange={handlePrankToggle} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[12.5px] font-bold">お知らせメール</div>
                  <div className="mt-[2px] text-[10px] text-txt-subtle">新機能・タイプ別の配信</div>
                </div>
                <Switch checked={newsletterEnabled} onCheckedChange={handleNewsletterToggle} />
              </div>
              <div className="flex items-center justify-end">
                <Link
                  href="/profile/edit"
                  className="flex min-h-[44px] items-center rounded-full border border-line px-5 text-xs font-bold text-txt-muted transition-colors hover:border-primary hover:text-white"
                >
                  プロフィールを編集
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PR / レコメンド枠 */}
      <section className="border-t border-line-soft bg-panel px-5.5 py-5.5">
        <div className="mx-auto max-w-[1120px]">
          <RecommendationsSection togelType={profile?.diagnosis_type_id ?? null} page="mypage" />
        </div>
      </section>
    </div>
  );
}
