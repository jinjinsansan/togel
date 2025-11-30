"use client";

import { useState, useEffect, useCallback } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Search, Trash2 } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Profile = {
  id: string;
  nickname: string; // profiles table uses nickname? or full_name? Let's check
  full_name: string;
  avatar_url: string;
  gender: string;
  job: string;
  age: number;
};

type FeaturedUser = {
  id: string;
  user_id: string;
  target_gender: string;
  start_at: string;
  end_at: string;
  active: boolean;
  user?: Profile; // Joined manually
};

export default function FeaturedAdminPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  
  const [featuredList, setFeaturedList] = useState<FeaturedUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [targetGender, setTargetGender] = useState("all");
  const [durationDays, setDurationDays] = useState("7");

  const supabase = createClientComponentClient();

  const fetchFeatured = useCallback(async () => {
    setLoading(true);
    // Fetch featured users
    const { data: featured, error } = await supabase
      .from("featured_users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
    } else {
      // Manually fetch profile details for each featured user
      // because standard join might be tricky if foreign key relation name is not obvious or if RLS blocks
      const userIds = featured.map(f => f.user_id);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles") // Assuming profiles view/table syncs with users
          .select("id, full_name, avatar_url, gender, job") // Check exact columns
          .in("id", userIds);

        // Map profiles to featured
        const list = featured.map(f => ({
          ...f,
          user: profiles?.find(p => p.id === f.user_id)
        }));
        setFeaturedList(list);
      } else {
        setFeaturedList([]);
      }
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void (async () => {
      await fetchFeatured();
    })();
  }, [fetchFeatured]);

  const handleSearch = async () => {
    if (!searchTerm) return;
    setSearching(true);
    
    // Search in profiles table
    // Note: Depending on table structure. If 'nickname' is in public.users and 'full_name' in public.profiles
    // Let's assume public.profiles has full_name
    const { data, error: searchError } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, gender, job")
      .ilike("full_name", `%${searchTerm}%`)
      .limit(10);
      
    if (searchError) {
      console.error(searchError);
    }

    if (data) {
      setSearchResults(data as unknown as Profile[]);
    }
    setSearching(false);
  };

  const handleAddFeatured = async (userId: string) => {
    const startAt = new Date();
    const endAt = new Date();
    endAt.setDate(endAt.getDate() + parseInt(durationDays));

    const { error } = await supabase
      .from("featured_users")
      .insert({
        user_id: userId,
        target_gender: targetGender,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        active: true
      });

    if (error) {
      alert("登録に失敗しました: " + error.message);
    } else {
      alert("登録しました");
      setSearchResults([]);
      setSearchTerm("");
      fetchFeatured();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("本当に削除しますか？")) return;
    
    const { error } = await supabase
      .from("featured_users")
      .delete()
      .eq("id", id);

    if (error) {
      alert("削除に失敗しました");
    } else {
      fetchFeatured();
    }
  };

  return (
    <div className="container max-w-5xl">
      <h1 className="text-2xl font-bold mb-8 flex items-center gap-2">
        PickUp ユーザー管理
      </h1>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* 左側: 新規登録 */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h2 className="font-bold mb-4">新規PickUp登録</h2>
            
            <div className="flex flex-col gap-3 mb-4 sm:flex-row">
              <Input 
                placeholder="ユーザー名で検索..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={searching} className="w-full sm:w-auto">
                <Search size={16} />
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2 mb-6 border rounded-lg p-2 max-h-60 overflow-y-auto">
                {searchResults.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded">
                    <div className="flex items-center gap-3">
                      {user.avatar_url ? (
                        <Image src={user.avatar_url} alt="" width={32} height={32} className="rounded-full" />
                      ) : (
                        <div className="w-8 h-8 bg-slate-200 rounded-full" />
                      )}
                      <div>
                        <p className="text-sm font-bold">{user.full_name}</p>
                        <p className="text-xs text-slate-500">{user.gender} / {user.job}</p>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => handleAddFeatured(user.id)}>選択</Button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>表示ターゲット（誰に見せるか）</Label>
                <Select value={targetGender} onValueChange={setTargetGender}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全員 (All)</SelectItem>
                    <SelectItem value="male">男性に見せる (Target: Male)</SelectItem>
                    <SelectItem value="female">女性に見せる (Target: Female)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-400">
                  ※ 例: 「男性会員」を宣伝したい場合、ターゲットは「女性に見せる」を選択してください。
                </p>
              </div>

              <div className="space-y-2">
                <Label>掲載期間</Label>
                <Select value={durationDays} onValueChange={setDurationDays}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1日間</SelectItem>
                    <SelectItem value="3">3日間</SelectItem>
                    <SelectItem value="7">1週間</SelectItem>
                    <SelectItem value="14">2週間</SelectItem>
                    <SelectItem value="30">1ヶ月</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* 右側: 現在のリスト */}
        <div>
          <h2 className="font-bold mb-4">現在掲載中のユーザー</h2>
          <div className="space-y-4">
            {loading ? (
              <p>Loading...</p>
            ) : featuredList.length === 0 ? (
              <p className="text-slate-400 text-sm">掲載中のユーザーはいません</p>
            ) : (
              featuredList.map(item => (
                <div key={item.id} className="bg-white p-4 rounded-xl border shadow-sm relative overflow-hidden">
                  {!item.active && <div className="absolute inset-0 bg-slate-100/50 z-10" />}
                  
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {item.user?.avatar_url && (
                        <Image src={item.user.avatar_url} alt="" width={40} height={40} className="rounded-full border-2 border-yellow-400" />
                      )}
                      <div>
                        <p className="font-bold text-sm">{item.user?.full_name || "Unknown User"}</p>
                        <p className="text-xs text-slate-500">
                           Target: {item.target_gender}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(item.id)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t flex justify-between text-xs text-slate-500">
                    <span>開始: {new Date(item.start_at).toLocaleDateString()}</span>
                    <span>終了: {new Date(item.end_at).toLocaleDateString()}</span>
                  </div>
                  
                  {new Date(item.end_at) < new Date() && (
                    <div className="mt-2 text-center bg-red-100 text-red-600 text-xs py-1 rounded font-bold">
                      期間終了
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
