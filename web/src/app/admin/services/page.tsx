"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Boxes, ImageIcon, Link as LinkIcon, Loader2, PencilLine, Plus, Search, Trash2, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Service = {
  id: string;
  name: string;
  description: string;
  imageUrl?: string | null;
  linkUrl: string;
  category?: string | null;
  buttonText?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type ServiceFormState = {
  name: string;
  description: string;
  imageUrl: string;
  linkUrl: string;
  category: string;
  buttonText: string;
  isActive: boolean;
};

const EMPTY_FORM: ServiceFormState = {
  name: "",
  description: "",
  imageUrl: "",
  linkUrl: "",
  category: "",
  buttonText: "詳しく見る",
  isActive: true,
};

const statusOptions = [
  { value: "all", label: "すべて" },
  { value: "active", label: "公開中" },
  { value: "inactive", label: "非公開" },
];

const badgeClass = (service: Service) =>
  service.isActive
    ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
    : "bg-slate-100 text-slate-500 border border-slate-200";

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: "", status: "all" });
  const [searchInput, setSearchInput] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [formState, setFormState] = useState<ServiceFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.status !== "all") params.set("status", filters.status);
      const res = await fetch(`/api/admin/services?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load services");
      const data = await res.json();
      setServices(data.services ?? []);
    } catch (error) {
      console.error(error);
      alert("サービス一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [filters.search, filters.status]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const openCreateForm = () => {
    setEditing(null);
    setFormState(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEditForm = (service: Service) => {
    setEditing(service);
    setFormState({
      name: service.name,
      description: service.description,
      imageUrl: service.imageUrl ?? "",
      linkUrl: service.linkUrl,
      category: service.category ?? "",
      buttonText: service.buttonText ?? "詳しく見る",
      isActive: service.isActive,
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setEditing(null);
  };

  const handleSubmit = async () => {
    if (!formState.name || !formState.description || !formState.linkUrl) {
      alert("必須項目を入力してください");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: formState.name,
        description: formState.description,
        imageUrl: formState.imageUrl || null,
        linkUrl: formState.linkUrl,
        category: formState.category || null,
        buttonText: formState.buttonText || "詳しく見る",
        isActive: formState.isActive,
      };

      const url = editing ? `/api/admin/services/${editing.id}` : "/api/admin/services";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({ error: "保存に失敗しました" }));
        throw new Error(errorBody.error ?? "保存に失敗しました");
      }

      await fetchServices();
      closeForm();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (service: Service) => {
    if (!confirm(`「${service.name}」を削除しますか？`)) return;
    try {
      setDeletingId(service.id);
      const res = await fetch(`/api/admin/services/${service.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("削除に失敗しました");
      await fetchServices();
    } catch (error) {
      console.error(error);
      alert("削除に失敗しました");
    } finally {
      setDeletingId(null);
    }
  };

  const activeCount = useMemo(() => services.filter((service) => service.isActive).length, [services]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("画像ファイルのみアップロードできます");
      event.target.value = "";
      return;
    }

    setUploadingImage(true);

    try {
      const tokenResponse = await fetch("/api/uploads/service-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileType: file.type, fileSize: file.size }),
      });

      const tokenBody = await tokenResponse.json().catch(() => ({}));
      if (!tokenResponse.ok) {
        throw new Error(tokenBody.error ?? "アップロードURLの取得に失敗しました");
      }

      const { uploadUrl, publicUrl } = tokenBody as { uploadUrl: string; publicUrl: string };
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("画像のアップロードに失敗しました");
      }

      setFormState((prev) => ({ ...prev, imageUrl: publicUrl }));
    } catch (error) {
      console.error("service image upload failed", error);
      alert(error instanceof Error ? error.message : "画像のアップロードに失敗しました");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
      setUploadingImage(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-400">サービスと提携コンテンツの管理</p>
          <h1 className="text-2xl font-black text-slate-900">サービス管理</h1>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchServices} className="gap-2" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            更新
          </Button>
          <Button className="gap-2" onClick={openCreateForm}>
            <Plus className="h-4 w-4" />
            新規作成
          </Button>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-500">検索</label>
            <div className="mt-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="キーワード、カテゴリなど"
                  className="pl-10"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      setFilters((prev) => ({ ...prev, search: searchInput }));
                    }
                  }}
                />
              </div>
              <Button variant="secondary" onClick={() => setFilters((prev) => ({ ...prev, search: searchInput }))}>
                適用
              </Button>
            </div>
          </div>
          <div className="w-full lg:w-48">
            <label className="text-xs font-semibold text-slate-500">ステータス</label>
            <Select value={filters.status} onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <p className="font-semibold text-slate-500">公開中</p>
            <p className="text-xl font-black text-slate-900">{activeCount} <span className="text-xs font-medium text-slate-400">/ {services.length}</span></p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {loading ? (
          <div className="col-span-full flex items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#E91E63]" />
          </div>
        ) : services.length === 0 ? (
          <div className="col-span-full rounded-3xl border border-dashed border-slate-200 bg-white py-12 text-center text-slate-500">
            登録されたサービスがありません
          </div>
        ) : (
          services.map((service) => (
            <article key={service.id} className="group relative rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-start gap-4">
                <div className="relative h-20 w-20 overflow-hidden rounded-2xl bg-slate-100">
                  {service.imageUrl ? (
                    <Image src={service.imageUrl} alt={service.name} fill sizes="80px" className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", badgeClass(service))}>
                      {service.isActive ? "公開中" : "非公開"}
                    </span>
                    {service.category && (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        #{service.category}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">{service.name}</h2>
                  <p className="text-sm text-slate-500 line-clamp-2">{service.description}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <LinkIcon className="h-3.5 w-3.5" />
                  <a href={service.linkUrl} target="_blank" rel="noreferrer" className="truncate text-[#E91E63] hover:underline">
                    {service.linkUrl}
                  </a>
                </div>
                <div className="ml-auto flex gap-2">
                  <Button variant="ghost" size="sm" className="gap-1 text-slate-600" onClick={() => openEditForm(service)}>
                    <PencilLine className="h-4 w-4" />編集
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-rose-600"
                    onClick={() => handleDelete(service)}
                    disabled={deletingId === service.id}
                  >
                    {deletingId === service.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}削除
                  </Button>
                </div>
              </div>
            </article>
          ))
        )}
      </section>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs tracking-[0.3em] text-slate-400">SERVICE</p>
                <h2 className="text-xl font-bold text-slate-900">{editing ? "サービスを編集" : "新規サービス"}</h2>
              </div>
              <button type="button" className="text-sm text-slate-500 hover:text-slate-700" onClick={closeForm}>
                閉じる
              </button>
            </div>

            <div className="grid gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500">サービス名</label>
                <Input
                  className="mt-1"
                  value={formState.name}
                  onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">説明</label>
                <Textarea
                  rows={4}
                  className="mt-1"
                  value={formState.description}
                  onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-500">リンクURL</label>
                  <Input
                    className="mt-1"
                    value={formState.linkUrl}
                    onChange={(event) => setFormState((prev) => ({ ...prev, linkUrl: event.target.value }))}
                    placeholder="https://"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">画像URL</label>
                  <div className="mt-1 flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Input
                        className="flex-1"
                        value={formState.imageUrl}
                        onChange={(event) => setFormState((prev) => ({ ...prev, imageUrl: event.target.value }))}
                        placeholder="https://"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        className="whitespace-nowrap"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                      >
                        {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                        <span className="ml-1">アップロード</span>
                      </Button>
                    </div>
                    <p className="text-[11px] text-slate-500">URLを直接入力するか、デバイスから画像をアップロードできます。</p>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-500">カテゴリ</label>
                  <Input
                    className="mt-1"
                    value={formState.category}
                    onChange={(event) => setFormState((prev) => ({ ...prev, category: event.target.value }))}
                    placeholder="例: 健康"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">ボタン文言</label>
                  <Input
                    className="mt-1"
                    value={formState.buttonText}
                    onChange={(event) => setFormState((prev) => ({ ...prev, buttonText: event.target.value }))}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-700">公開設定</p>
                  <p className="text-xs text-slate-500">OFFにすると全ページで非表示になります</p>
                </div>
                <Switch
                  checked={formState.isActive}
                  onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, isActive: checked }))}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={closeForm} disabled={saving}>
                キャンセル
              </Button>
              <Button onClick={handleSubmit} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Boxes className="h-4 w-4" />}
                保存
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
