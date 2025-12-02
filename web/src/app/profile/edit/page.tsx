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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#E91E63]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 w-screen overflow-x-hidden">
      <div className="w-full mx-auto px-3 py-4 max-w-2xl">
        
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-900">プロフィール編集</h1>
          {isPublic && (
            <a href={`/profile/${user?.id}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#E91E63] flex items-center gap-1 hover:underline">
              <ExternalLink size={12} />
              <span>公開ページ</span>
            </a>
          )}
        </div>

        {/* Public Toggle */}
        <div className="bg-white rounded-lg p-3 mb-3 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {isPublic ? <Eye size={18} className="text-green-600 shrink-0" /> : <EyeOff size={18} className="text-slate-400 shrink-0" />}
              <span className="text-sm font-semibold">{isPublic ? "公開中" : "非公開"}</span>
            </div>
            <SimpleSwitch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
          {isPublic && (
            <div className="mt-2 p-2 bg-slate-50 rounded text-[9px] overflow-hidden">
              <p className="text-slate-500 mb-1 font-semibold">URL</p>
              <div className="flex gap-1">
                <code className="flex-1 min-w-0 bg-white border border-slate-300 rounded px-1.5 py-1 text-[8px] truncate">
                  {`${typeof window !== 'undefined' ? window.location.origin : ''}/profile/${user?.id}`}
                </code>
                <Button size="sm" variant="outline" onClick={copyPublicLink} className="h-6 w-6 p-0 shrink-0">
                  {copied ? <Check size={10} className="text-green-600" /> : <Copy size={10} />}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="bg-white rounded-lg p-3 mb-3 border border-slate-200">
          <div className="flex flex-col items-center">
            <div className="relative cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="relative h-24 w-24 rounded-full overflow-hidden border-2 border-slate-200 bg-slate-100">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="Avatar" fill sizes="96px" className="object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-3xl">👤</div>
                )}
              </div>
              {uploading && (
                <div className="absolute inset-0 bg-white/80 rounded-full flex items-center justify-center">
                  <Loader2 className="animate-spin text-[#E91E63]" size={20} />
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-2">タップして変更</p>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-white rounded-lg p-3 mb-3 border border-slate-200">
          <h2 className="text-sm font-bold mb-3">基本情報</h2>
          <div className="space-y-2">
            <div>
              <Label htmlFor="fullName" className="text-xs">ニックネーム</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Togel太郎" className="text-sm h-9" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="gender" className="text-xs">性別</Label>
                <select id="gender" value={gender} onChange={(e) => setGender(e.target.value as GenderOption)} className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm">
                  <option value="male">男性</option>
                  <option value="female">女性</option>
                  <option value="other">その他</option>
                </select>
              </div>
              <div>
                <Label htmlFor="age" className="text-xs">年齢</Label>
                <Input id="age" type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="25" className="text-sm h-9" />
              </div>
            </div>
            <div>
              <Label htmlFor="job" className="text-xs">職業</Label>
              <Input id="job" value={job} onChange={(e) => setJob(e.target.value)} placeholder="会社員" className="text-sm h-9" />
            </div>
            <div>
              <Label htmlFor="city" className="text-xs">居住地</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="東京都" className="text-sm h-9" />
            </div>
            <div>
              <Label htmlFor="bio" className="text-xs">自己紹介</Label>
              <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="よろしく！" className="text-sm h-20 resize-none" />
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="bg-white rounded-lg p-3 mb-3 border border-slate-200">
          <h2 className="text-sm font-bold mb-3">詳細プロフィール</h2>
          <div className="space-y-2">
            <div>
              <Label htmlFor="favoriteThings" className="text-xs">好きなこと</Label>
              <Input id="favoriteThings" value={details.favoriteThings} onChange={(e) => setDetails({...details, favoriteThings: e.target.value})} placeholder="例：カフェ巡り" className="text-sm h-9" />
            </div>
            <div>
              <Label htmlFor="hobbies" className="text-xs">趣味</Label>
              <Input id="hobbies" value={details.hobbies} onChange={(e) => setDetails({...details, hobbies: e.target.value})} placeholder="例：サウナ" className="text-sm h-9" />
            </div>
            <div>
              <Label htmlFor="specialSkills" className="text-xs">特技</Label>
              <Input id="specialSkills" value={details.specialSkills} onChange={(e) => setDetails({...details, specialSkills: e.target.value})} placeholder="例：料理" className="text-sm h-9" />
            </div>
            <div>
              <Label htmlFor="values" className="text-xs">価値観</Label>
              <Input id="values" value={details.values} onChange={(e) => setDetails({...details, values: e.target.value})} placeholder="例：誠実さ" className="text-sm h-9" />
            </div>
            <div>
              <Label htmlFor="communication" className="text-xs">コミュニケーション</Label>
              <Input id="communication" value={details.communication} onChange={(e) => setDetails({...details, communication: e.target.value})} placeholder="例：聞き上手" className="text-sm h-9" />
            </div>
          </div>
        </div>

        {/* SNS */}
        <div className="bg-white rounded-lg p-3 mb-3 border border-slate-200">
          <h2 className="text-sm font-bold mb-3">外部SNSリンク</h2>
          <p className="text-[10px] text-slate-500 mb-2">公開プロフィールに表示されます</p>
          <div className="space-y-2">
            <div>
              <Label className="text-xs">X (Twitter)</Label>
              <Input type="url" value={socialLinks.twitter} onChange={(e) => setSocialLinks({...socialLinks, twitter: e.target.value})} placeholder="https://x.com/yourname" className="text-sm h-9" />
            </div>
            <div>
              <Label className="text-xs">Instagram</Label>
              <Input type="url" value={socialLinks.instagram} onChange={(e) => setSocialLinks({...socialLinks, instagram: e.target.value})} placeholder="https://instagram.com/yourname" className="text-sm h-9" />
            </div>
            <div>
              <Label className="text-xs">Facebook</Label>
              <Input type="url" value={socialLinks.facebook} onChange={(e) => setSocialLinks({...socialLinks, facebook: e.target.value})} placeholder="https://facebook.com/yourname" className="text-sm h-9" />
            </div>
            <div>
              <Label className="text-xs">LINE</Label>
              <Input type="url" value={socialLinks.line} onChange={(e) => setSocialLinks({...socialLinks, line: e.target.value})} placeholder="https://line.me/ti/p/xxxx" className="text-sm h-9" />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-slate-200 p-3 -mx-3">
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => router.back()} size="sm" className="text-sm">キャンセル</Button>
            <Button onClick={handleSave} disabled={saving} size="sm" className="bg-[#E91E63] hover:bg-[#D81B60] text-white text-sm">
              {saving ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> 保存中...</> : <><Save className="mr-1 h-3 w-3" /> 保存</>}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
