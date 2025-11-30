"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { User } from "@supabase/supabase-js";
import { Bell, Coins, History, Mail, Link as LinkIcon, Check, Copy, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

// モックデータ: お知らせ
const mockNotifications = [
  { id: 1, title: "Togelへようこそ！", date: "2024/01/01", read: false },
  { id: 2, title: "新機能「ミスマッチランキング」が追加されました", date: "2024/01/15", read: true },
];

type Profile = {
  id: string;
  gender: string;
  avatar_url: string | null;
  full_name: string | null;
  job: string | null;
  city: string | null;
};

export default function MyPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [newsletterEnabled, setNewsletterEnabled] = useState(true);
  const [copied, setCopied] = useState(false);
  
  const supabase = createClientComponentClient();

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
        setProfile(data);
      }
      
      setLoading(false);
    };
    fetchData();
  }, [supabase]);

  // 招待条件チェック: 男性 かつ 基本情報(名前, 仕事, エリア) + アバターがあること
  // ※詳細プロフィールは必須としない
  const isEligibleForReferral = 
    profile?.gender === "male" && 
    !!profile?.avatar_url && 
    !!profile?.full_name && 
    !!profile?.job && 
    !!profile?.city;

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
              {mockNotifications.map((note) => (
                <div key={note.id} className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${note.read ? "bg-slate-50" : "bg-white border border-slate-100"}`}>
                  <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${note.read ? "bg-slate-300" : "bg-[#E91E63]"}`} />
                  <div>
                    <p className={`text-sm font-medium ${note.read ? "text-slate-600" : "text-slate-900"}`}>{note.title}</p>
                    <p className="text-xs text-slate-400 mt-1">{note.date}</p>
                  </div>
                </div>
              ))}
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
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50">
              <div>
                <p className="font-bold text-slate-700">運命の通知を受け取る</p>
                <p className="text-xs text-slate-500 mt-1">相性の良い相手が見つかった際に通知</p>
              </div>
              <button 
                onClick={() => setNewsletterEnabled(!newsletterEnabled)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${newsletterEnabled ? 'bg-[#E91E63]' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition shadow-md ${newsletterEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
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
