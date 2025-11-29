"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { User } from "@supabase/supabase-js";
import { Camera, Save, Eye, EyeOff, Copy, Check, ExternalLink, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch"; // Need to create this component or use simple input

// Simple Switch Component if not available
const SimpleSwitch = ({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (c: boolean) => void }) => (
  <button
    type="button"
    onClick={() => onCheckedChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 ${
      checked ? "bg-[#E91E63]" : "bg-slate-200"
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition shadow-sm ${
        checked ? "translate-x-6" : "translate-x-1"
      }`}
    />
  </button>
);

export default function ProfileEditPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Form State
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [age, setAge] = useState("");
  const [job, setJob] = useState("");
  const [city, setCity] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [copied, setCopied] = useState(false);

  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }
      setUser(user);

      // Fetch existing profile
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setFullName(data.full_name || user.user_metadata?.full_name || "");
        setBio(data.bio || "");
        setGender(data.gender || "male");
        setAge(data.age?.toString() || "");
        setJob(data.job || "");
        setCity(data.city || "");
        setIsPublic(data.is_public || false);
        setAvatarUrl(data.avatar_url || user.user_metadata?.avatar_url || "");
      } else {
        // Initial setup from auth metadata
        setFullName(user.user_metadata?.full_name || "");
        setAvatarUrl(user.user_metadata?.avatar_url || "");
      }
      setLoading(false);
    };

    loadProfile();
  }, [supabase, router]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // TODO: Implement Actual R2 Upload here using API Route
    // For now, we just pretend
    setUploading(true);
    
    // Simulate upload delay
    setTimeout(() => {
      // Mock: In real impl, this would be the R2 public URL
      const mockUrl = URL.createObjectURL(file); 
      setAvatarUrl(mockUrl);
      setUploading(false);
      alert("画像アップロード機能はバックエンド設定待ちです。現在はプレビューのみ表示されます。");
    }, 1500);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const updates = {
        id: user.id,
        full_name: fullName,
        bio,
        gender,
        age: age ? parseInt(age) : null,
        job,
        city,
        is_public: isPublic,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("profiles").upsert(updates);

      if (error) throw error;
      
      // Update auth metadata as well for header consistency
      await supabase.auth.updateUser({
        data: { full_name: fullName, avatar_url: avatarUrl }
      });

      alert("プロフィールを保存しました！");
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  };

  const copyPublicLink = () => {
    const url = `${window.location.origin}/profile/${user?.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#E91E63]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 md:py-20">
      <div className="container px-4 max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-slate-900">プロフィール編集</h1>
          {isPublic && (
            <Button variant="outline" className="text-[#E91E63] border-[#E91E63] hover:bg-[#E91E63]/10 gap-2" asChild>
              <a href={`/profile/${user?.id}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={16} />
                公開ページを確認
              </a>
            </Button>
          )}
        </div>

        <div className="grid gap-8">
          
          {/* Public Settings Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${isPublic ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-500"}`}>
                  {isPublic ? <Eye size={24} /> : <EyeOff size={24} />}
                </div>
                <div>
                  <h2 className="font-bold text-lg">公開設定</h2>
                  <p className="text-sm text-slate-500">
                    {isPublic ? "現在、あなたのプロフィールは公開されています" : "プロフィールは非公開です"}
                  </p>
                </div>
              </div>
              <SimpleSwitch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>

            {isPublic && (
              <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
                <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">PUBLIC URL</p>
                <div className="flex gap-2">
                  <code className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono text-slate-600 truncate">
                    {`${typeof window !== 'undefined' ? window.location.origin : ''}/profile/${user?.id}`}
                  </code>
                  <Button size="icon" variant="outline" onClick={copyPublicLink}>
                    {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
                  </Button>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  このURLをシェアすると、誰でもあなたのプロフィールを閲覧できます。
                </p>
              </div>
            )}
          </div>

          {/* Basic Info Card */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
            <h2 className="font-bold text-xl mb-6 border-b border-slate-100 pb-4">基本情報</h2>
            
            {/* Avatar */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-slate-100 shadow-md bg-slate-200">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-4xl">👤</div>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                  <Camera className="text-white" size={32} />
                </div>
                {uploading && (
                  <div className="absolute inset-0 bg-white/80 rounded-full flex items-center justify-center">
                    <Loader2 className="animate-spin text-[#E91E63]" />
                  </div>
                )}
              </div>
              <p className="text-sm text-slate-400 mt-3">タップして画像を変更</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleAvatarUpload}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">ニックネーム</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Togel太郎" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">性別</Label>
                <select 
                  id="gender" 
                  value={gender} 
                  onChange={(e) => setGender(e.target.value as any)}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="male">男性</option>
                  <option value="female">女性</option>
                  <option value="other">その他</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">年齢</Label>
                <Input id="age" type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="25" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="job">職業</Label>
                <Input id="job" value={job} onChange={(e) => setJob(e.target.value)} placeholder="会社員" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="city">居住地</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="東京都 渋谷区" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="bio">自己紹介</Label>
                <Textarea 
                  id="bio" 
                  value={bio} 
                  onChange={(e) => setBio(e.target.value)} 
                  placeholder="よろしくお願いします！" 
                  className="h-32 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Save Button Area */}
          <div className="sticky bottom-6 z-10">
            <div className="absolute inset-0 bg-white/80 backdrop-blur-md rounded-2xl -m-4 shadow-lg border border-slate-200/50"></div>
            <div className="relative flex justify-end gap-4">
              <Button variant="ghost" onClick={() => router.back()}>キャンセル</Button>
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="bg-[#E91E63] hover:bg-[#D81B60] text-white px-8 rounded-full font-bold shadow-lg shadow-pink-200"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 保存中...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> 保存する
                  </>
                )}
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
