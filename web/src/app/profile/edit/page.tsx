"use client";

import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { User } from "@supabase/supabase-js";
import { Save, Eye, EyeOff, Copy, Check, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type GenderOption = "male" | "female" | "other";

type SocialLinks = {
  twitter: string;
  instagram: string;
  facebook: string;
  line: string;
};

type ProfileDetails = {
  favoriteThings: string;
  hobbies: string;
  specialSkills: string;
  values: string;
  communication: string;
};

const SimpleSwitch = ({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (c: boolean) => void }) => (
  <button
    type="button"
    onClick={() => onCheckedChange(!checked)}
    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
      checked ? "bg-[#E91E63]" : "bg-slate-300"
    }`}
  >
    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
  </button>
);

export default function ProfileEditPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [primaryUserId, setPrimaryUserId] = useState<string | null>(null);
  
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState<GenderOption>("male");
  const [age, setAge] = useState("");
  const [job, setJob] = useState("");
  const [city, setCity] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({
    twitter: "",
    instagram: "",
    facebook: "",
    line: "",
  });
  const [details, setDetails] = useState<ProfileDetails>({
    favoriteThings: "",
    hobbies: "",
    specialSkills: "",
    values: "",
    communication: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/");
        return;
      }
      
      setUser(session.user);

      const { data: userData } = await supabase.from("users").select("id").eq("auth_user_id", session.user.id).maybeSingle();
      if (userData?.id) setPrimaryUserId(userData.id);

      const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();

      if (profile) {
        setFullName(profile.full_name || "");
        setBio(profile.bio || "");
        setGender(profile.gender || "male");
        setAge(profile.age?.toString() || "");
        setJob(profile.job || "");
        setCity(profile.city || "");
        setIsPublic(profile.is_public || false);
        setAvatarUrl(profile.avatar_url || "");
        setSocialLinks(profile.social_links || { twitter: "", instagram: "", facebook: "", line: "" });
        setDetails(profile.details || { favoriteThings: "", hobbies: "", specialSkills: "", values: "", communication: "" });
      }

      setLoading(false);
    };

    init();
  }, [supabase, router]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("画像ファイルのみアップロードできます。");
      return;
    }

    setUploading(true);
    const previousUrl = avatarUrl;
    const previewUrl = URL.createObjectURL(file);
    setAvatarUrl(previewUrl);

    try {
      const tokenResponse = await fetch("/api/uploads/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileType: file.type, fileSize: file.size }),
      });

      if (!tokenResponse.ok) throw new Error("Failed to obtain upload URL");

      const { uploadUrl, publicUrl } = await tokenResponse.json();

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResponse.ok) throw new Error("Failed to upload file to R2");

      setAvatarUrl(publicUrl);
    } catch (err) {
      console.error("Avatar upload failed", err);
      setAvatarUrl(previousUrl);
      alert("画像のアップロードに失敗しました。");
    } finally {
      URL.revokeObjectURL(previewUrl);
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const trimmedFullName = fullName.trim();
      if (!trimmedFullName) {
        alert("ニックネームを入力してください。");
        setSaving(false);
        return;
      }

      const sanitizedLinks = (Object.keys(socialLinks) as (keyof SocialLinks)[]).reduce((acc, key) => {
        const trimmed = socialLinks[key].trim();
        if (trimmed) acc[key] = trimmed;
        return acc;
      }, {} as Partial<SocialLinks>);

      const updates = {
        id: user.id,
        full_name: trimmedFullName,
        bio,
        gender,
        age: age ? parseInt(age) : null,
        job,
        city,
        is_public: isPublic,
        avatar_url: avatarUrl,
        social_links: Object.keys(sanitizedLinks).length ? sanitizedLinks : null,
        details,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("profiles").upsert(updates);
      if (error) throw error;
      
      if (primaryUserId || user.id) {
        const userUpdateQuery = supabase.from("users").update({ nickname: trimmedFullName });
        const targetedQuery = primaryUserId
          ? userUpdateQuery.eq("id", primaryUserId)
          : userUpdateQuery.eq("auth_user_id", user.id);
        await targetedQuery;
      }

      await supabase.auth.updateUser({
        data: { full_name: trimmedFullName, name: trimmedFullName, avatar_url: avatarUrl }
      });

      alert("保存しました！");
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-[#E91E63]" />
          <p className="text-slate-500 font-bold animate-pulse">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-32 overflow-x-hidden w-full">
      {/* Hero Header */}
      <div className="relative border-b border-slate-100 bg-gradient-to-br from-white to-slate-100 py-8 md:py-12">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
            <div>
              <p className="text-xs font-bold tracking-[0.3em] text-[#E91E63] mb-2 md:mb-3 uppercase">Settings</p>
              <h1 className="font-heading text-2xl md:text-4xl font-black text-slate-900">
                プロフィール編集
              </h1>
            </div>
            {isPublic && (
              <Button variant="outline" size="sm" asChild className="self-start md:self-auto rounded-full border-2 border-[#E91E63]/20 text-[#E91E63] hover:bg-[#E91E63] hover:text-white font-bold">
                <a href={`/profile/${user?.id}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  公開ページを確認
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-3 md:px-4 mt-6 md:-mt-8 relative z-10 space-y-6 md:space-y-8">
        
        {/* Avatar & Public Status Grid */}
        <div className="grid md:grid-cols-3 gap-4 md:gap-6">
          
          {/* Left Col: Avatar */}
          <div className="md:col-span-1">
            <div className="h-full bg-white rounded-2xl md:rounded-3xl border-2 border-slate-100 p-6 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-shadow">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="relative h-24 w-24 md:h-32 md:w-32 rounded-full overflow-hidden border-4 border-slate-50 bg-slate-100 shadow-inner">
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt="Avatar" fill sizes="128px" className="object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-4xl">👤</div>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-full transition-colors flex items-center justify-center">
                   {uploading ? (
                    <Loader2 className="animate-spin text-white" size={32} />
                   ) : (
                    <span className="text-white font-bold opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100 transition-all">変更</span>
                   )}
                </div>
              </div>
              <p className="text-xs font-bold text-slate-400 mt-4">プロフィール写真</p>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
            </div>
          </div>

          {/* Right Col: Public Toggle & URL */}
          <div className="md:col-span-2">
            <div className="h-full bg-white rounded-2xl md:rounded-3xl border-2 border-slate-100 p-5 md:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-heading text-lg font-black text-slate-900 flex items-center gap-2">
                    {isPublic ? <Eye className="text-[#E91E63]" size={20} /> : <EyeOff className="text-slate-400" size={20} />}
                    公開設定
                  </h3>
                  <p className="text-sm text-slate-500 font-medium mt-1">
                    {isPublic ? "プロフィールは公開されています" : "プロフィールは非公開です"}
                  </p>
                </div>
                <SimpleSwitch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>

              {isPublic && (
                <div className="bg-slate-50 rounded-xl md:rounded-2xl p-4 border border-slate-200">
                  <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Your Public URL</p>
                  <div className="flex gap-2">
                    <code className="flex-1 min-w-0 bg-white border border-slate-200 rounded-xl px-3 py-3 text-xs md:text-sm font-mono text-slate-600 truncate">
                      {`${typeof window !== 'undefined' ? window.location.origin : ''}/profile/${user?.id}`}
                    </code>
                    <Button onClick={copyPublicLink} className={`shrink-0 rounded-xl font-bold ${copied ? "bg-green-500 hover:bg-green-600 text-white" : "bg-slate-900 text-white hover:bg-slate-800"}`}>
                      {copied ? <Check size={18} /> : <Copy size={18} />}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Basic Info Form */}
        <section className="bg-white rounded-2xl md:rounded-3xl border-2 border-slate-100 p-5 md:p-10 shadow-sm">
          <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-6">
             <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#E91E63]/10 text-xl">📝</span>
             <h2 className="font-heading text-2xl font-black text-slate-900">基本情報</h2>
          </div>
          
          <div className="grid gap-8">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-bold text-slate-700">ニックネーム <span className="text-[#E91E63]">*</span></Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Togel太郎" className="h-12 rounded-xl border-slate-200 text-base focus:ring-[#E91E63]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                  <Label htmlFor="gender" className="text-sm font-bold text-slate-700">性別</Label>
                  <div className="relative">
                    <select 
                      id="gender" 
                      value={gender} 
                      onChange={(e) => setGender(e.target.value as GenderOption)} 
                      className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-base focus:outline-none focus:ring-2 focus:ring-[#E91E63] appearance-none"
                    >
                      <option value="male">男性</option>
                      <option value="female">女性</option>
                      <option value="other">その他</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age" className="text-sm font-bold text-slate-700">年齢</Label>
                  <Input id="age" type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="25" className="h-12 rounded-xl border-slate-200 text-base focus:ring-[#E91E63]" />
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
               <div className="space-y-2">
                <Label htmlFor="job" className="text-sm font-bold text-slate-700">職業</Label>
                <Input id="job" value={job} onChange={(e) => setJob(e.target.value)} placeholder="会社員" className="h-12 rounded-xl border-slate-200 text-base focus:ring-[#E91E63]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city" className="text-sm font-bold text-slate-700">居住地</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="東京都" className="h-12 rounded-xl border-slate-200 text-base focus:ring-[#E91E63]" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio" className="text-sm font-bold text-slate-700">自己紹介</Label>
              <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="趣味や性格など、自由にかいてください！" className="min-h-[120px] rounded-xl border-slate-200 text-base focus:ring-[#E91E63] p-4 leading-relaxed" />
            </div>
          </div>
        </section>

        {/* Details Form */}
        <section className="bg-white rounded-2xl md:rounded-3xl border-2 border-slate-100 p-5 md:p-10 shadow-sm">
          <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-6">
             <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 text-xl">💡</span>
             <h2 className="font-heading text-2xl font-black text-slate-900">詳細プロフィール</h2>
          </div>

          <div className="space-y-6">
            {[
              { id: "favoriteThings", label: "好きなこと", value: details.favoriteThings, setter: (v: string) => setDetails({...details, favoriteThings: v}) },
              { id: "hobbies", label: "趣味", value: details.hobbies, setter: (v: string) => setDetails({...details, hobbies: v}) },
              { id: "specialSkills", label: "特技", value: details.specialSkills, setter: (v: string) => setDetails({...details, specialSkills: v}) },
              { id: "values", label: "大切にしている価値観", value: details.values, setter: (v: string) => setDetails({...details, values: v}) },
              { id: "communication", label: "コミュニケーションスタイル", value: details.communication, setter: (v: string) => setDetails({...details, communication: v}) },
            ].map((field) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.id} className="text-sm font-bold text-slate-700">{field.label}</Label>
                <Input id={field.id} value={field.value} onChange={(e) => field.setter(e.target.value)} className="h-12 rounded-xl border-slate-200 text-base focus:ring-[#E91E63]" />
              </div>
            ))}
          </div>
        </section>

        {/* SNS Form */}
        <section className="bg-white rounded-2xl md:rounded-3xl border-2 border-slate-100 p-5 md:p-10 shadow-sm">
          <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-6">
             <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-100 text-xl">🔗</span>
             <div>
               <h2 className="font-heading text-2xl font-black text-slate-900">SNSリンク</h2>
               <p className="text-xs font-bold text-slate-400 mt-1">公開プロフィールに表示されます</p>
             </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700">X (Twitter)</Label>
              <Input type="url" value={socialLinks.twitter} onChange={(e) => setSocialLinks({...socialLinks, twitter: e.target.value})} placeholder="https://x.com/..." className="h-12 rounded-xl border-slate-200 text-base focus:ring-[#E91E63]" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700">Instagram</Label>
              <Input type="url" value={socialLinks.instagram} onChange={(e) => setSocialLinks({...socialLinks, instagram: e.target.value})} placeholder="https://instagram.com/..." className="h-12 rounded-xl border-slate-200 text-base focus:ring-[#E91E63]" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700">Facebook</Label>
              <Input type="url" value={socialLinks.facebook} onChange={(e) => setSocialLinks({...socialLinks, facebook: e.target.value})} placeholder="https://facebook.com/..." className="h-12 rounded-xl border-slate-200 text-base focus:ring-[#E91E63]" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700">LINE</Label>
              <Input type="url" value={socialLinks.line} onChange={(e) => setSocialLinks({...socialLinks, line: e.target.value})} placeholder="https://line.me/..." className="h-12 rounded-xl border-slate-200 text-base focus:ring-[#E91E63]" />
            </div>
          </div>
        </section>

      </div>

      {/* Sticky Footer Action */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 p-4 z-50">
        <div className="container max-w-4xl mx-auto flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.back()} className="font-bold text-slate-500 hover:text-slate-900">
            キャンセル
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving} 
            size="lg" 
            className="rounded-full bg-[#E91E63] hover:bg-[#D81B60] text-white font-bold px-8 shadow-lg shadow-[#E91E63]/30 transition-all hover:scale-105"
          >
            {saving ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> 保存中...</> : <><Save className="mr-2 h-5 w-5" /> 保存する</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
