"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type AdminOverview = {
  metrics: {
    totalRevenue: number;
    pendingAmount: number;
    refundedAmount: number;
    totalPointsSold: number;
    activeOrders: number;
  };
  salesTrend: { date: string; amount: number }[];
  topPackages: { package_id: string; name: string; total_amount: number; total_points: number; closed_orders: number }[];
  recentOrders: AdminOrder[];
};

type AdminOrder = {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  points: number;
  status: string;
  created_at: string;
  payment_order_id?: string | null;
  profile?: { full_name: string | null; nickname: string | null } | null;
};

type AdminTransaction = {
  id: string;
  user_id: string;
  order_id: string | null;
  transaction_type: string;
  reason: string;
  points: number;
  balance_after: number;
  created_at: string;
  profile?: { full_name: string | null; nickname: string | null } | null;
};

const STATUS_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "pending", label: "準備中" },
  { value: "opened", label: "決済待ち" },
  { value: "closed", label: "完了" },
  { value: "refunded", label: "返金" },
  { value: "rejected", label: "拒否" },
  { value: "expired", label: "期限切れ" },
  { value: "canceled", label: "キャンセル" },
];

const REASON_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "purchase", label: "購入" },
  { value: "diagnosis", label: "診断" },
  { value: "bonus", label: "ボーナス" },
  { value: "admin_adjustment", label: "調整" },
  { value: "refund", label: "返金" },
  { value: "other", label: "その他" },
];

const fetchJson = async (input: RequestInfo, init?: RequestInit) => {
  const res = await fetch(input, init);
  if (!res.ok) throw new Error("Request failed");
  return res.json();
};

export default function AdminPointsPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [ordersStatus, setOrdersStatus] = useState("all");
  const [ordersSearch, setOrdersSearch] = useState("");
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotalPages, setOrdersTotalPages] = useState(1);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [transactionsFilter, setTransactionsFilter] = useState({ reason: "all", type: "all" });
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [transactionsTotalPages, setTransactionsTotalPages] = useState(1);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [adjustForm, setAdjustForm] = useState({ userId: "", points: "", direction: "credit", note: "" });
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = async () => {
    setOverviewLoading(true);
    try {
      const json = await fetchJson("/api/admin/points/overview");
      setOverview(json);
    } catch (err) {
      console.error(err);
      setError("売上ダッシュボードの取得に失敗しました");
    } finally {
      setOverviewLoading(false);
    }
  };

  const loadOrders = async (page = 1) => {
    setOrdersLoading(true);
    try {
      const params = new URLSearchParams();
      if (ordersStatus !== "all") params.set("status", ordersStatus);
      if (ordersSearch) params.set("search", ordersSearch);
      params.set("page", String(page));
      const json = await fetchJson(`/api/admin/points/orders?${params.toString()}`);
      setOrders(json.orders ?? []);
      setOrdersPage(page);
      setOrdersTotalPages(json.meta?.totalPages ?? 1);
    } catch (err) {
      console.error(err);
      setError("購入履歴の取得に失敗しました");
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadTransactions = async (page = 1) => {
    setTransactionsLoading(true);
    try {
      const params = new URLSearchParams();
      if (transactionsFilter.reason !== "all") params.set("reason", transactionsFilter.reason);
      if (transactionsFilter.type !== "all") params.set("type", transactionsFilter.type);
      params.set("page", String(page));
      const json = await fetchJson(`/api/admin/points/transactions?${params.toString()}`);
      setTransactions(json.transactions ?? []);
      setTransactionsPage(page);
      setTransactionsTotalPages(json.meta?.totalPages ?? 1);
    } catch (err) {
      console.error(err);
      setError("トランザクションの取得に失敗しました");
    } finally {
      setTransactionsLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
    loadOrders(1);
    loadTransactions(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      await fetchJson(`/api/admin/points/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status } : order)));
      loadOverview();
    } catch (err) {
      console.error(err);
      alert("ステータス更新に失敗しました");
    }
  };

  const handleAdjustSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!adjustForm.userId || !adjustForm.points) return;
    setAdjustLoading(true);
    try {
      await fetchJson("/api/admin/points/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: adjustForm.userId,
          points: Number(adjustForm.points),
          direction: adjustForm.direction,
          reason: "admin_adjustment",
          note: adjustForm.note,
        }),
      });
      setAdjustForm({ userId: "", points: "", direction: adjustForm.direction, note: "" });
      loadTransactions(transactionsPage);
      loadOverview();
    } catch (err) {
      console.error(err);
      alert("ポイント調整に失敗しました");
    } finally {
      setAdjustLoading(false);
    }
  };

  const metrics = overview?.metrics;
  const salesTrend = overview?.salesTrend ?? [];
  const topPackages = overview?.topPackages ?? [];

  const salesSummary = useMemo(() => {
    if (!metrics) return null;
    return [
      { label: "累計売上", value: metrics.totalRevenue, prefix: "USD" },
      { label: "未決済", value: metrics.pendingAmount, tone: "text-amber-600" },
      { label: "返金済み", value: metrics.refundedAmount, tone: "text-purple-600" },
    ];
  }, [metrics]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">ポイント決済の状況をリアルタイムで把握</p>
          <h1 className="text-2xl font-black text-slate-900">ポイント売上ダッシュボード</h1>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => { loadOverview(); loadOrders(ordersPage); loadTransactions(transactionsPage); }}>
          {overviewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          再読込
        </Button>
      </div>

      {error && <div className="rounded-2xl border border-rose-100 bg-rose-50 text-rose-700 px-4 py-3 text-sm">{error}</div>}

      <div className="grid gap-4 md:grid-cols-5">
        <div className="md:col-span-2 bg-white border rounded-2xl p-5 shadow-sm space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">売上サマリー</p>
          {salesSummary?.map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{item.label}</span>
              <span className={cn("text-xl font-black", item.tone)}>
                ${item.value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between text-sm text-slate-500 pt-2 border-t border-slate-100">
            <span>販売ポイント</span>
            <span className="font-bold text-slate-900">{metrics?.totalPointsSold?.toLocaleString()} pt</span>
          </div>
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>アクティブ注文</span>
            <span className="font-bold text-slate-900">{metrics?.activeOrders ?? 0} 件</span>
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-3 md:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">直近30日の売上推移</p>
          <div className="space-y-2 max-h-52 overflow-y-auto pr-2">
            {salesTrend.length === 0 && <p className="text-sm text-slate-400">まだデータがありません</p>}
            {salesTrend.map((item) => (
              <div key={item.date} className="flex items-center justify-between text-sm">
                <span className="text-slate-500">{item.date}</span>
                <span className="font-semibold text-slate-900">${item.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white border rounded-2xl p-5 shadow-sm md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Top Packages</p>
              <h2 className="text-lg font-bold text-slate-900">売れ筋パッケージ</h2>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {topPackages.length === 0 && <p className="text-sm text-slate-400 py-6">データがありません</p>}
            {topPackages.map((pkg) => (
              <div key={pkg.package_id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{pkg.name}</p>
                  <p className="text-xs text-slate-500">{pkg.closed_orders} 件 / {pkg.total_points.toLocaleString()} pt</p>
                </div>
                <p className="text-sm font-bold text-slate-900">${pkg.total_amount.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Manual Adjust</p>
            <h2 className="text-lg font-bold text-slate-900">ポイント手動調整</h2>
            <p className="text-xs text-slate-500 mt-1">緊急対応や特別付与に使用</p>
          </div>
          <form className="space-y-3" onSubmit={handleAdjustSubmit}>
            <Input
              placeholder="ユーザーID"
              value={adjustForm.userId}
              onChange={(e) => setAdjustForm((prev) => ({ ...prev, userId: e.target.value }))}
              required
            />
            <div className="flex gap-3">
              <Input
                placeholder="ポイント"
                type="number"
                min={1}
                value={adjustForm.points}
                onChange={(e) => setAdjustForm((prev) => ({ ...prev, points: e.target.value }))}
                required
              />
              <Select
                value={adjustForm.direction}
                onValueChange={(value) => setAdjustForm((prev) => ({ ...prev, direction: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">付与</SelectItem>
                  <SelectItem value="debit">減算</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea
              placeholder="メモ"
              value={adjustForm.note}
              onChange={(e) => setAdjustForm((prev) => ({ ...prev, note: e.target.value }))}
              rows={3}
            />
            <Button type="submit" className="w-full" disabled={adjustLoading}>
              {adjustLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "ポイントを反映"}
            </Button>
          </form>
        </div>
      </div>

      <section className="bg-white border rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Orders</p>
            <h2 className="text-lg font-bold text-slate-900">購入履歴</h2>
          </div>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex gap-2">
              <Select value={ordersStatus} onValueChange={(value) => { setOrdersStatus(value); loadOrders(1); }}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="ステータス" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="注文ID検索"
                value={ordersSearch}
                onChange={(e) => setOrdersSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    loadOrders(1);
                  }
                }}
              />
            </div>
            <Button variant="secondary" onClick={() => loadOrders(1)} disabled={ordersLoading}>
              {ordersLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "検索"}
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="py-2">ユーザー</th>
                <th>金額</th>
                <th>ポイント</th>
                <th>状況</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="py-3">
                    <p className="font-semibold text-slate-900">{order.profile?.full_name || order.profile?.nickname || order.user_id.slice(0, 8)}</p>
                    <p className="text-xs text-slate-400">#{order.id.slice(-6)}</p>
                  </td>
                  <td>{`$${order.amount.toFixed(2)}`}</td>
                  <td>{order.points.toLocaleString()} pt</td>
                  <td className="capitalize">{order.status}</td>
                  <td>
                    <Select value={order.status} onValueChange={(value) => handleUpdateStatus(order.id, value)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.filter((option) => option.value !== "all").map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && <p className="text-center text-sm text-slate-400 py-6">データがありません</p>}
        </div>
        <div className="flex justify-end gap-2 text-sm text-slate-500">
          <span>
            {ordersPage}/{ordersTotalPages}
          </span>
          <Button variant="outline" size="sm" disabled={ordersPage <= 1} onClick={() => loadOrders(ordersPage - 1)}>
            ←
          </Button>
          <Button variant="outline" size="sm" disabled={ordersPage >= ordersTotalPages} onClick={() => loadOrders(ordersPage + 1)}>
            →
          </Button>
        </div>
      </section>

      <section className="bg-white border rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Transactions</p>
            <h2 className="text-lg font-bold text-slate-900">ポイントトランザクション</h2>
          </div>
          <div className="flex gap-2">
            <Select value={transactionsFilter.reason} onValueChange={(value) => { setTransactionsFilter((prev) => ({ ...prev, reason: value })); loadTransactions(1); }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="種別" />
              </SelectTrigger>
              <SelectContent>
                {REASON_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={transactionsFilter.type} onValueChange={(value) => { setTransactionsFilter((prev) => ({ ...prev, type: value })); loadTransactions(1); }}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="方向" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="credit">付与</SelectItem>
                <SelectItem value="debit">減算</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="py-2">ユーザー</th>
                <th>ポイント</th>
                <th>理由</th>
                <th>残高</th>
                <th>日時</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td className="py-3">
                    <p className="font-semibold text-slate-900">{tx.profile?.full_name || tx.profile?.nickname || tx.user_id.slice(0, 8)}</p>
                    <p className="text-xs text-slate-400">#{tx.id.slice(-6)}</p>
                  </td>
                  <td className={cn("font-bold", tx.transaction_type === "debit" ? "text-rose-600" : "text-emerald-600")}>{tx.transaction_type === "debit" ? "-" : "+"}{tx.points.toLocaleString()} pt</td>
                  <td className="capitalize">{tx.reason}</td>
                  <td>{tx.balance_after.toLocaleString()} pt</td>
                  <td>{new Date(tx.created_at).toLocaleString("ja-JP", { hour12: false })}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 && <p className="text-center text-sm text-slate-400 py-6">データがありません</p>}
        </div>
        <div className="flex justify-end gap-2 text-sm text-slate-500">
          <span>
            {transactionsPage}/{transactionsTotalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={transactionsPage <= 1 || transactionsLoading}
            onClick={() => loadTransactions(transactionsPage - 1)}
          >
            ←
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={transactionsPage >= transactionsTotalPages || transactionsLoading}
            onClick={() => loadTransactions(transactionsPage + 1)}
          >
            →
          </Button>
        </div>
      </section>
    </div>
  );
}
