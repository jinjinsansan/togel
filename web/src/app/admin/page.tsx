"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type Profile = {
  id: string;
  username: string;
  avatar_url: string;
  updated_at: string;
};

export default function AdminPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error fetching profiles:", error);
      } else {
        setProfiles(data || []);
      }
      setLoading(false);
    };

    fetchProfiles();
  }, [supabase]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ダッシュボード</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h2 className="text-sm font-medium text-slate-500 mb-2">総ユーザー数</h2>
          <p className="text-3xl font-black text-slate-900">{loading ? "..." : profiles.length}</p>
        </div>
        {/* Add more stats here later */}
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-slate-50">
          <h2 className="font-bold text-slate-700">最近の登録・更新ユーザー</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">ID</th>
                  <th className="px-4 py-3 text-left font-medium">ユーザー名</th>
                  <th className="px-4 py-3 text-left font-medium">最終更新</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {profiles.slice(0, 10).map((profile) => (
                  <tr key={profile.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{profile.id.slice(0, 8)}...</td>
                    <td className="px-4 py-3 font-medium">{profile.username || "No Name"}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(profile.updated_at).toLocaleString('ja-JP')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
