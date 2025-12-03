"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Coins, CreditCard, History, Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Wallet = { balance: number; pending_balance: number };
type PointPackage = {
  id: string;
  name: string;
  description: string | null;
  amount_usd: number;
  currency: string;
  points: number;
  bonus_points: number;
};

type PointOrder = {
  id: string;
  amount: number;
  currency: string;
  points: number;
  status: string;
  created_at: string;
  payment_order_id: string | null;
};

type PointTransaction = {
  id: string;
  transaction_type: string;
  reason: string;
  points: number;
  balance_after: number;
  created_at: string;
};

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  pending: { label: "準備中", tone: "bg-slate-100 text-slate-600" },
  opened: { label: "決済待ち", tone: "bg-amber-50 text-amber-700" },
  closed: { label: "完了", tone: "bg-emerald-50 text-emerald-700" },
  rejected: { label: "拒否", tone: "bg-rose-50 text-rose-700" },
  expired: { label: "期限切れ", tone: "bg-gray-100 text-gray-500" },
  refunded: { label: "返金", tone: "bg-purple-50 text-purple-700" },
  canceled: { label: "キャンセル", tone: "bg-gray-100 text-gray-500" },
};

const REASON_LABELS: Record<string, { label: string; tone: string }> = {
  purchase: { label: "購入", tone: "text-emerald-600" },
  diagnosis: { label: "診断利用", tone: "text-rose-600" },
  bonus: { label: "ボーナス", tone: "text-purple-600" },
  refund: { label: "返金", tone: "text-amber-600" },
  admin_adjustment: { label: "調整", tone: "text-slate-600" },
  other: { label: "その他", tone: "text-slate-500" },
};

const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat("ja-JP", { style: "currency", currency }).format(amount);

const formatDateTime = (value: string) => new Date(value).toLocaleString("ja-JP", { hour12: false });

const fetchJson = async (input: RequestInfo, init?: RequestInit) => {
  const res = await fetch(input, init);
  if (!res.ok) {
    const error = new Error("Request failed");
    (error as Error & { status?: number }).status = res.status;
    throw error;
  }
  return res.json();
};

export default function PointsPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [packages, setPackages] = useState<PointPackage[]>([]);
  const [orders, setOrders] = useState<PointOrder[]>([]);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [ordersMeta, setOrdersMeta] = useState({ page: 1, totalPages: 1 });
  const [transactionsMeta, setTransactionsMeta] = useState({ page: 1, totalPages: 1 });
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const loadSummary = async () => {
    try {
      setLoadingSummary(true);
      const json = await fetchJson("/api/points/summary");
      setWallet(json.wallet);
      setPackages(json.packages ?? []);
    } catch (err) {
      console.error(err);
      if ((err as Error & { status?: number }).status === 401) {
        setUnauthorized(true);
      } else {
        setError("ポイント情報の取得に失敗しました");
      }
    } finally {
      setLoadingSummary(false);
    }
  };

  const loadOrders = async (page: number) => {
    setOrdersLoading(true);
    try {
      const json = await fetchJson(`/api/points/orders?page=${page}`);
      setOrders((prev) => (page === 1 ? json.orders : [...prev, ...json.orders]));
      setOrdersMeta({ page, totalPages: json.meta?.totalPages ?? 1 });
    } catch (err) {
      console.error(err);
      setError("購入履歴の取得に失敗しました");
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadTransactions = async (page: number) => {
    setTransactionsLoading(true);
    try {
      const json = await fetchJson(`/api/points/transactions?page=${page}`);
      setTransactions((prev) => (page === 1 ? json.transactions : [...prev, ...json.transactions]));
      setTransactionsMeta({ page, totalPages: json.meta?.totalPages ?? 1 });
    } catch (err) {
      console.error(err);
      setError("ポイント履歴の取得に失敗しました");
    } finally {
      setTransactionsLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
    loadOrders(1);
    loadTransactions(1);
  }, []);

  const handleCheckout = async (packageId: string) => {
    try {
      setCheckoutLoading(packageId);
      const json = await fetchJson("/api/points/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });
      if (json.checkoutUrl) {
        window.location.href = json.checkoutUrl;
      }
    } catch (err) {
      console.error(err);
      alert("決済ページの生成に失敗しました");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const balanceDisplay = useMemo(() => wallet?.balance ?? 0, [wallet]);

  if (unauthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white border border-slate-100 rounded-3xl p-8 text-center space-y-4">
          <h1 className="text-xl font-bold text-slate-900">ログインが必要です</h1>
          <p className="text-sm text-slate-500">ポイントページにアクセスするにはサインインしてください。</p>
          <Button asChild>
            <a href="/login">ログインページへ</a>
          </Button>
        </div>
      </div>
    );
  }

  if (loadingSummary && !wallet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#E91E63]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="container max-w-5xl px-4 lg:px-0 space-y-10">
        <div className="flex flex-col gap-4">
          <p className="text-sm font-semibold uppercase tracking-[0.4em] text-slate-400">Point Wallet</p>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-slate-900">ポイント管理センター</h1>
              <p className="text-slate-500 text-sm mt-2">残高確認・購入・履歴をひとまとめに</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-6 py-4 text-right">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">残高</p>
              <p className="text-3xl font-black text-slate-900">{balanceDisplay.toLocaleString()} pt</p>
              {wallet?.pending_balance ? (
                <p className="text-xs text-amber-600 mt-1">保留中 {wallet.pending_balance.toLocaleString()} pt</p>
              ) : null}
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 text-rose-700 px-4 py-3 text-sm">{error}</div>
        )}

        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {packages.map((pkg) => (
            <div key={pkg.id} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">プラン</p>
                  <h3 className="text-xl font-bold text-slate-900">{pkg.name}</h3>
                </div>
                <div className="rounded-full bg-pink-50 text-[#E91E63] px-3 py-1 text-xs font-semibold">{formatCurrency(pkg.amount_usd, pkg.currency)}</div>
              </div>
              <p className="text-sm text-slate-500 flex-1">{pkg.description ?? ""}</p>
              <div>
                <p className="text-2xl font-black text-slate-900">{pkg.points.toLocaleString()} pt</p>
                {pkg.bonus_points > 0 && (
                  <p className="text-xs text-emerald-600 font-semibold">+{pkg.bonus_points.toLocaleString()} pt ボーナス</p>
                )}
              </div>
              <Button
                className="w-full"
                onClick={() => handleCheckout(pkg.id)}
                disabled={checkoutLoading === pkg.id}
              >
                {checkoutLoading === pkg.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                <span className="ml-2">決済ページへ</span>
              </Button>
            </div>
          ))}
          {packages.length === 0 && (
            <div className="col-span-full rounded-3xl border border-slate-100 bg-gradient-to-br from-white to-slate-100 p-8 text-center">
              <p className="text-slate-500">選択できるプランが準備中です</p>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Orders</p>
              <h2 className="text-lg font-bold text-slate-900">ポイント購入履歴</h2>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {orders.map((order) => {
              const statusConfig = STATUS_LABELS[order.status] ?? STATUS_LABELS.pending;
              return (
                <div key={order.id} className="py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{formatCurrency(order.amount, order.currency)}</p>
                    <p className="text-xs text-slate-500">{order.points.toLocaleString()} pt • {formatDateTime(order.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn("px-3 py-1 rounded-full text-xs font-semibold", statusConfig.tone)}>{statusConfig.label}</span>
                    {order.payment_order_id && (
                      <span className="text-[11px] text-slate-400">#{order.payment_order_id.slice(-6)}</span>
                    )}
                  </div>
                </div>
              );
            })}
            {orders.length === 0 && <p className="text-center text-sm text-slate-400 py-6">まだ購入履歴がありません</p>}
          </div>
          {ordersMeta.page < ordersMeta.totalPages && (
            <div className="text-center">
              <Button variant="outline" onClick={() => loadOrders(ordersMeta.page + 1)} disabled={ordersLoading}>
                {ordersLoading ? "読み込み中" : "さらに表示"}
              </Button>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <History className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Transactions</p>
              <h2 className="text-lg font-bold text-slate-900">ポイントトランザクション</h2>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {transactions.map((tx) => {
              const reasonConfig = REASON_LABELS[tx.reason] ?? REASON_LABELS.other;
              const sign = tx.transaction_type === "debit" ? "-" : "+";
              const tone = tx.transaction_type === "debit" ? "text-rose-600" : "text-emerald-600";
              return (
                <div key={tx.id} className="py-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className={cn("text-sm font-semibold", tone)}>
                      {sign}
                      {tx.points.toLocaleString()} pt
                    </p>
                    <p className="text-xs text-slate-500">残高 {tx.balance_after.toLocaleString()} pt</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className={cn("text-xs font-semibold", reasonConfig.tone)}>{reasonConfig.label}</p>
                    <p className="text-[11px] text-slate-400">{formatDateTime(tx.created_at)}</p>
                  </div>
                </div>
              );
            })}
            {transactions.length === 0 && <p className="text-center text-sm text-slate-400 py-6">ポイントの動きはまだありません</p>}
          </div>
          {transactionsMeta.page < transactionsMeta.totalPages && (
            <div className="text-center">
              <Button variant="outline" onClick={() => loadTransactions(transactionsMeta.page + 1)} disabled={transactionsLoading}>
                {transactionsLoading ? "読み込み中" : "さらに表示"}
              </Button>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-100 bg-gradient-to-br from-white to-slate-100 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Support</p>
              <h2 className="text-lg font-bold text-slate-900">決済に困ったら</h2>
              <p className="text-sm text-slate-500 mt-1">決済が反映されない場合はサポートが即時対応します。</p>
            </div>
            <Button variant="secondary" className="gap-2" asChild>
              <a href="https://lin.ee/T7OYAGQ" target="_blank" rel="noreferrer">
                <ShieldCheck className="h-4 w-4" />
                <span>お問い合わせ</span>
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
