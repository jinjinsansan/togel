"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Briefcase,
  CalendarClock,
  Check,
  ClipboardCopy,
  Globe,
  Link as LinkIcon,
  Loader2,
  MapPin,
  NotebookPen,
  RefreshCw,
  Search,
  ShieldOff,
  ShieldCheck,
  Target,
  UserCheck,
  UserMinus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type AdminUser = {
  id: string;
  fullName?: string | null;
  nickname?: string | null;
  gender?: string | null;
  city?: string | null;
  job?: string | null;
  age?: number | null;
  avatarUrl?: string | null;
  isPublic?: boolean | null;
  diagnosisTypeId?: string | null;
  notificationSettings: Record<string, unknown>;
  socialLinks: Record<string, unknown>;
  details: Record<string, unknown>;
  userCreatedAt?: string | null;
  profileUpdatedAt?: string | null;
  status: "active" | "blocked" | "deleted";
  isBlocked: boolean;
  blockedReason?: string | null;
  blockedAt?: string | null;
  isDeleted: boolean;
  deletedAt?: string | null;
  adminNotes?: string | null;
  lineUserId?: string | null;
  isMock?: boolean;
  stats: {
    totalDiagnoses: number;
    lastDiagnosisAt: string | null;
    lastDiagnosisType: string | null;
  };
  featured: { targetGender: string; startAt: string; endAt: string; isActive: boolean } | null;
};

type Metrics = {
  totalUsers: number;
  blockedUsers: number;
  deletedUsers: number;
  newThisWeek: number;
};

type Meta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const formatDate = (value?: string | null, options?: Intl.DateTimeFormatOptions) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("ja-JP", options);
};

const StatusBadge = ({ status }: { status: AdminUser["status"] }) => {
  const config: Record<AdminUser["status"], { label: string; className: string }> = {
    active: { label: "アクティブ", className: "bg-emerald-50 text-emerald-700 border border-emerald-100" },
    blocked: { label: "ブロック中", className: "bg-amber-50 text-amber-700 border border-amber-100" },
    deleted: { label: "停止中", className: "bg-rose-50 text-rose-700 border border-rose-100" },
  };

  return (
    <span className={cn("px-2 py-0.5 text-xs font-semibold rounded-full", config[status].className)}>
      {config[status].label}
    </span>
  );
};

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({ totalUsers: 0, blockedUsers: 0, deletedUsers: 0, newThisWeek: 0 });
  const [meta, setMeta] = useState<Meta>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({
    search: "",
    gender: "all",
    status: "active",
    diagnosisStatus: "all",
    sort: "recent",
  });
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [actionLoading, setActionLoading] = useState<"block" | "delete" | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const selectedUserRef = useRef<string | null>(null);
  useEffect(() => {
    selectedUserRef.current = selectedUserId;
  }, [selectedUserId]);

  const fetchUsers = useCallback(
    async (opts?: { silent?: boolean }) => {
      try {
        if (opts?.silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const params = new URLSearchParams({
          page: String(meta.page),
          limit: String(meta.limit),
          search: filters.search,
          gender: filters.gender,
          status: filters.status,
          diagnosisStatus: filters.diagnosisStatus,
          sort: filters.sort,
        });

        const res = await fetch(`/api/admin/users?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch users");

        const json = await res.json();
        setUsers(json.users ?? []);
        setMetrics((prev) => json.metrics ?? prev);
        setMeta((prev) => ({ ...prev, total: json.meta?.total ?? prev.total, totalPages: json.meta?.totalPages ?? prev.totalPages }));

        const prevSelected = selectedUserRef.current;
        if (json.users?.length) {
          const stillExists = prevSelected && json.users.some((user: AdminUser) => user.id === prevSelected);
          const nextId = stillExists ? prevSelected : json.users[0].id;
          setSelectedUserId(nextId);
          const current = json.users.find((user: AdminUser) => user.id === nextId);
          setNotesDraft(current?.adminNotes ?? "");
        } else {
          setSelectedUserId(null);
          setNotesDraft("");
        }
      } catch (error) {
        console.error(error);
        alert("ユーザー情報の取得に失敗しました");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filters, meta.limit, meta.page]
  );

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const selectedUser = useMemo(() => users.find((user) => user.id === selectedUserId) || null, [users, selectedUserId]);

  useEffect(() => {
    setNotesDraft(selectedUser?.adminNotes ?? "");
  }, [selectedUser?.id, selectedUser?.adminNotes]);

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setMeta((prev) => ({ ...prev, page: 1 }));
  };

  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, search: searchInput }));
    setMeta((prev) => ({ ...prev, page: 1 }));
  };

  const applyUserPatch = (id: string, patch: Partial<AdminUser>) => {
    setUsers((prev) => prev.map((user) => (user.id === id ? { ...user, ...patch } : user)));
  };

  const callUserAction = async (action: "block" | "unblock" | "delete" | "restore" | "notes", payload?: Record<string, unknown>) => {
    if (!selectedUser) return;
    if (action === "notes") {
      setSavingNotes(true);
    } else if (action === "block" || action === "unblock") {
      setActionLoading("block");
    } else {
      setActionLoading("delete");
    }

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload })
      });

      if (!res.ok) throw new Error("Failed to update");
      const json = await res.json();

      applyUserPatch(selectedUser.id, {
        isBlocked: json.user.is_blocked,
        blockedReason: json.user.blocked_reason,
        blockedAt: json.user.blocked_at,
        isDeleted: json.user.is_deleted,
        deletedAt: json.user.deleted_at,
        adminNotes: json.user.admin_notes,
        status: json.user.is_deleted ? "deleted" : json.user.is_blocked ? "blocked" : "active",
      });

      if (action === "notes") {
        alert("ノートを保存しました");
      } else if (action === "block") {
        alert("ユーザーをブロックしました");
      } else if (action === "unblock") {
        alert("ブロックを解除しました");
      } else if (action === "delete") {
        alert("ユーザーを停止しました (ソフト削除)");
      } else if (action === "restore") {
        alert("ユーザーを復元しました");
      }
    } catch (error) {
      console.error(error);
      alert("操作に失敗しました");
    } finally {
      setSavingNotes(false);
      setActionLoading(null);
    }
  };

  const handleBlockToggle = async () => {
    if (!selectedUser) return;
    if (!selectedUser.isBlocked) {
      const reason = prompt("ブロック理由を入力してください", selectedUser.blockedReason || "");
      if (reason === null) return;
      await callUserAction("block", { reason });
    } else {
      if (!confirm("ブロックを解除しますか？")) return;
      await callUserAction("unblock");
    }
  };

  const handleDeleteToggle = async () => {
    if (!selectedUser) return;
    if (!selectedUser.isDeleted) {
      if (!confirm("このユーザーを停止しますか？\n関連データは保持されます。")) return;
      await callUserAction("delete");
    } else {
      if (!confirm("このユーザーを復元しますか？")) return;
      await callUserAction("restore");
    }
  };

  const handleNotesSave = async () => {
    await callUserAction("notes", { notes: notesDraft });
  };

  const handleCopyProfileLink = async () => {
    if (!selectedUser) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/profile/${selectedUser.id}`);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error(error);
    }
  };

  const notificationFlags = (selectedUser?.notificationSettings || {}) as Record<string, boolean>;
  const socialEntries = Object.entries(selectedUser?.socialLinks || {})
    .filter(([, value]) => typeof value === "string" && value.length > 0)
    .map(([key, value]) => [key, value as string]);

  const profileDetails = (selectedUser?.details || {}) as Record<string, string>;
  const detailFields: { key: string; label: string; value?: string | null }[] = [
    { key: "favoriteThings", label: "好きなもの", value: profileDetails.favoriteThings },
    { key: "hobbies", label: "趣味", value: profileDetails.hobbies },
    { key: "specialSkills", label: "得意なこと", value: profileDetails.specialSkills },
    { key: "values", label: "価値観", value: profileDetails.values },
    { key: "communication", label: "コミュニケーション", value: profileDetails.communication },
  ];

  const statusSummary = `${meta.total.toLocaleString()}件`; 

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">リアルタイムユーザー統計</p>
          <h1 className="text-2xl font-black text-slate-900">ユーザー管理ダッシュボード</h1>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => fetchUsers({ silent: true })} disabled={refreshing}>
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          更新
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[{
            label: "総ユーザー",
            value: metrics.totalUsers,
            sub: "累計登録数",
            tone: "text-emerald-600",
          },
          {
            label: "今週の新規",
            value: metrics.newThisWeek,
            sub: "直近7日",
            tone: "text-sky-600",
          },
          {
            label: "ブロック中",
            value: metrics.blockedUsers,
            sub: "要対応ユーザー",
            tone: "text-amber-600",
          },
          {
            label: "停止中",
            value: metrics.deletedUsers,
            sub: "ソフト削除済み",
            tone: "text-rose-600",
          }].map((card) => (
          <div key={card.label} className="bg-white border rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{card.label}</p>
            <p className={cn("text-3xl font-black", card.tone)}>{card.value.toLocaleString()}</p>
            <p className="text-xs text-slate-400">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-500 mb-2 block">キーワード検索</label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="名前、エリア、LINE ID など"
                  className="pl-10"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                  }}
                />
              </div>
              <Button variant="secondary" className="gap-2" onClick={handleSearch}>
                <Search className="h-4 w-4" />検索
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 w-full lg:w-auto">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">性別</label>
              <Select value={filters.gender} onValueChange={(value) => handleFilterChange("gender", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="すべて" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="male">男性</SelectItem>
                  <SelectItem value="female">女性</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">ステータス</label>
              <Select value={filters.status} onValueChange={(value) => handleFilterChange("status", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">アクティブ</SelectItem>
                  <SelectItem value="blocked">ブロック中</SelectItem>
                  <SelectItem value="deleted">停止中</SelectItem>
                  <SelectItem value="all">すべて</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">診断ステータス</label>
              <Select value={filters.diagnosisStatus} onValueChange={(value) => handleFilterChange("diagnosisStatus", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="すべて" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="diagnosed">診断済み</SelectItem>
                  <SelectItem value="undiagnosed">未診断</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">並び替え</label>
              <Select value={filters.sort} onValueChange={(value) => handleFilterChange("sort", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">新しい順</SelectItem>
                  <SelectItem value="oldest">古い順</SelectItem>
                  <SelectItem value="activity">活動順</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b bg-slate-50">
              <div>
                <p className="text-sm font-semibold text-slate-700">ユーザー一覧</p>
                <p className="text-xs text-slate-400">{statusSummary} / {meta.totalPages}ページ</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>ページ {meta.page}</span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={meta.page <= 1}
                    onClick={() => setMeta((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  >
                    ‹
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={meta.page >= meta.totalPages}
                    onClick={() => setMeta((prev) => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                  >
                    ›
                  </Button>
                </div>
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">ユーザー</th>
                      <th className="px-4 py-3 text-left font-medium">診断情報</th>
                      <th className="px-4 py-3 text-left font-medium">アクティビティ</th>
                      <th className="px-4 py-3 text-left font-medium">ステータス</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                          読み込み中...
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                          条件に一致するユーザーがいません
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr
                          key={user.id}
                          className={cn("hover:bg-rose-50/60 cursor-pointer", selectedUserId === user.id && "bg-rose-50")}
                          onClick={() => setSelectedUserId(user.id)}
                        >
                          <td className="px-4 py-4 w-[35%]">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 rounded-full border bg-slate-100 overflow-hidden">
                                {user.avatarUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={user.avatarUrl} alt={user.fullName || "avatar"} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-xl">👤</div>
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-slate-900">{user.fullName || user.nickname || "未登録"}</p>
                                  {user.isMock && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">Mock</span>
                                  )}
                                  {user.featured?.isActive && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">PickUp</span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {user.city || "エリア未登録"}
                                  <span>·</span>
                                  <Briefcase className="h-3 w-3" />
                                  {user.job || "職業未登録"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-semibold text-slate-800">{user.diagnosisTypeId || "未診断"}</p>
                            <p className="text-xs text-slate-500">診断回数: {user.stats.totalDiagnoses}</p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm text-slate-700 flex items-center gap-1">
                              <CalendarClock className="h-4 w-4" />
                              {formatDate(user.stats.lastDiagnosisAt, { month: "short", day: "numeric" })}
                            </p>
                            <p className="text-xs text-slate-500">更新: {formatDate(user.profileUpdatedAt, { month: "short", day: "numeric" })}</p>
                          </td>
                          <td className="px-4 py-4">
                            <StatusBadge status={user.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-4 lg:hidden">
              {loading ? (
                <div className="px-4 py-10 text-center text-slate-400 border rounded-2xl">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                  読み込み中...
                </div>
              ) : users.length === 0 ? (
                <div className="px-4 py-10 text-center text-slate-400 border rounded-2xl">
                  条件に一致するユーザーがいません
                </div>
              ) : (
                users.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    className={cn(
                      "w-full text-left rounded-2xl border border-slate-100 bg-white p-4 shadow-sm", 
                      selectedUserId === user.id && "ring-2 ring-primary-light/40"
                    )}
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full border bg-slate-100 overflow-hidden">
                        {user.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={user.avatarUrl} alt={user.fullName || "avatar"} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-xl">👤</div>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 flex items-center gap-2">
                          {user.fullName || user.nickname || "未登録"}
                          {user.isMock && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">Mock</span>
                          )}
                          {user.featured?.isActive && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">PickUp</span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {user.city || "エリア未登録"}
                          <span>·</span>
                          <Briefcase className="h-3 w-3" />
                          {user.job || "職業未登録"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-500">
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-[10px] font-semibold text-slate-400">診断タイプ</p>
                        <p className="text-sm font-bold text-slate-800">{user.diagnosisTypeId || "未診断"}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-[10px] font-semibold text-slate-400">診断回数</p>
                        <p className="text-sm font-bold text-slate-800">{user.stats.totalDiagnoses}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-[10px] font-semibold text-slate-400">最終診断</p>
                        <p className="text-sm font-bold">
                          {formatDate(user.stats.lastDiagnosisAt, { month: "short", day: "numeric" })}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-[10px] font-semibold text-slate-400">更新日</p>
                        <p className="text-sm font-bold">
                          {formatDate(user.profileUpdatedAt, { month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <StatusBadge status={user.status} />
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {user.isPublic ? "公開" : "非公開"}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <div className="bg-white border rounded-2xl shadow-sm p-5">
              {!selectedUser ? (
                <div className="text-center text-slate-400 py-16">
                  <UserCheck className="h-10 w-10 mx-auto mb-4" />
                  ユーザーを選択すると詳細が表示されます
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                      <div className="h-14 w-14 rounded-full border bg-slate-100 overflow-hidden">
                        {selectedUser.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={selectedUser.avatarUrl} alt={selectedUser.fullName || "avatar"} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-2xl">👤</div>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-lg text-slate-900">{selectedUser.fullName || selectedUser.nickname || "未登録"}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <StatusBadge status={selectedUser.status} />
                          <span className="px-2 py-0.5 text-[10px] rounded-full bg-slate-100 text-slate-600">
                            {selectedUser.isPublic ? "公開" : "非公開"}
                          </span>
                          {selectedUser.featured?.isActive && (
                            <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-100 text-amber-600">PickUp掲載中</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {selectedUser.city || "エリア未登録"}
                          <span>·</span>
                          <Briefcase className="h-3 w-3" />
                          {selectedUser.job || "職業未登録"}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleCopyProfileLink} title="プロフィールリンクをコピー">
                      {copySuccess ? <Check className="h-4 w-4 text-emerald-600" /> : <LinkIcon className="h-4 w-4" />}
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl border bg-slate-50">
                      <p className="text-xs text-slate-500">診断回数</p>
                      <p className="text-lg font-black">{selectedUser.stats.totalDiagnoses}</p>
                    </div>
                    <div className="p-3 rounded-xl border bg-slate-50">
                      <p className="text-xs text-slate-500">最終診断</p>
                      <p className="text-sm font-semibold">{formatDate(selectedUser.stats.lastDiagnosisAt)}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                      <Bell className="h-4 w-4" /> 通知設定
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className={cn(
                        "px-2 py-0.5 text-xs rounded-full border",
                        notificationFlags.rank_in !== false ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-100 text-slate-500"
                      )}>
                        ランクイン通知 {notificationFlags.rank_in === false ? "OFF" : "ON"}
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 text-xs rounded-full border",
                        notificationFlags.newsletter !== false ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-100 text-slate-500"
                      )}>
                        運営お知らせ {notificationFlags.newsletter === false ? "OFF" : "ON"}
                      </span>
                    </div>
                  </div>

                  {selectedUser.featured && (
                    <div className="p-3 rounded-xl border border-amber-200 bg-amber-50">
                      <p className="text-xs font-semibold text-amber-700 flex items-center gap-2">
                        <Target className="h-4 w-4" /> PickUp掲載履歴
                      </p>
                      <p className="text-sm text-amber-700 mt-1">
                        {formatDate(selectedUser.featured.startAt, { month: "short", day: "numeric" })} - {formatDate(selectedUser.featured.endAt, { month: "short", day: "numeric" })}
                      </p>
                      <p className="text-xs text-amber-600">対象: {selectedUser.featured.targetGender === "female" ? "女性" : selectedUser.featured.targetGender === "male" ? "男性" : "全員"}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                      <Globe className="h-4 w-4" /> SNS / 連絡先
                    </p>
                    {socialEntries.length === 0 ? (
                      <p className="text-xs text-slate-400">登録されたリンクはありません</p>
                    ) : (
                      <div className="space-y-1 text-sm">
                        {socialEntries.map(([key, value]) => (
                          <a key={key} href={value} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary-light hover:underline">
                            <LinkIcon className="h-3 w-3" />
                            <span className="capitalize">{key}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                      <NotebookPen className="h-4 w-4" /> メモ
                    </p>
                    <Textarea
                      rows={4}
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      placeholder="運用上のメモを残してください"
                    />
                    <Button variant="secondary" className="w-full" disabled={savingNotes} onClick={handleNotesSave}>
                      {savingNotes ? <Loader2 className="h-4 w-4 animate-spin" /> : "保存"}
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <ClipboardCopy className="h-3 w-3" />
                      {selectedUser.lineUserId || "LINE未連携"}
                    </div>
                    <div className="flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" />
                      {formatDate(selectedUser.userCreatedAt, { month: "short", day: "numeric" })}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Button
                      variant={selectedUser.isBlocked ? "outline" : "secondary"}
                      className={cn(!selectedUser.isBlocked ? "bg-rose-500 hover:bg-rose-600 text-white" : "text-amber-600 border-amber-200")}
                      onClick={handleBlockToggle}
                      disabled={actionLoading === "block"}
                    >
                      {actionLoading === "block" ? <Loader2 className="h-4 w-4 animate-spin" /> : selectedUser.isBlocked ? <ShieldCheck className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
                      <span>{selectedUser.isBlocked ? "ブロック解除" : "このユーザーをブロック"}</span>
                    </Button>
                    <Button
                      variant="outline"
                      className={cn(selectedUser.isDeleted ? "border-emerald-200 text-emerald-600" : "border-rose-200 text-rose-600")}
                      onClick={handleDeleteToggle}
                      disabled={actionLoading === "delete"}
                    >
                      {actionLoading === "delete" ? <Loader2 className="h-4 w-4 animate-spin" /> : selectedUser.isDeleted ? <UserCheck className="h-4 w-4" /> : <UserMinus className="h-4 w-4" />}
                      <span>{selectedUser.isDeleted ? "アカウント復元" : "アカウント停止"}</span>
                    </Button>
                    {selectedUser.blockedReason && (
                      <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl p-3">
                        <AlertTriangle className="inline h-3 w-3 mr-1" />
                        ブロック理由: {selectedUser.blockedReason}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                      <Target className="h-4 w-4" /> 詳細プロフィール
                    </p>
                    <div className="space-y-2">
                      {detailFields.map((field) => (
                        <div key={field.key} className="p-3 rounded-xl border bg-slate-50">
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">{field.label}</p>
                          <p className="text-sm text-slate-700 mt-1">{field.value || "未入力"}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
