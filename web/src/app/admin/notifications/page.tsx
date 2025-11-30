"use client";

import { useState } from "react";
import { Send, Users, User as UserIcon } from "lucide-react";

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

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetType, setTargetType] = useState("all");
  const [targetEmail, setTargetEmail] = useState("");
  const [sending, setSending] = useState(false);

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
    } catch (error) {
      console.error(error);
      alert("配信に失敗しました");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container py-10 max-w-2xl">
      <h1 className="text-2xl font-bold mb-8">お知らせ配信管理</h1>

      <div className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
        
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
    </div>
  );
}
