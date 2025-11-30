"use client";

import { useState, useEffect } from "react";
import { Send, Users, User as UserIcon, Trash2, Clock, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type NotificationHistory = {
  id: string;
  title: string;
  content: string;
  user_id: string | null;
  created_at: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profiles?: { full_name: string } | null;
};

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetType, setTargetType] = useState("all");
  const [targetEmail, setTargetEmail] = useState("");
  const [sending, setSending] = useState(false);
  
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/admin/notifications/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (e) {
      console.error("Failed to load history", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSend = async () => {
    if (!title || !content) return;
    if (targetType === "individual" && !targetEmail) return;

    setSending(true);
    try {
      const res = await fetch("/api/admin/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          targetType,
          targetEmail: targetType === "individual" ? targetEmail : undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to send");

      alert("配信が完了しました");
      setTitle("");
      setContent("");
      setTargetEmail("");
      fetchHistory(); // Refresh history
    } catch (error) {
      console.error(error);
      alert("配信に失敗しました");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このお知らせ履歴を削除しますか？\n※受信者のBOXからも消える可能性があります。")) return;

    try {
      const res = await fetch(`/api/admin/notifications/${id}`, {
        method: "DELETE",
      });
      
      if (!res.ok) throw new Error("Failed to delete");
      
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (e) {
      console.error(e);
      alert("削除に失敗しました");
    }
  };

  return (
    <div className="container max-w-5xl">
      <h1 className="text-2xl font-bold mb-8 flex items-center gap-2">
        お知らせ配信管理
      </h1>

      <Tabs defaultValue="new" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="new" className="gap-2"><Send size={16}/> 新規配信</TabsTrigger>
          <TabsTrigger value="history" className="gap-2"><Clock size={16}/> 配信履歴</TabsTrigger>
        </TabsList>

        <TabsContent value="new">
          <div className="bg-white p-6 rounded-xl border shadow-sm space-y-6 max-w-2xl">
            <div className="space-y-2">
              <Label>配信対象</Label>
              <Select value={targetType} onValueChange={setTargetType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" /> 全ユーザー (Global)
                    </div>
                  </SelectItem>
                  <SelectItem value="individual">
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4" /> 個別配信 (Email指定)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {targetType === "individual" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <Label>対象メールアドレス</Label>
                <Input 
                  placeholder="user@example.com" 
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>件名</Label>
              <Input 
                placeholder="【重要】システムメンテナンスのお知らせ" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>本文</Label>
              <Textarea 
                placeholder="お知らせの内容を入力してください..." 
                className="h-40 resize-none"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>

            <div className="pt-4">
              <Button 
                onClick={handleSend} 
                disabled={sending || !title || !content}
                className="w-full bg-[#E91E63] hover:bg-[#D81B60]"
              >
                {sending ? "送信中..." : (
                  <span className="flex items-center gap-2">
                    <Send className="h-4 w-4" /> 配信する
                  </span>
                )}
              </Button>
              <p className="text-xs text-slate-400 mt-2 text-center">
                ※配信ボタンを押すと、対象ユーザーの受信箱への追加とメール送信が同時に実行されます。
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-700">最近の配信履歴 (最新50件)</h3>
              <Button size="sm" variant="ghost" onClick={fetchHistory} disabled={loadingHistory}>
                <RefreshCw size={16} className={loadingHistory ? "animate-spin" : ""} />
              </Button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">日時</th>
                    <th className="px-4 py-3 text-left font-medium">対象</th>
                    <th className="px-4 py-3 text-left font-medium">件名</th>
                    <th className="px-4 py-3 text-left font-medium">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingHistory ? (
                    <tr><td colSpan={4} className="p-8 text-center">Loading...</td></tr>
                  ) : history.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-slate-400">履歴がありません</td></tr>
                  ) : (
                    history.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                          {new Date(item.created_at).toLocaleString('ja-JP')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {item.user_id ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs">
                              <UserIcon size={12} /> 個別
                              {/* {item.profiles?.full_name ? ` (${item.profiles.full_name})` : ""} */}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-purple-50 text-purple-700 text-xs">
                              <Users size={12} /> 全員
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {item.title}
                          <p className="text-xs text-slate-400 truncate max-w-md mt-0.5">{item.content}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
