"use client";

import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { Save, Eye, EyeOff, Copy, Check, Loader2, ExternalLink } from "lucide-react";

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

/*
 * フォーム状態定義（デザイナー納品準拠）:
 * 高さ50px・角丸12px・16pxフォント（iOSの自動ズーム回避）
 * DEFAULT: bg#0d111b/border#232b3d → FOCUS: border#FF2E74+リング → ERROR: #ff5a5a
 */
const inputClass =
  "min-h-[50px] w-full rounded-input border border-line bg-surface px-3.5 text-base text-white placeholder:text-txt-disabled focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/20 transition-colors";
const inputErrorClass =
  "min-h-[50px] w-full rounded-input border border-error bg-dangerbg px-3.5 text-base text-white placeholder:text-txt-disabled focus:outline-none focus:ring-[3px] focus:ring-error/20 transition-colors";
const labelClass = "text-xs font-black text-txt-muted";

const SimpleSwitch = ({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (c: boolean) => void;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onCheckedChange(!checked)}
    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
      checked ? "bg-primary" : "bg-line"
    }`}
  >
    <span
      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${checked ? "translate-x-5" : "translate-x-0.5"}`}
    />
  </button>
);

export default function ProfileEditPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [primaryUserId, setPrimaryUserId] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState<GenderOption>("male");
  const [initialGender, setInitialGender] = useState<GenderOption | null>(null);
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
        const profileGender = (profile.gender as GenderOption | null) || null;
        if (profileGender) {
          setInitialGender(profileGender);
          setGender(profileGender);
        } else {
          setGender("male");
        }
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

    const trimmedFullName = fullName.trim();
    if (trimmedFullName.length < 2) {
      setNameError("2文字以上で入力してください");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setNameError(null);
    setSaving(true);

    try {
      const sanitizedLinks = (Object.keys(socialLinks) as (keyof SocialLinks)[]).reduce((acc, key) => {
        const trimmed = socialLinks[key].trim();
        if (trimmed) acc[key] = trimmed;
        return acc;
      }, {} as Partial<SocialLinks>);

      const genderToPersist = initialGender ?? gender;

      const updates = {
        id: user.id,
        full_name: trimmedFullName,
        bio,
        gender: genderToPersist,
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

      if (!initialGender && genderToPersist) {
        setInitialGender(genderToPersist);
      }

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
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-ink">
        <div className="w-[200px] overflow-hidden rounded-full">
          <div className="animate-marquee h-[10px] w-[400%] bg-hazard-sm" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-ink pb-32 text-white">
      {/* ヘッダー */}
      <div className="bg-[radial-gradient(120%_90%_at_50%_-10%,rgba(255,46,116,.16),transparent_60%)] px-5.5 pb-5 pt-8">
        <div className="mx-auto flex max-w-2xl flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-black tracking-[0.28em] text-hazard">SETTINGS</p>
            <h1 className="mt-2.5 text-2xl font-black">プロフィール編集</h1>
          </div>
          {isPublic && (
            <a
              href={`/profile/${user?.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-[11px] font-bold text-txt-muted transition-colors hover:border-primary hover:text-white"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              公開ページを確認
            </a>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-3.5 px-5.5">
        {/* アバター + 公開設定 */}
        <div className="grid gap-3.5 sm:grid-cols-3">
          <div className="flex flex-col items-center justify-center rounded-card border border-line bg-surface p-5 text-center">
            <button
              type="button"
              className="group relative"
              onClick={() => fileInputRef.current?.click()}
              aria-label="プロフィール写真を変更"
            >
              <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-line bg-surface-alt">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="Avatar" fill sizes="96px" className="object-cover transition-transform group-hover:scale-105" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl">👤</div>
                )}
              </div>
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition-colors group-hover:bg-black/40">
                {uploading ? (
                  <Loader2 className="animate-spin text-white" size={26} />
                ) : (
                  <span className="text-xs font-black text-white opacity-0 transition-opacity group-hover:opacity-100">
                    変更
                  </span>
                )}
              </div>
            </button>
            <p className="mt-3 text-[10px] font-bold text-txt-subtle">プロフィール写真</p>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
          </div>

          <div className="rounded-card border border-line bg-surface p-5 sm:col-span-2">
            <div className="flex items-center justify-between">
              <div className="mr-2 min-w-0 flex-1">
                <h3 className="flex items-center gap-2 whitespace-nowrap text-sm font-black">
                  {isPublic ? (
                    <Eye className="shrink-0 text-primary" size={16} />
                  ) : (
                    <EyeOff className="shrink-0 text-txt-subtle" size={16} />
                  )}
                  公開設定
                </h3>
                <p className="mt-1 truncate text-[11px] text-txt-subtle">
                  {isPublic ? "プロフィールは公開されています" : "プロフィールは非公開です"}
                </p>
              </div>
              <SimpleSwitch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>

            {isPublic && (
              <div className="mt-4 rounded-input border border-dashed border-line bg-ink p-3">
                <p className="text-[9px] font-black tracking-[0.16em] text-txt-subtle">
                  YOUR PUBLIC URL
                </p>
                <div className="mt-2 flex max-w-full items-center gap-2">
                  <div className="min-w-0 flex-1 truncate rounded-chip bg-surface px-3 py-2 font-mono text-xs text-txt-muted">
                    {`${typeof window !== "undefined" ? window.location.origin : ""}/profile/${user?.id}`}
                  </div>
                  <button
                    type="button"
                    onClick={copyPublicLink}
                    aria-label="公開URLをコピー"
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-chip font-black transition-colors ${
                      copied ? "bg-relief text-[#05130e]" : "bg-hazard text-ink hover:bg-white"
                    }`}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 基本情報 */}
        <section className="rounded-card border border-line bg-panel p-5">
          <h2 className="border-b border-line-soft pb-4 text-base font-black">基本情報</h2>

          <div className="mt-5 grid gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="fullName" className={labelClass}>
                  ニックネーム <span className="text-primary">*</span>
                </label>
                <input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (nameError && e.target.value.trim().length >= 2) setNameError(null);
                  }}
                  placeholder="Togel太郎"
                  className={nameError ? inputErrorClass : inputClass}
                />
                {nameError && (
                  <p className="text-[11px] font-bold text-errortext">{nameError}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label htmlFor="gender" className={labelClass}>性別</label>
                  <div className="relative">
                    <select
                      id="gender"
                      value={gender}
                      onChange={(e) => {
                        if (initialGender) return;
                        setGender(e.target.value as GenderOption);
                      }}
                      disabled={Boolean(initialGender)}
                      className={`w-full appearance-none ${
                        initialGender
                          ? "min-h-[50px] rounded-input border border-line-soft bg-[#0b0e17] px-3.5 text-base text-txt-disabled"
                          : inputClass
                      }`}
                    >
                      <option value="male">男性</option>
                      <option value="female">女性</option>
                      <option value="other">その他</option>
                    </select>
                    <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-txt-subtle">
                      ▼
                    </div>
                  </div>
                  <p className="text-[10px] leading-relaxed text-txt-subtle">
                    {initialGender ? "性別は登録時の情報から変更できません" : "一度保存すると性別は変更できません"}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="age" className={labelClass}>年齢</label>
                  <input
                    id="age"
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="25"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="job" className={labelClass}>職業</label>
                <input id="job" value={job} onChange={(e) => setJob(e.target.value)} placeholder="会社員" className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="city" className={labelClass}>居住地</label>
                <input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="東京都" className={inputClass} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="bio" className={labelClass}>自己紹介</label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="趣味や性格など、自由にかいてください！"
                className={`${inputClass} min-h-[120px] py-3 leading-relaxed`}
              />
            </div>
          </div>
        </section>

        {/* 詳細プロフィール */}
        <section className="rounded-card border border-line bg-panel p-5">
          <h2 className="border-b border-line-soft pb-4 text-base font-black">詳細プロフィール</h2>

          <div className="mt-5 space-y-4">
            {[
              { id: "favoriteThings", label: "好きなこと", value: details.favoriteThings, setter: (v: string) => setDetails({ ...details, favoriteThings: v }) },
              { id: "hobbies", label: "趣味", value: details.hobbies, setter: (v: string) => setDetails({ ...details, hobbies: v }) },
              { id: "specialSkills", label: "特技", value: details.specialSkills, setter: (v: string) => setDetails({ ...details, specialSkills: v }) },
              { id: "values", label: "大切にしている価値観", value: details.values, setter: (v: string) => setDetails({ ...details, values: v }) },
              { id: "communication", label: "コミュニケーションスタイル", value: details.communication, setter: (v: string) => setDetails({ ...details, communication: v }) },
            ].map((field) => (
              <div key={field.id} className="space-y-1.5">
                <label htmlFor={field.id} className={labelClass}>{field.label}</label>
                <input id={field.id} value={field.value} onChange={(e) => field.setter(e.target.value)} className={inputClass} />
              </div>
            ))}
          </div>
        </section>

        {/* SNSリンク */}
        <section className="rounded-card border border-line bg-panel p-5">
          <h2 className="border-b border-line-soft pb-4 text-base font-black">
            SNSリンク
            <span className="ml-2 text-[10px] font-bold text-txt-subtle">公開プロフィールに表示されます</span>
          </h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {(
              [
                { key: "twitter", label: "X (Twitter)", placeholder: "https://x.com/..." },
                { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/..." },
                { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/..." },
                { key: "line", label: "LINE", placeholder: "https://line.me/..." },
              ] as { key: keyof SocialLinks; label: string; placeholder: string }[]
            ).map((field) => (
              <div key={field.key} className="space-y-1.5">
                <label className={labelClass}>{field.label}</label>
                <input
                  type="url"
                  value={socialLinks[field.key]}
                  onChange={(e) => setSocialLinks({ ...socialLinks, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  className={inputClass}
                />
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 画面下固定の保存バー（safe-area対応） */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-line-soft bg-ink/90 p-4 backdrop-blur-lg"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-2xl items-center justify-between px-1.5">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm font-bold text-txt-subtle transition-colors hover:text-white"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex min-h-[52px] items-center gap-2 rounded-full bg-hazard px-8 text-sm font-black text-ink shadow-cta transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> 保存中...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> 保存する
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
