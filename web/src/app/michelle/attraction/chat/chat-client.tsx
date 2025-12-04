"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Loader2, Menu, MessageSquare, Plus, Send, Share2, Trash2, User, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MichelleAvatar } from "@/components/michelle/avatar";
import {
  ATTRACTION_SECTIONS,
  sectionsByLevel,
  formatSectionLabel,
  PROGRESS_STATUSES,
  type ProgressStatus,
} from "@/lib/michelle-attraction/sections";

type PsychologyRecommendationState = "none" | "suggested" | "acknowledged" | "dismissed" | "resolved";

type SessionProgressSnapshot = {
  current_level: number;
  current_section: number;
  progress_status: ProgressStatus;
  progress_code: string | null;
  updated_at: string;
  emotional_state: "stable" | "concern" | "critical";
  emotional_score: number;
  psychology_recommendation: PsychologyRecommendationState;
};

type SessionSummary = {
  id: string;
  title: string | null;
  category: string;
  updated_at: string;
  progress?: SessionProgressSnapshot | null;
};

type MessageItem = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
  pending?: boolean;
};

type MessagesResponse = {
  session: Pick<SessionSummary, "id" | "title" | "category">;
  messages: MessageItem[];
};

type SessionsResponse = {
  sessions: SessionSummary[];
};

type ProgressEntry = {
  id: string;
  session_id: string;
  current_level: number;
  current_section: number;
  progress_status: ProgressStatus;
  progress_code: string | null;
  notes: string | null;
  updated_at: string;
   emotional_state: "stable" | "concern" | "critical";
   emotional_score: number;
   psychology_recommendation: PsychologyRecommendationState;
   psychology_recommendation_reason: string | null;
   psychology_prompted_at: string | null;
   psychology_opt_out_until: string | null;
};

type ProgressNote = {
  id: string;
  note_type: string;
  content: string;
  related_level: number | null;
  related_section: number | null;
  created_at: string;
};

type ProgressResponse = {
  progress: ProgressEntry | null;
  notes: ProgressNote[];
};

type SSEKnowledge = {
  id: string;
  content?: string;
  metadata?: Record<string, unknown> | null;
  similarity?: number;
};

type StreamPayload = {
  type: "meta" | "delta" | "done" | "error";
  content?: string;
  message?: string;
  sessionId?: string;
  knowledge?: SSEKnowledge[];
};

const ACTIVE_SESSION_STORAGE_KEY = "michelle-attraction-active-session-id";

const initialPrompts = [
  "理想の収入を引き寄せるヒントは？",
  "魂レベルで望む出会いを叶えたい",
  "波動を整えて不安を手放したい",
  "叶えたい夢を具体化してみたい",
];

const thinkingMessages = [
  "波動を整えています...",
  "宇宙のサインを整理しています...",
  "意図と行動を結びつけています...",
  "叶うイメージを磨いています...",
];

const STATUS_LABELS: Record<ProgressStatus, string> = {
  OK: "理解済み",
  IP: "学習中",
  RV: "要復習",
};

const EMOTIONAL_STATE_LABELS = {
  stable: "穏やか",
  concern: "注意",
  critical: "緊急",
} as const;

const PSYCHOLOGY_STATE_LABELS: Record<PsychologyRecommendationState, string> = {
  none: "通常モード",
  suggested: "心理学推奨中",
  acknowledged: "心理学ケアへ移行",
  dismissed: "ユーザーが継続を選択",
  resolved: "感情ケア完了",
};

const noteTypeOptions = [
  { value: "comprehension", label: "理解の壁" },
  { value: "emotion", label: "感情の揺らぎ" },
  { value: "action", label: "行動の詰まり" },
  { value: "success", label: "引き寄せ成功" },
  { value: "other", label: "その他" },
];

export function MichelleAttractionChatClient() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState({ sessions: false, messages: false, sending: false });
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentThinkingIndex, setCurrentThinkingIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [hasInitializedSessions, setHasInitializedSessions] = useState(false);
  const [hasLoadedMessages, setHasLoadedMessages] = useState(false);
  const [progress, setProgress] = useState<ProgressEntry | null>(null);
  const [progressNotes, setProgressNotes] = useState<ProgressNote[]>([]);
  const [progressForm, setProgressForm] = useState({
    level: 1,
    section: 1,
    status: "IP" as ProgressStatus,
    notes: "",
  });
  const [noteForm, setNoteForm] = useState({ noteType: "comprehension", content: "" });
  const [isProgressFormOpen, setIsProgressFormOpen] = useState(false);
  const [isNoteFormOpen, setIsNoteFormOpen] = useState(false);
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [psychologyActionLoading, setPsychologyActionLoading] = useState<null | "acknowledge" | "dismiss" | "resolve">(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);
  const autoScrollRef = useRef(true);
  const scrollFrameRef = useRef<number>();
  const [composerHeight, setComposerHeight] = useState(0);
  const hasRestoredSessionRef = useRef(false);

  const activeSession = useMemo(() => sessions.find((session) => session.id === activeSessionId) ?? null, [
    sessions,
    activeSessionId,
  ]);
  const sessionFromProgress = progress?.session_id ?? null;
  const activeRecommendation = progress?.psychology_recommendation ?? "none";
  const shouldShowPsychologyBanner = activeRecommendation === "suggested" || activeRecommendation === "acknowledged";

  const loadSessions = useCallback(async () => {
    setIsLoading((prev) => ({ ...prev, sessions: true }));
    try {
      const res = await fetch("/api/michelle-attraction/sessions");
      if (res.status === 401) {
        setNeedsAuth(true);
        return;
      }
      if (!res.ok) throw new Error("Failed to load sessions");
      const data = (await res.json()) as SessionsResponse;
      setSessions(data.sessions ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading((prev) => ({ ...prev, sessions: false }));
      setHasInitializedSessions(true);
    }
  }, []);

  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch("/api/michelle-attraction/progress");
      if (res.status === 401) {
        setNeedsAuth(true);
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to load progress");
      }
      const data = (await res.json()) as ProgressResponse;
      const progressPayload = data.progress ?? null;
      setProgress(progressPayload);
      setProgressNotes(data.notes ?? []);
      if (progressPayload) {
        setProgressForm((prev) => ({
          ...prev,
          level: progressPayload.current_level,
          section: progressPayload.current_section,
          status: progressPayload.progress_status,
          notes: progressPayload.notes ?? "",
        }));
      }
    } catch (err) {
      console.error("Failed to fetch progress", err);
    }
  }, []);

  const loadMessages = useCallback(
    async (sessionId: string) => {
      console.log("[loadMessages] Starting to load messages for session:", sessionId);
      setIsLoading((prev) => ({ ...prev, messages: true }));
      try {
        const res = await fetch(`/api/michelle-attraction/sessions/${sessionId}/messages`);
        console.log("[loadMessages] Response status:", res.status);
        
        if (res.status === 401) {
          console.log("[loadMessages] Unauthorized - setting needsAuth");
          setNeedsAuth(true);
          setHasLoadedMessages(true);
          return;
        }
        if (res.status === 404) {
          console.log("[loadMessages] Session not found - clearing activeSessionId");
          setActiveSessionId(null);
           setHasLoadedMessages(true);
          return;
        }
        if (!res.ok) throw new Error("Failed to load messages");
        
        const data = (await res.json()) as MessagesResponse;
        console.log("[loadMessages] Received data:", {
          sessionId: data.session?.id,
          messagesCount: data.messages?.length ?? 0,
          firstMessage: data.messages?.[0]?.content?.substring(0, 50)
        });
        
        setMessages(data.messages ?? []);
        setHasLoadedMessages(true);
        console.log("[loadMessages] Messages state updated with", data.messages?.length ?? 0, "messages");
      } catch (err) {
        console.error("[loadMessages] Error loading messages:", err);
      } finally {
        setIsLoading((prev) => ({ ...prev, messages: false }));
        console.log("[loadMessages] Loading complete");
      }
    },
    [],
  );

  const determineSessionForProgress = useCallback(() => {
    if (activeSessionId) return activeSessionId;
    if (sessionFromProgress) return sessionFromProgress;
    return sessions[0]?.id ?? null;
  }, [activeSessionId, sessionFromProgress, sessions]);

  useEffect(() => {
    console.log("[Mount] Component mounted");
    setIsMounted(true);
    setIsMobile(window.innerWidth < 768);
    
    // モバイルでは初回ロード時に意図しないフォーカスを防ぐ
    if (window.innerWidth < 768 && textareaRef.current) {
      textareaRef.current.blur();
      console.log("[Mount] Mobile: textarea blur applied to prevent unwanted keyboard");
    }
    
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    console.log("[Sessions] Loading sessions...");
    loadSessions();
    fetchProgress();
  }, [loadSessions, fetchProgress]);

  useEffect(() => {
    console.log(
      "[Session Restore] Effect triggered - isMounted:",
      isMounted,
      "hasRestored:",
      hasRestoredSessionRef.current,
      "sessions.length:",
      sessions.length,
      "initialized:",
      hasInitializedSessions,
    );

    if (!isMounted) {
      console.log("[Session Restore] Skipped - not mounted yet");
      return;
    }
    if (hasRestoredSessionRef.current) {
      console.log("[Session Restore] Skipped - already restored");
      return;
    }
    if (!hasInitializedSessions) {
      console.log("[Session Restore] Skipped - sessions not initialized yet");
      return;
    }
    if (sessions.length === 0) {
      console.log("[Session Restore] No sessions available - finishing restore state");
      hasRestoredSessionRef.current = true;
      setIsRestoringSession(false);
      return;
    }

    try {
      const storedSessionId = window.localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
      console.log("[Session Restore] Stored ID:", storedSessionId, "Sessions count:", sessions.length);
      
      if (storedSessionId) {
        const exists = sessions.some((s) => s.id === storedSessionId);
        console.log("[Session Restore] Session exists:", exists);
        
        if (exists) {
          console.log("[Session Restore] Restoring session:", storedSessionId);
          setActiveSessionId(storedSessionId);
        } else {
          console.log("[Session Restore] Session not found in sessions array");
        }
      } else {
        console.log("[Session Restore] No stored session ID found");
      }
    } catch (error) {
      console.error("[Session Restore] Failed to restore session:", error);
    }
    
    hasRestoredSessionRef.current = true;
    setIsRestoringSession(false);
    console.log("[Session Restore] Flag set to true, restoration complete");
  }, [isMounted, sessions, hasInitializedSessions]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  useEffect(() => {
    console.log("[Save Session] Effect triggered - isMounted:", isMounted, "activeSessionId:", activeSessionId);
    
    if (!isMounted) {
      console.log("[Save Session] Skipped - not mounted yet");
      return;
    }
    
    if (!activeSessionId) {
      console.log("[Save Session] Skipped - activeSessionId is null (keeping existing localStorage)");
      return;
    }
    
    try {
      console.log("[Save Session] Saving to localStorage:", activeSessionId);
      window.localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, activeSessionId);
      console.log("[Save Session] Saved successfully");
    } catch (error) {
      console.error("[Save Session] Failed to save session:", error);
    }
  }, [isMounted, activeSessionId]);

  useEffect(() => {
    if (!composerRef.current) return;

    const updateHeight = () => {
      if (composerRef.current) {
        setComposerHeight(composerRef.current.offsetHeight);
      }
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(composerRef.current);

    return () => observer.disconnect();
  }, []);

  const scheduleScrollToBottom = useCallback(() => {
    if (!autoScrollRef.current) return;
    if (scrollFrameRef.current) cancelAnimationFrame(scrollFrameRef.current);
    scrollFrameRef.current = requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    });
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const distanceFromBottom = container.scrollHeight - (container.scrollTop + container.clientHeight);
      autoScrollRef.current = distanceFromBottom < 120;
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current) cancelAnimationFrame(scrollFrameRef.current);
    };
  }, []);

  useEffect(() => {
    if (isLoading.sending) return;

    console.log("[Load Messages] activeSessionId:", activeSessionId);

    if (activeSessionId) {
      setHasLoadedMessages(false);
      console.log("[Load Messages] Loading messages for:", activeSessionId);
      loadMessages(activeSessionId);
    } else {
      console.log("[Load Messages] Clearing messages (no active session)");
      setMessages([]);
      setHasLoadedMessages(true);
    }
  }, [activeSessionId, isLoading.sending, loadMessages]);

  useLayoutEffect(() => {
    if (messages.length === 0) return;
    scheduleScrollToBottom();
  }, [messages.length, scheduleScrollToBottom]);

  useEffect(() => {
    if (!messages.some((msg) => msg.pending)) return;
    const interval = setInterval(() => {
      setCurrentThinkingIndex((prev) => (prev + 1) % thinkingMessages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [messages]);

  const handleSaveProgress = async () => {
    const targetSessionId = determineSessionForProgress();
    if (!targetSessionId) {
      setError("先にチャットを開始してから進捗を登録してください。");
      return;
    }
    setIsSavingProgress(true);
    setError(null);
    try {
      const res = await fetch("/api/michelle-attraction/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: targetSessionId,
          level: progressForm.level,
          section: progressForm.section,
          status: progressForm.status,
          notes: progressForm.notes?.trim() ? progressForm.notes.trim() : undefined,
        }),
      });

      if (res.status === 401) {
        setNeedsAuth(true);
        throw new Error("ログインしてください");
      }

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "進捗の保存に失敗しました");
      }

      await fetchProgress();
      setIsProgressFormOpen(false);
      setError("✓ 進捗を更新しました");
      setTimeout(() => setError(null), 2000);
    } catch (saveError) {
      console.error("Progress save error", saveError);
      setError(saveError instanceof Error ? saveError.message : "進捗の保存に失敗しました");
    } finally {
      setIsSavingProgress(false);
    }
  };

  const handleSaveNote = async () => {
    const content = noteForm.content.trim();
    if (!content) {
      setError("記録内容を入力してください");
      return;
    }

    const targetSessionId = determineSessionForProgress();
    if (!targetSessionId && !progress?.id) {
      setError("先に進捗を登録してください");
      return;
    }

    setIsSavingNote(true);
    setError(null);

    try {
      const res = await fetch("/api/michelle-attraction/progress/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          progressId: progress?.id,
          sessionId: targetSessionId ?? undefined,
          noteType: noteForm.noteType,
          content,
          relatedLevel: progressForm.level,
          relatedSection: progressForm.section,
        }),
      });

      if (res.status === 401) {
        setNeedsAuth(true);
        throw new Error("ログインしてください");
      }

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "記録の保存に失敗しました");
      }

      setNoteForm((prev) => ({ ...prev, content: "" }));
      setIsNoteFormOpen(false);
      await fetchProgress();
      setError("✓ 記録しました");
      setTimeout(() => setError(null), 2000);
    } catch (noteError) {
      console.error("Progress note error", noteError);
      setError(noteError instanceof Error ? noteError.message : "記録の保存に失敗しました");
    } finally {
      setIsSavingNote(false);
    }
  };

  const handlePsychologyAction = async (action: "acknowledge" | "dismiss" | "resolve") => {
    const targetSessionId = determineSessionForProgress();
    if (!targetSessionId) {
      setError("まずチャットを開始してからご利用ください。");
      return;
    }

    setPsychologyActionLoading(action);
    setError(null);

    try {
      const res = await fetch("/api/michelle-attraction/progress/recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: targetSessionId, action }),
      });

      if (res.status === 401) {
        setNeedsAuth(true);
        throw new Error("ログインしてください");
      }

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "処理に失敗しました");
      }

      const data = (await res.json().catch(() => ({ progress: null }))) as { progress: ProgressEntry | null };
      const updatedProgress = data.progress ?? null;
      setProgress(updatedProgress);
      if (updatedProgress) {
        setProgressForm((prev) => ({
          ...prev,
          level: updatedProgress.current_level,
          section: updatedProgress.current_section,
          status: updatedProgress.progress_status,
          notes: updatedProgress.notes ?? "",
        }));
      }

      fetchProgress();

      if (action === "acknowledge") {
        window.location.href = "/michelle/chat?from=attraction";
      }
    } catch (actionError) {
      console.error("Psychology action error", actionError);
      setError(actionError instanceof Error ? actionError.message : "処理に失敗しました");
    } finally {
      setPsychologyActionLoading(null);
    }
  };

  const handleNewChat = () => {
    console.log("[User Action] New chat clicked - clearing session");
    setActiveSessionId(null);
    setMessages([]);
    setError(null);
    setHasLoadedMessages(true);
    hasRestoredSessionRef.current = false;
    
    // 新しいチャットの場合のみlocalStorageを削除
    try {
      window.localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
      console.log("[User Action] localStorage cleared for new chat");
    } catch (error) {
      console.error("[User Action] Failed to clear localStorage:", error);
    }
    
    // モバイルでは自動フォーカスしない（キーボードがURLバーに被る問題を防ぐ）
    if (!isMobile) {
      textareaRef.current?.focus();
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading.sending) return;
    
    // pending メッセージがある場合は送信不可
    if (messages.some((msg) => msg.pending)) {
      console.log("[Send] Blocked - AI is still responding");
      return;
    }

    const text = input.trim();
    setInput("");
    setError(null);
    
    // モバイルでは送信後にキーボードを閉じる
    if (isMobile && textareaRef.current) {
      textareaRef.current.blur();
    }

    const tempUserId = `user-${Date.now()}`;
    const tempAiId = `ai-${Date.now()}`;
    const timestamp = new Date().toISOString();

    setMessages((prev) => [
      ...prev,
      { id: tempUserId, role: "user", content: text, created_at: timestamp },
      { id: tempAiId, role: "assistant", content: "", created_at: timestamp, pending: true },
    ]);

    setIsLoading((prev) => ({ ...prev, sending: true }));

    try {
      const res = await fetch("/api/michelle-attraction/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: activeSessionId ?? undefined, message: text }),
      });

      if (!res.ok || !res.body) {
        let serverMessage = "ネットワークエラーが発生しました";
        try {
          const errorBody = (await res.json()) as { error?: string };
          if (errorBody?.error) {
            serverMessage = errorBody.error;
          }
          // 429エラーの場合は特別な処理
          if (res.status === 429) {
            console.log("[Send] Rate limited - AI still responding");
          }
        } catch (parseError) {
          console.error("Failed to parse error response", parseError);
        }
        throw new Error(serverMessage);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiContent = "";
      let resolvedSessionId = activeSessionId;
      let streamCompleted = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const events = chunk.split("\n\n").filter(Boolean);

        for (const event of events) {
          if (!event.startsWith("data:")) continue;
          try {
            const payload = JSON.parse(event.slice(5)) as StreamPayload;
            if (payload.type === "meta") {
              if (payload.sessionId) {
                resolvedSessionId = payload.sessionId;
                if (!activeSessionId) {
                  setActiveSessionId(payload.sessionId);
                  loadSessions();
                  fetchProgress();
                }
              }
            }
            if (payload.type === "delta" && payload.content) {
              aiContent += payload.content;
              setMessages((prev) => prev.map((msg) => (msg.id === tempAiId ? { ...msg, content: aiContent } : msg)));
            }
            if (payload.type === "done") {
              streamCompleted = true;
              console.log("[Stream] Completed successfully");
            }
            if (payload.type === "error") {
              throw new Error(payload.message ?? "AI応答中にエラーが発生しました");
            }
          } catch (err) {
            console.error("Failed to parse stream payload", err);
          }
        }
      }

      // ストリーム完了を確認
      if (!streamCompleted) {
        console.warn("[Stream] Ended without 'done' event");
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempAiId
            ? { ...msg, content: aiContent || "少し時間をおいてもう一度お試しください。", pending: false }
            : msg,
        ),
      );

      if (!activeSessionId && resolvedSessionId) {
        setActiveSessionId(resolvedSessionId);
      }
    } catch (err) {
      console.error(err);
      const friendlyError = err instanceof Error ? err.message : "送信に失敗しました";
      setError(friendlyError);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempAiId ? { ...msg, content: "申し訳ありません。もう一度送ってみてください。", pending: false } : msg,
        ),
      );
    } finally {
      // ローディング状態を解除する前に少し待機
      setTimeout(() => {
        setIsLoading((prev) => ({ ...prev, sending: false }));
        console.log("[Send] Loading state released");
      }, 300);
    }
  };

  const handleDeleteSession = async (sessionId: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    if (!confirm("このチャット履歴を削除しますか？\n削除後は復元できません。")) return;
    
    const wasActive = activeSessionId === sessionId;
    
    try {
      const res = await fetch(`/api/michelle-attraction/sessions/${sessionId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete session");
      
      console.log("[Delete] Session deleted:", sessionId);
      setSessions((prev) => prev.filter((session) => session.id !== sessionId));
      
      if (wasActive) {
        console.log("[Delete] Deleted active session, creating new chat");
        handleNewChat();
        // アクティブセッションを削除した場合はモバイルサイドバーも閉じる
        if (isMobile) {
          setIsSidebarOpen(false);
        }
      }
    } catch (err) {
      console.error("[Delete] Failed to delete session:", err);
      setError("削除に失敗しました。もう一度お試しください。");
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleShare = async () => {
    if (!messages.length) return;
    const text = messages
      .map((m) => `${m.role === "user" ? "あなた" : "ミシェル引き寄せ"}: ${m.content}`)
      .join("\n\n");
    
    try {
      await navigator.clipboard.writeText(text);
      // Toast通知の代わりに一時的なメッセージを表示
      setError("✓ 会話内容をコピーしました");
      setTimeout(() => setError(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      setError("コピーに失敗しました");
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      // AIが応答中は送信不可
      if (!messages.some((msg) => msg.pending)) {
        handleSendMessage();
      }
    }
  };

  const cleanContent = (content: string) => {
    let cleaned = content.replace(/【\d+:\d+†.*?】/g, "");
    cleaned = cleaned.replace(/【参考[：:][^】]*】/g, "");
    return cleaned;
  };

  if (needsAuth) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-br from-[#e0f2fe] to-[#cfe9ff]">
        <div className="rounded-3xl bg-white px-10 py-12 text-center shadow-2xl">
          <p className="text-lg font-semibold text-[#0f4c81]">ログインが必要です</p>
          <p className="mt-4 text-sm text-[#1f5c82]">ミシェル引き寄せAIをご利用いただくにはログインしてください。</p>
        </div>
      </div>
    );
  }

  const showGlobalLoader =
    !isMounted ||
    isRestoringSession ||
    (messages.length === 0 && !hasLoadedMessages && (isLoading.messages || (isLoading.sessions && sessions.length === 0)));

  if (showGlobalLoader) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-br from-[#f0f9ff] via-[#e0f2fe] to-[#dbeafe]">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#38bdf8]" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex w-full flex-1 items-stretch bg-gradient-to-br from-[#f0f9ff] via-[#e0f2fe] to-[#dbeafe] text-[#0f2f4d]"
      style={{
        minHeight: "calc(100vh - 4rem)",
        height: "calc(100vh - 4rem)",
        maxHeight: "calc(100vh - 4rem)",
      }}
    >
      <aside
        className="hidden w-[260px] min-w-[260px] flex-col border-r border-[#cfe8ff] bg-white/90 px-4 py-6 shadow-sm md:flex md:sticky md:top-16 md:self-start md:overflow-y-auto"
        style={{ height: "calc(100vh - 4rem)" }}
      >
        <Button
          onClick={handleNewChat}
          disabled={isLoading.sending}
          className="mb-6 w-full justify-start gap-2 rounded-2xl border border-[#cfe8ff] bg-[#f7fbff] text-[#0f4c81] shadow-sm hover:bg-white"
        >
          <Plus className="h-4 w-4" /> 新しいチャット
        </Button>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#5ba4d8]">チャット</p>
        <div className="flex-1 overflow-y-auto">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => {
                console.log("[User Action] Desktop: Clicked on session:", session.id);
                setActiveSessionId(session.id);
              }}
              className={cn(
                "group flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left text-sm transition-all mb-2",
                session.id === activeSessionId
                  ? "border-[#b7e0ff] bg-[#edf7ff] text-[#0c4a6e]"
                  : "border-transparent bg-transparent text-[#35648a] hover:border-[#cfe9ff] hover:bg-[#f8fbff]",
              )}
            >
              <div className="flex min-w-0 items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <div className="min-w-0">
                  <span className="block truncate">{session.title || "新しいチャット"}</span>
                  {session.progress && (
                    <span className="mt-0.5 block text-[11px] text-[#6da6c6]">
                      {formatSectionLabel(session.progress.current_level, session.progress.current_section)} ・
                      {STATUS_LABELS[session.progress.progress_status]}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={(event) => handleDeleteSession(session.id, event)}
                className="rounded-full p-1 text-[#7bb8dd] opacity-0 transition group-hover:opacity-100 hover:bg-white"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </button>
          ))}
          {sessions.length === 0 && !isLoading.sessions && (
            <p className="text-center text-xs text-[#6a9cc4]">まだチャット履歴がありません。</p>
          )}
        </div>
        {/* user info removed */}
      </aside>

      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setIsSidebarOpen(false)} />
          <div className="relative ml-auto flex h-full w-[80%] max-w-[300px] flex-col border-l border-[#d3ecff] bg-white/95 px-4 py-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-[#0f4c81]">履歴</span>
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <Button
              onClick={() => {
                handleNewChat();
                setIsSidebarOpen(false);
              }}
              disabled={isLoading.sending}
              className="mb-4 gap-2 rounded-2xl border border-[#cfe8ff] bg-[#f7fbff] text-[#0f4c81] hover:bg-white"
            >
              <Plus className="h-4 w-4" /> 新しいチャット
            </Button>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#5ba4d8]">チャット</p>
            <div className="flex-1 overflow-y-auto">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => {
                    console.log("[User Action] Mobile: Clicked on session:", session.id);
                    setActiveSessionId(session.id);
                    setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "group flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left text-sm transition-all mb-2",
                    session.id === activeSessionId
                      ? "border-[#b7e0ff] bg-[#edf7ff] text-[#0c4a6e]"
                      : "border-transparent bg-transparent text-[#35648a] hover:border-[#cfe9ff] hover:bg-[#f8fbff]"
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <div className="min-w-0">
                      <span className="block truncate">{session.title || "新しいチャット"}</span>
                      {session.progress && (
                        <span className="mt-0.5 block text-[11px] text-[#6da6c6]">
                          {formatSectionLabel(session.progress.current_level, session.progress.current_section)} ・
                          {STATUS_LABELS[session.progress.progress_status]}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => handleDeleteSession(session.id, event)}
                    className="rounded-full p-1 text-[#7bb8dd] transition hover:bg-white"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </button>
              ))}
              {sessions.length === 0 && !isLoading.sessions && (
                <p className="text-center text-xs text-[#6a9cc4]">まだチャット履歴がありません。</p>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-white/75 touch-auto overscroll-none">
        <header className="flex items-center justify-between border-b border-[#d8efff] px-4 py-3 text-sm text-[#1f5c82]">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full border border-[#cfe8ff] bg-white text-[#38bdf8] hover:bg-[#f1f9ff] md:hidden"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            <span className="font-semibold text-[#0f4c81]">{activeSession?.title || "ミシェル引き寄せAI"}</span>
            {isLoading.messages && messages.length === 0 && <Loader2 className="h-4 w-4 animate-spin text-[#7fb3dd]" />}
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" className="text-[#2c769f]" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" /> 共有
            </Button>
          )}
        </header>

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto bg-gradient-to-b from-white via-[#e6f4ff] to-[#e5f0ff]"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className="px-4 pt-4">
            <div className="rounded-3xl border border-[#d1e7ff] bg-white/80 p-4 text-sm shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#5ba4d8]">現在の進捗</p>
                  {progress ? (
                    <>
                      <p className="mt-1 text-lg font-semibold text-[#0f4c81]">
                        {formatSectionLabel(progress.current_level, progress.current_section)}
                      </p>
                      <p className="text-xs text-[#3c6a92]">
                        {STATUS_LABELS[progress.progress_status]}
                        {progress.progress_code ? ` / ${progress.progress_code}` : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-[#386087]">
                        <span>
                          感情: {EMOTIONAL_STATE_LABELS[progress.emotional_state]} (score {progress.emotional_score})
                        </span>
                        {progress.psychology_recommendation !== "none" && (
                          <span>
                            心理学: {PSYCHOLOGY_STATE_LABELS[progress.psychology_recommendation]}
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-[#417aa8]">まだ進捗が記録されていません。最初の診断が完了すると自動で表示されます。</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full border-[#cde2ff] text-[#0f4c81] hover:bg-[#f0f7ff]"
                    onClick={() => setIsProgressFormOpen((prev) => !prev)}
                  >
                    進捗を編集
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full border-[#cde2ff] text-[#0f4c81] hover:bg-[#f0f7ff]"
                    onClick={() => setIsNoteFormOpen((prev) => !prev)}
                  >
                    記録する
                  </Button>
                </div>
              </div>
              {isProgressFormOpen && (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-[#4a7ba3]">レベル</label>
                    <select
                      className="mt-1 w-full rounded-2xl border border-[#d0e6ff] bg-white/60 px-3 py-2 text-sm text-[#0f2f4d] focus:border-[#9ac9ff] focus:outline-none"
                      value={progressForm.level}
                      onChange={(event) => {
                        const nextLevel = Number(event.target.value);
                        const nextSection = sectionsByLevel[nextLevel]?.[0]?.section ?? progressForm.section;
                        setProgressForm((prev) => ({ ...prev, level: nextLevel, section: nextSection }));
                      }}
                    >
                      {[1, 2, 3, 4, 5].map((level) => (
                        <option key={level} value={level}>
                          レベル{level}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#4a7ba3]">セクション</label>
                    <select
                      className="mt-1 w-full rounded-2xl border border-[#d0e6ff] bg-white/60 px-3 py-2 text-sm text-[#0f2f4d] focus:border-[#9ac9ff] focus:outline-none"
                      value={progressForm.section}
                      onChange={(event) => setProgressForm((prev) => ({ ...prev, section: Number(event.target.value) }))}
                    >
                      {(sectionsByLevel[progressForm.level] ?? ATTRACTION_SECTIONS.filter(
                        (section) => section.level === progressForm.level,
                      )).map((section) => (
                        <option key={section.section} value={section.section}>
                          {section.section}. {section.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#4a7ba3]">ステータス</label>
                    <select
                      className="mt-1 w-full rounded-2xl border border-[#d0e6ff] bg-white/60 px-3 py-2 text-sm text-[#0f2f4d] focus:border-[#9ac9ff] focus:outline-none"
                      value={progressForm.status}
                      onChange={(event) =>
                        setProgressForm((prev) => ({ ...prev, status: event.target.value as ProgressStatus }))
                      }
                    >
                      {PROGRESS_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-[#4a7ba3]">補足メモ</label>
                    <textarea
                      className="mt-1 w-full rounded-2xl border border-[#d0e6ff] bg-white/60 px-3 py-2 text-sm text-[#0f2f4d] focus:border-[#9ac9ff] focus:outline-none"
                      rows={2}
                      value={progressForm.notes}
                      onChange={(event) => setProgressForm((prev) => ({ ...prev, notes: event.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-2 flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsProgressFormOpen(false)}>
                      キャンセル
                    </Button>
                    <Button size="sm" onClick={handleSaveProgress} disabled={isSavingProgress}>
                      {isSavingProgress ? "保存中..." : "保存"}
                    </Button>
                  </div>
                </div>
              )}
              {isNoteFormOpen && (
                <div className="mt-4 space-y-3 border-t border-dashed border-[#d2e8ff] pt-4">
                  <div>
                    <label className="text-xs font-semibold text-[#4a7ba3]">記録の種類</label>
                    <select
                      className="mt-1 w-full rounded-2xl border border-[#d0e6ff] bg-white/60 px-3 py-2 text-sm text-[#0f2f4d] focus:border-[#9ac9ff] focus:outline-none"
                      value={noteForm.noteType}
                      onChange={(event) => setNoteForm((prev) => ({ ...prev, noteType: event.target.value }))}
                    >
                      {noteTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#4a7ba3]">内容</label>
                    <textarea
                      className="mt-1 w-full rounded-2xl border border-[#d0e6ff] bg-white/60 px-3 py-2 text-sm text-[#0f2f4d] focus:border-[#9ac9ff] focus:outline-none"
                      rows={2}
                      value={noteForm.content}
                      onChange={(event) => setNoteForm((prev) => ({ ...prev, content: event.target.value }))}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsNoteFormOpen(false)}>
                      キャンセル
                    </Button>
                    <Button size="sm" onClick={handleSaveNote} disabled={isSavingNote}>
                      {isSavingNote ? "保存中..." : "記録"}
                    </Button>
                  </div>
                </div>
              )}
              {progressNotes.length > 0 && (
                <div className="mt-4 border-t border-dashed border-[#d2e8ff] pt-4">
                  <p className="text-xs font-semibold text-[#4a7ba3]">最近のメモ</p>
                  <ul className="mt-2 space-y-2 text-sm text-[#1f5c82]">
                    {progressNotes.slice(0, 3).map((note) => (
                      <li key={note.id} className="rounded-2xl bg-[#f5fbff] px-3 py-2">
                        <div className="flex items-center justify-between text-xs text-[#4f80aa]">
                          <span>
                            {noteTypeOptions.find((option) => option.value === note.note_type)?.label ?? note.note_type}
                          </span>
                          <span>
                            {new Date(note.created_at).toLocaleString("ja-JP", {
                              month: "numeric",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-[#0f2f4d]">{note.content}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          {shouldShowPsychologyBanner && progress && (
            <div className="px-4">
              <div className="mt-4 rounded-3xl border border-rose-200 bg-rose-50/90 p-4 text-sm text-[#571326] shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#b4233b]">感情ケアのご提案</p>
                <p className="mt-1 text-base font-semibold text-[#7a1531]">
                  {progress.psychology_recommendation === "acknowledged"
                    ? "まずはミシェル心理学で整えましょう"
                    : "ネガティブ感情が強まっています"}
                </p>
                <p className="mt-1 text-sm text-[#6b1e33]">
                  {progress.psychology_recommendation === "acknowledged"
                    ? "感情のブロックを解放した後に改めて引き寄せを進めると、受け取りたい現実をスムーズに招きやすくなります。"
                    : "ネガティブが強いまま進めると望まない現実まで引き寄せてしまいます。心理学で心を整えるか、今回は続けるかを一緒に選びましょう。"}
                </p>
                {progress.psychology_recommendation_reason && (
                  <p className="mt-2 rounded-2xl bg-white/70 px-3 py-2 text-xs text-[#7e1f31]">
                    {progress.psychology_recommendation_reason}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {progress.psychology_recommendation === "suggested" && (
                    <>
                      <Button
                        size="sm"
                        className="rounded-full bg-[#e11d48] text-white hover:bg-[#be123c]"
                        onClick={() => handlePsychologyAction("acknowledge")}
                        disabled={psychologyActionLoading === "acknowledge"}
                      >
                        {psychologyActionLoading === "acknowledge" ? "移動準備中..." : "ミシェル心理学で整える"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[#7a1531] hover:bg-rose-100"
                        onClick={() => handlePsychologyAction("dismiss")}
                        disabled={psychologyActionLoading === "dismiss"}
                      >
                        {psychologyActionLoading === "dismiss" ? "更新中..." : "今回はこのまま続ける"}
                      </Button>
                    </>
                  )}
                  {progress.psychology_recommendation === "acknowledged" && (
                    <>
                      <Button
                        size="sm"
                        className="rounded-full bg-[#e11d48] text-white hover:bg-[#be123c]"
                        onClick={() => {
                          window.location.href = "/michelle/chat?from=attraction";
                        }}
                      >
                        心理学チャットを開く
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[#7a1531] hover:bg-rose-100"
                        onClick={() => handlePsychologyAction("resolve")}
                        disabled={psychologyActionLoading === "resolve"}
                      >
                        {psychologyActionLoading === "resolve" ? "更新中..." : "感情ケア完了・再開する"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          {messages.length === 0 ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center gap-6 px-4 text-center">
              <MichelleAvatar size="lg" variant="aqua" />
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-[#0f4c81]">こんにちは、ミシェル引き寄せです</h2>
                <p className="text-sm text-[#1f5c82]">
                  叶えたい未来・受け取りたい現実を遠慮なく教えてください。<br />
                  願望の言語化から波動を整えるセルフワークまで一緒にデザインします。
                </p>
              </div>
              <div className="grid w-full max-w-2xl gap-3 px-6 md:grid-cols-2">
                {initialPrompts.slice(0, isMobile ? 2 : 4).map((prompt) => (
                  <button
                    key={prompt}
                    disabled={isLoading.sending || messages.some((msg) => msg.pending)}
                    className="rounded-2xl border border-[#cfe8ff] bg-white px-4 py-3 text-sm text-[#35648a] shadow-sm transition hover:-translate-y-0.5 hover:border-[#cfe9ff] disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => {
                      setInput(prompt);
                      // モバイルでは自動フォーカスしない
                      if (!isMobile) {
                        textareaRef.current?.focus();
                      }
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div 
              className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8"
              style={{ paddingBottom: `${Math.max(composerHeight + 16, 128)}px` }}
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}
                >
                  {message.role === "assistant" && <MichelleAvatar size="sm" variant="aqua" className="mt-1" />}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                      message.role === "user"
                        ? "rounded-tr-sm bg-gradient-to-r from-[#2f8fe0] via-[#4fb6ff] to-[#8fd8ff] text-white"
                        : "rounded-tl-sm border border-[#d4e4ff] bg-white text-[#15395c]",
                    )}
                  >
                    {message.pending && !message.content ? (
                      <div className="flex items-center gap-2 text-xs text-[#3a7fb3]">
                        <span className="inline-flex gap-1">
                          <span className="h-2 w-2 rounded-full bg-[#0ea5e9] animate-bounce" />
                          <span className="h-2 w-2 rounded-full bg-[#0ea5e9] animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="h-2 w-2 rounded-full bg-[#0ea5e9] animate-bounce" style={{ animationDelay: "300ms" }} />
                        </span>
                        {thinkingMessages[currentThinkingIndex]}
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{cleanContent(message.content)}</p>
                    )}
                    {message.pending && message.content && <span className="ml-1 inline-block h-4 w-1.5 animate-pulse bg-current" />}
                  </div>
                  {message.role === "user" && (
                    <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-[#cfe8ff] bg-white text-[#2c769f]">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
              <div className="h-12 md:h-20" />
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div 
          ref={composerRef}
          className="sticky bottom-0 left-0 right-0 border-t border-[#d3ecff] bg-white/95 px-4 pt-2 z-50"
          style={{ 
            paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)"
          }}
        >
          {error && (
            <p 
              className={cn(
                "mb-2 text-xs rounded-lg px-3 py-2 text-center",
                error.startsWith("✓") 
                  ? "bg-green-50 text-green-700 border border-green-200" 
                  : "bg-red-50 text-red-600 border border-red-200"
              )}
            >
              {error}
            </p>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleSendMessage();
            }}
            className="mx-auto flex max-w-3xl items-center gap-3 rounded-3xl border border-[#cfe8ff] bg-white px-4 py-3 shadow-sm"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={(event) => {
                // モバイルでフォーカス時にスムーズにスクロール（URLバーを隠す）
                if (isMobile) {
                  setTimeout(() => {
                    event.target.scrollIntoView({ behavior: "smooth", block: "center" });
                  }, 300);
                }
              }}
              placeholder="ミシェル引き寄せに話しかける..."
              enterKeyHint="send"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              disabled={isLoading.sending || messages.some((msg) => msg.pending)}
              className="max-h-40 flex-1 resize-none border-0 bg-transparent px-1 py-2 text-base leading-relaxed text-[#0f2f4d] placeholder:text-[#6a9fc2] focus:outline-none disabled:opacity-60 md:text-sm"
              rows={1}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading.sending || messages.some((msg) => msg.pending)}
              className="h-12 w-12 rounded-full bg-gradient-to-tr from-[#38bdf8] to-[#4cc9ff] text-white shadow-lg hover:brightness-105 disabled:opacity-50"
            >
              {isLoading.sending || messages.some((msg) => msg.pending) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
          <p className="mt-2 text-center text-[10px] text-[#6fb2d4]">ミシェル引き寄せAIは誤った情報を生成する場合があります。</p>
        </div>
      </main>
    </div>
  );
}
