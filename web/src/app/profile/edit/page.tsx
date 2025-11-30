"use client";

import { useEffect, useState, useRef, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { User } from "@supabase/supabase-js";
import { Camera, Save, Eye, EyeOff, Copy, Check, ExternalLink, Loader2, Twitter, Instagram, Facebook, MessageCircle } from "lucide-react";

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

// Simple Switch Component
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

  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const socialLinkFields: {
    key: keyof SocialLinks;
    label: string;
    placeholder: string;
    icon: ReactNode;
    helper: string;
  }[] = [
    {
      key: "twitter",
      label: "X (Twitter)",
      placeholder: "https://x.com/yourname",
      icon: <Twitter className="h-4 w-4 text-slate-400" />,
      helper: "X(旧Twitter)のプロフィールURL",
    },
    {
      key: "instagram",
      label: "Instagram",
      placeholder: "https://instagram.com/yourname",
      icon: <Instagram className="h-4 w-4 text-slate-400" />,
      helper: "InstagramのプロフィールURL",
    },
    {
      key: "facebook",
      label: "Facebook",
      placeholder: "https://www.facebook.com/yourname",
      icon: <Facebook className="h-4 w-4 text-slate-400" />,
      helper: "FacebookのプロフィールURL",
    },
    {
      key: "line",
      label: "LINE",
      placeholder: "https://line.me/ti/p/xxxx",
      icon: <MessageCircle className="h-4 w-4 text-slate-400" />,
      helper: "LINEオープンチャットやアカウントURL",
    },
  ];

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }
      setUser(user);

      // Fetch existing profile
      const { data } = await supabase
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
        const links = (data.social_links as Partial<SocialLinks>) || {};
        setSocialLinks({
          twitter: links.twitter || "",
          instagram: links.instagram || "",
          facebook: links.facebook || "",
          line: links.line || "",
        });

        const d = (data.details as Partial<ProfileDetails>) || {};
        setDetails({
          favoriteThings: d.favoriteThings || "",
          hobbies: d.hobbies || "",
          specialSkills: d.specialSkills || "",
          values: d.values || "",
          communication: d.communication || "",
        });
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

    if (file.size > 5 * 1024 * 1024) {
      alert("5MB以下の画像を選択してください。");
      return;
    }

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
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error("Failed to obtain upload URL");
      }

      const { uploadUrl, publicUrl } = await tokenResponse.json();

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to R2");
      }

      setAvatarUrl(publicUrl);
    } catch (err) {
      console.error("Avatar upload failed", err);
      setAvatarUrl(previousUrl);
      alert("画像のアップロードに失敗しました。時間を置いて再度お試しください。");
    } finally {
      URL.revokeObjectURL(previewUrl);
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSocialLinkChange = (key: keyof SocialLinks, value: string) => {
    setSocialLinks((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const sanitizedLinks = (Object.keys(socialLinks) as (keyof SocialLinks)[]).reduce((acc, key) => {
        const trimmed = socialLinks[key].trim();
        if (trimmed) acc[key] = trimmed;
        return acc;
      }, {} as Partial<SocialLinks>);

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
        social_links: Object.keys(sanitizedLinks).length ? sanitizedLinks : null,
        details,
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
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                    </>
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
                  onChange={(e) => setGender(e.target.value as GenderOption)}
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

          {/* Detailed Info Card */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
            <h2 className="font-bold text-xl mb-6 border-b border-slate-100 pb-4">詳細プロフィール</h2>
            <div className="grid gap-6">
              <div className="space-y-2">
                <Label htmlFor="favoriteThings">好きなこと</Label>
                <Textarea 
                  id="favoriteThings" 
                  value={details.favoriteThings} 
                  onChange={(e) => setDetails({...details, favoriteThings: e.target.value})} 
                  placeholder="例：休日のカフェ巡り、映画鑑賞" 
                  className="resize-none h-20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hobbies">趣味</Label>
                <Input 
                  id="hobbies" 
                  value={details.hobbies} 
                  onChange={(e) => setDetails({...details, hobbies: e.target.value})} 
                  placeholder="例：サウナ、キャンプ" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialSkills">特技</Label>
                <Input 
                  id="specialSkills" 
                  value={details.specialSkills} 
                  onChange={(e) => setDetails({...details, specialSkills: e.target.value})} 
                  placeholder="例：早起き、料理" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="values">価値観</Label>
                <Input 
                  id="values" 
                  value={details.values} 
                  onChange={(e) => setDetails({...details, values: e.target.value})} 
                  placeholder="例：誠実さを大切にしたい" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="communication">コミュ力</Label>
                <Input 
                  id="communication" 
                  value={details.communication} 
                  onChange={(e) => setDetails({...details, communication: e.target.value})} 
                  placeholder="例：聞き上手と言われます" 
                />
              </div>
            </div>
          </div>

          {/* Social Links Card */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
              <div>
                <h2 className="font-bold text-xl">外部SNSリンク</h2>
                <p className="text-sm text-slate-500 mt-1">公開プロフィールに表示されます。信頼できる相手にのみ教えることをおすすめします。</p>
              </div>
            </div>

            <div className="grid gap-5">
              {socialLinkFields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={`social-${field.key}`} className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                      {field.icon}
                    </span>
                    {field.label}
                  </Label>
                  <Input
                    type="url"
                    id={`social-${field.key}`}
                    value={socialLinks[field.key]}
                    onChange={(e) => handleSocialLinkChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                  />
                  <p className="text-xs text-slate-400">{field.helper}</p>
                </div>
              ))}
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
