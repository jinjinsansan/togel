"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Gift,
  GripVertical,
  Layers,
  Loader2,
  PencilLine,
  Percent,
  Plus,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import { DragDropContext, Draggable, Droppable, DropResult } from "@hello-pangea/dnd";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { personalityTypes } from "@/lib/personality";
import { cn } from "@/lib/utils";

type ServiceOption = {
  id: string;
  name: string;
  category?: string | null;
  imageUrl?: string | null;
};
type ServiceApiResponse = {
  id: string;
  name: string;
  category?: string | null;
  imageUrl?: string | null;
};


type Recommendation = {
  id: string;
  togelTypeId: string;
  serviceId: string;
  reason: string;
  matchPercentage?: number | null;
  displayOrder: number;
  showOnResultPage: boolean;
  showOnMypage: boolean;
  isActive: boolean;
  startDate?: string | null;
  endDate?: string | null;
  service: {
    id: string;
    name: string;
    description: string;
    imageUrl?: string | null;
    linkUrl: string;
    buttonText?: string | null;
  } | null;
};

type FormState = {
  serviceId: string;
  reason: string;
  matchPercentage: number;
  showOnResultPage: boolean;
  showOnMypage: boolean;
  isActive: boolean;
  startDate: string;
  endDate: string;
};

const EMPTY_FORM: FormState = {
  serviceId: "",
  reason: "",
  matchPercentage: 80,
  showOnResultPage: true,
  showOnMypage: true,
  isActive: true,
  startDate: "",
  endDate: "",
};

const formatDate = (value?: string | null) => {
  if (!value) return "期間設定なし";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "期間設定なし";
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
};

const toInputDateTime = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const getTogelNumericLabel = (typeId?: string) => {
  if (!typeId) return "Togel??型";
  const index = personalityTypes.findIndex((type) => type.id === typeId);
  if (index === -1) return "Togel??型";
  return `Togel${String(index + 1).padStart(2, "0")}型`;
};

export default function RecommendationAdminPage() {
  const [selectedType, setSelectedType] = useState(personalityTypes[0]?.id ?? "");
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Recommendation | null>(null);
  const [formState, setFormState] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [ordering, setOrdering] = useState(false);
  const noServicesAvailable = services.length === 0;

  const selectedTypeInfo = useMemo(() => personalityTypes.find((type) => type.id === selectedType), [selectedType]);
  const selectedNumericLabel = useMemo(() => getTogelNumericLabel(selectedType), [selectedType]);

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/services?status=active");
      if (!res.ok) return;
      const data = (await res.json()) as { services?: ServiceApiResponse[] };
      const activeServices: ServiceOption[] = (data.services ?? []).map((service) => ({
        id: service.id,
        name: service.name,
        category: service.category,
        imageUrl: service.imageUrl,
      }));
      setServices(activeServices);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const fetchRecommendations = useCallback(async () => {
    if (!selectedType) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/recommendations/${selectedType}`);
      if (!res.ok) throw new Error("Failed to load recommendations");
      const data = await res.json();
      setRecommendations((data.recommendations ?? []) as Recommendation[]);
    } catch (error) {
      console.error(error);
      alert("レコメンデーションの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [selectedType]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const openCreateForm = () => {
    if (services.length === 0) {
      alert("先に「サービス管理」でサービスを追加してください");
      return;
    }
    if (recommendations.length >= 6) {
      alert("1つの型につき最大6件まで登録できます");
      return;
    }
    setEditing(null);
    setFormState({ ...EMPTY_FORM });
    setFormOpen(true);
  };

  const openEditForm = (rec: Recommendation) => {
    setEditing(rec);
    setFormState({
      serviceId: rec.serviceId,
      reason: rec.reason,
      matchPercentage: rec.matchPercentage ?? 80,
      showOnResultPage: rec.showOnResultPage,
      showOnMypage: rec.showOnMypage,
      isActive: rec.isActive,
      startDate: toInputDateTime(rec.startDate),
      endDate: toInputDateTime(rec.endDate),
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setEditing(null);
  };

  const handleSubmit = async () => {
    if (!formState.serviceId || !formState.reason) {
      alert("サービスと理由を入力してください");
      return;
    }

    const payload = {
      togelTypeId: selectedType,
      serviceId: formState.serviceId,
      reason: formState.reason,
      matchPercentage: formState.matchPercentage,
      displayOrder: editing ? editing.displayOrder : recommendations.length + 1,
      showOnResultPage: formState.showOnResultPage,
      showOnMypage: formState.showOnMypage,
      isActive: formState.isActive,
      startDate: formState.startDate ? new Date(formState.startDate).toISOString() : null,
      endDate: formState.endDate ? new Date(formState.endDate).toISOString() : null,
    };

    try {
      setSaving(true);
      const url = editing ? `/api/admin/recommendations/${editing.id}` : "/api/admin/recommendations";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "保存に失敗しました" }));
        throw new Error(body.error ?? "保存に失敗しました");
      }
      await fetchRecommendations();
      closeForm();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rec: Recommendation) => {
    if (!confirm(`「${rec.service?.name ?? "サービス"}」を削除しますか？`)) return;
    try {
      setDeletingId(rec.id);
      const res = await fetch(`/api/admin/recommendations/${rec.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("削除に失敗しました");
      await fetchRecommendations();
    } catch (error) {
      console.error(error);
      alert("削除に失敗しました");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;
    const reordered = Array.from(recommendations);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    const recalculated = reordered.map((item, index) => ({ ...item, displayOrder: index + 1 }));
    setRecommendations(recalculated);

    try {
      setOrdering(true);
      const updates = recalculated.filter((item, index) => item.id !== recommendations[index]?.id || item.displayOrder !== recommendations[index]?.displayOrder);
      await Promise.all(
        updates.map((item) =>
          fetch(`/api/admin/recommendations/${item.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ displayOrder: item.displayOrder }),
          })
        )
      );
    } catch (error) {
      console.error(error);
      alert("並び順の保存に失敗しました");
      fetchRecommendations();
    } finally {
      setOrdering(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-slate-400">Togel型別にサービスを表示</p>
          <h1 className="text-2xl font-black text-slate-900">レコメンデーション管理</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="gap-2" asChild>
            <Link href="/admin/services">
              <Layers className="h-4 w-4" /> サービスを追加
            </Link>
          </Button>
          <Button variant="outline" className="gap-2" onClick={fetchRecommendations} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            再読み込み
          </Button>
          <Button className="gap-2" onClick={openCreateForm}>
            <Plus className="h-4 w-4" />
            追加
          </Button>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-3">
          <div>
            <label className="text-xs font-semibold text-slate-500">Togel型を選択</label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="mt-1 rounded-2xl border-slate-200 bg-white/95 shadow-sm">
                <SelectValue placeholder="選択" />
              </SelectTrigger>
              <SelectContent className="max-h-72 rounded-2xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur">
                {personalityTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-900">{getTogelNumericLabel(type.id)}</span>
                      <span className="text-xs text-slate-500">{type.typeName}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold text-slate-500">現在の型</p>
            <p className="text-lg font-bold text-slate-900">{selectedNumericLabel}</p>
            <p className="text-xs text-slate-500">{selectedTypeInfo?.typeName ?? "未選択"}</p>
            {selectedTypeInfo?.catchphrase && <p className="text-[11px] text-slate-400">{selectedTypeInfo.catchphrase}</p>}
          </div>
          <div className="rounded-2xl border border-slate-100 bg-pink-50 px-4 py-3">
            <p className="text-xs font-semibold text-[#E91E63]">登録件数</p>
            <p className="text-2xl font-black text-[#E91E63]">{recommendations.length}</p>
            <p className="text-[11px] text-[#E91E63]/80">最大6件まで表示</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#E91E63]" />
          </div>
        ) : recommendations.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center text-slate-500">
            <Gift className="h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm">この型に表示されるサービスはまだありません</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="recommendations">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-4">
                  {recommendations.map((rec, index) => (
                    <Draggable draggableId={rec.id} index={index} key={rec.id}>
                      {(dragProvided) => (
                        <article
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"
                        >
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="flex items-start gap-4">
                              <button
                                type="button"
                                className="rounded-full border border-slate-200 p-2 text-slate-400 hover:text-slate-600"
                                {...dragProvided.dragHandleProps}
                              >
                                <GripVertical className="h-4 w-4" />
                              </button>
                              <div className="flex items-center gap-3">
                                <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-slate-100">
                                  {rec.service?.imageUrl ? (
                                    <Image
                                      src={rec.service.imageUrl}
                                      alt={rec.service.name}
                                      fill
                                      sizes="64px"
                                      className="object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                                      <Layers className="h-5 w-5" />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-slate-400">#{rec.displayOrder}</p>
                                  <h2 className="text-lg font-bold text-slate-900">{rec.service?.name ?? "サービス削除済み"}</h2>
                                  <p className="text-xs text-slate-500 line-clamp-2">{rec.service?.description}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" className="gap-1 text-slate-600" onClick={() => openEditForm(rec)}>
                                <PencilLine className="h-4 w-4" />
                                編集
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1 text-rose-600"
                                onClick={() => handleDelete(rec)}
                                disabled={deletingId === rec.id}
                              >
                                {deletingId === rec.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}削除
                              </Button>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-4 lg:grid-cols-4">
                            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 lg:col-span-2">
                              <p className="text-xs font-semibold text-slate-500">おすすめ理由</p>
                              <p className="text-sm text-slate-700">{rec.reason}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-100 bg-rose-50 p-4">
                              <p className="text-xs font-semibold text-rose-500 flex items-center gap-1">
                                <Percent className="h-3 w-3" />相性
                              </p>
                              <div className="mt-2 flex items-center gap-2">
                                <div className="h-2 flex-1 rounded-full bg-white">
                                  <div
                                    className="h-full rounded-full bg-[#E91E63]"
                                    style={{ width: `${Math.min(rec.matchPercentage ?? 0, 100)}%` }}
                                  />
                                </div>
                                <span className="text-sm font-bold text-[#E91E63]">{rec.matchPercentage ?? "-"}%</span>
                              </div>
                            </div>
                            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                              <p className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" />配信期間
                              </p>
                              <p className="text-sm text-slate-700">
                                {rec.startDate ? formatDate(rec.startDate) : "未設定"}
                                {rec.endDate ? ` 〜 ${formatDate(rec.endDate)}` : ""}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border",
                                rec.isActive
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                                  : "border-slate-200 bg-slate-50 text-slate-500"
                              )}
                            >
                              {rec.isActive ? "配信中" : "停止中"}
                            </span>
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border",
                                rec.showOnResultPage
                                  ? "border-[#E91E63]/30 bg-[#E91E63]/10 text-[#E91E63]"
                                  : "border-slate-200 bg-slate-50 text-slate-500"
                              )}
                            >
                              診断結果ページ
                            </span>
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border",
                                rec.showOnMypage
                                  ? "border-slate-300 bg-slate-100 text-slate-700"
                                  : "border-slate-200 bg-slate-50 text-slate-500"
                              )}
                            >
                              マイページ
                            </span>
                          </div>
                        </article>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
        {ordering && <p className="mt-3 text-right text-xs text-slate-400">並び順を保存中...</p>}
      </section>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs tracking-[0.3em] text-slate-400">RECOMMEND</p>
                <h2 className="text-xl font-bold text-slate-900">{editing ? "レコメンデーションを編集" : "新規レコメンデーション"}</h2>
              </div>
              <button type="button" className="text-sm text-slate-500 hover:text-slate-700" onClick={closeForm}>
                閉じる
              </button>
            </div>

            <div className="grid gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500">サービス</label>
                <Select value={formState.serviceId} onValueChange={(value) => setFormState((prev) => ({ ...prev, serviceId: value }))}>
                  <SelectTrigger className="mt-1 rounded-2xl border-slate-200 bg-white/95 shadow-sm">
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72 rounded-2xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur">
                    {noServicesAvailable ? (
                      <SelectItem value="no-service" disabled>
                        公開中のサービスがありません
                      </SelectItem>
                    ) : (
                      services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name}
                          {service.category ? `（${service.category}）` : ""}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {noServicesAvailable && (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
                    <span>まずは「サービス管理」でサービスを追加してください。</span>
                    <Link href="/admin/services" className="flex items-center gap-1 text-[#E91E63] font-semibold">
                      サービスを追加する <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">おすすめ理由</label>
                <Textarea
                  rows={4}
                  className="mt-1"
                  value={formState.reason}
                  onChange={(event) => setFormState((prev) => ({ ...prev, reason: event.target.value }))}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500">相性パーセンテージ</label>
                  <div className="mt-1 flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={formState.matchPercentage}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, matchPercentage: Number(event.target.value) || 0 }))
                      }
                    />
                    <span className="text-sm text-slate-500">%</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">開始日時</label>
                  <Input
                    type="datetime-local"
                    className="mt-1"
                    value={formState.startDate}
                    onChange={(event) => setFormState((prev) => ({ ...prev, startDate: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">終了日時</label>
                  <Input
                    type="datetime-local"
                    className="mt-1"
                    value={formState.endDate}
                    onChange={(event) => setFormState((prev) => ({ ...prev, endDate: event.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="text-sm font-semibold text-slate-700">診断結果ページ</span>
                  <Switch
                    checked={formState.showOnResultPage}
                    onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, showOnResultPage: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="text-sm font-semibold text-slate-700">マイページ</span>
                  <Switch
                    checked={formState.showOnMypage}
                    onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, showOnMypage: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="text-sm font-semibold text-slate-700">配信ステータス</span>
                  <Switch
                    checked={formState.isActive}
                    onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, isActive: checked }))}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={closeForm} disabled={saving}>
                キャンセル
              </Button>
              <Button className="gap-2" onClick={handleSubmit} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                保存
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
