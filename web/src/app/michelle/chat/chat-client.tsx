"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Loader2, Menu, MessageSquare, Plus, Send, Share2, Trash2, User, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MichelleAvatar } from "@/components/michelle/avatar";
import { debugLog } from "@/lib/logger";
import { MobileLogger, mobileLog } from "@/components/debug/mobile-logger";

type PsychologyRecommendationState = "none" | "suggested" | "acknowledged" | "dismissed" | "resolved";

type SessionSummary = {
  id: string;
  title: string | null;
  category: string;
  updated_at: string;
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

type AttractionBridge = {
  session_id: string;
  psychology_recommendation: PsychologyRecommendationState;
  psychology_recommendation_reason: string | null;
};

type AttractionProgressResponse = {
  progress: AttractionBridge | null;
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

type GuidedAction = "back" | "deeper" | "next";
type GuidedPhase = "explore" | "deepen" | "release";

const ACTIVE_SESSION_STORAGE_KEY = "michelle-active-session-id";

const initialPrompts = [
  "会社の上司に怒られた...",
  "最近なんだか寂しい",
  "将来が不安で眠れない",
  "自分が何をしたいか分からない",
];

const thinkingMessages = [
  "心の声を聞いています...",
  "感情を整理しています...",
  "思考を整えています...",
  "寄り添いながら考えています...",
];

const GUIDED_ACTION_PRESETS: Record<GuidedAction, { prompt: string; success: string }> = {
  back: {
    prompt: "直前に扱っていたテーマをもう一度整理したいです。さっきの内容を別の視点でもう少し丁寧に解説してください。",
    success: "✓ 直前のテーマをもう一度整理します",
  },
  deeper: {
    prompt:
      "今取り組んでいる心のテーマをさらに深掘りしたいです。感情の芯や根底にある思い込みまで一緒に探ってください。",
    success: "✓ 同じテーマをさらに深掘りします",
  },
  next: {
    prompt: "このテーマはいったん区切って、次に進むためのセルフケアや新しい視点を案内してください。",
    success: "✓ 次のステップへ進みます",
  },
};

const GUIDED_ACTION_NOTES: Record<GuidedAction, string> = {
  back: "ユーザー操作: 直前のテーマ整理をリクエスト",
  deeper: "ユーザー操作: 現在のテーマを深掘り",
  next: "ユーザー操作: 次のセルフケア案内をリクエスト",
};

const GUIDED_PHASE_SEQUENCE: GuidedPhase[] = ["explore", "deepen", "release"];
const GUIDED_PHASE_LABELS: Record<GuidedPhase, string> = {
  explore: "気持ちの整理",
  deepen: "深掘り・核心探索",
  release: "リリース＆ケア",
};
const GUIDED_PHASE_DESCRIPTIONS: Record<GuidedPhase, string> = {
  explore: "今感じている感情やテーマを整理しています",
  deepen: "感情の芯や思い込みを深掘り中",
  release: "感情のリリースとセルフケアへ移行中",
};

export function MichelleChatClient() {
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
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);
  const autoScrollRef = useRef(true);
  const scrollFrameRef = useRef<number>();
  const [composerHeight, setComposerHeight] = useState(0);
  const hasRestoredSessionRef = useRef(false);
  const [attractionBridge, setAttractionBridge] = useState<AttractionBridge | null>(null);
  const [isUpdatingBridge, setIsUpdatingBridge] = useState(false);
  const hasPendingResponse = useMemo(() => messages.some((msg) => msg.pending), [messages]);
  const [guidedActionLoading, setGuidedActionLoading] = useState<null | "back" | "deeper" | "next">(null);
  const [currentPhase, setCurrentPhase] = useState<GuidedPhase>("explore");

  const activeSession = useMemo(() => sessions.find((session) => session.id === activeSessionId) ?? null, [
    sessions,
    activeSessionId,
  ]);

  const loadSessions = useCallback(async () => {
    setIsLoading((prev) => ({ ...prev, sessions: true }));
    try {
      const res = await fetch("/api/michelle/sessions");
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

  const fetchAttractionBridge = useCallback(async () => {
    try {
      const res = await fetch("/api/michelle-attraction/progress");
      if (!res.ok) {
        setAttractionBridge(null);
        return;
      }
      const data = (await res.json()) as AttractionProgressResponse;
      const progress = data.progress;
      if (progress && progress.psychology_recommendation !== "none") {
        setAttractionBridge(progress);
      } else {
        setAttractionBridge(null);
      }
    } catch (err) {
      console.error("[Psychology] Failed to fetch attraction bridge", err);
      setAttractionBridge(null);
    }
  }, []);

  const loadMessages = useCallback(
    async (sessionId: string) => {
      debugLog("[loadMessages] Starting to load messages for session:", sessionId);
      setIsLoading((prev) => ({ ...prev, messages: true }));
      try {
        const res = await fetch(`/api/michelle/sessions/${sessionId}/messages`);
        debugLog("[loadMessages] Response status:", res.status);
        
        if (res.status === 401) {
          debugLog("[loadMessages] Unauthorized - setting needsAuth");
          setNeedsAuth(true);
          setHasLoadedMessages(true);
          return;
        }
        if (res.status === 404) {
          debugLog("[loadMessages] Session not found - clearing activeSessionId");
          setActiveSessionId(null);
           setHasLoadedMessages(true);
          return;
        }
        if (!res.ok) throw new Error("Failed to load messages");
        
        const data = (await res.json()) as MessagesResponse;
        debugLog("[loadMessages] Received data:", {
          sessionId: data.session?.id,
          messagesCount: data.messages?.length ?? 0,
          firstMessage: data.messages?.[0]?.content?.substring(0, 50)
        });
        
        setMessages(data.messages ?? []);
        setHasLoadedMessages(true);
        debugLog("[loadMessages] Messages state updated with", data.messages?.length ?? 0, "messages");
      } catch (err) {
        console.error("[loadMessages] Error loading messages:", err);
      } finally {
        setIsLoading((prev) => ({ ...prev, messages: false }));
        debugLog("[loadMessages] Loading complete");
      }
    },
    [],
  );

  useEffect(() => {
    debugLog("[Mount] Component mounted");
    setIsMounted(true);
    setIsMobile(window.innerWidth < 768);
    
    // モバイルでは初回ロード時に意図しないフォーカスを防ぐ
    if (window.innerWidth < 768 && textareaRef.current) {
      textareaRef.current.blur();
      debugLog("[Mount] Mobile: textarea blur applied to prevent unwanted keyboard");
    }
    
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    debugLog("[Sessions] Loading sessions...");
    loadSessions();
    fetchAttractionBridge();
  }, [loadSessions, fetchAttractionBridge]);

  useEffect(() => {
    debugLog(
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
      debugLog("[Session Restore] Skipped - not mounted yet");
      return;
    }
    if (hasRestoredSessionRef.current) {
      debugLog("[Session Restore] Skipped - already restored");
      return;
    }
    if (!hasInitializedSessions) {
      debugLog("[Session Restore] Skipped - sessions not initialized yet");
      return;
    }
    if (sessions.length === 0) {
      debugLog("[Session Restore] No sessions available - finishing restore state");
      hasRestoredSessionRef.current = true;
      setIsRestoringSession(false);
      return;
    }

    try {
      const storedSessionId = window.localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
      debugLog("[Session Restore] Stored ID:", storedSessionId, "Sessions count:", sessions.length);
      
      if (storedSessionId) {
        const exists = sessions.some((s) => s.id === storedSessionId);
        debugLog("[Session Restore] Session exists:", exists);
        
        if (exists) {
          debugLog("[Session Restore] Restoring session:", storedSessionId);
          setActiveSessionId(storedSessionId);
        } else {
          debugLog("[Session Restore] Session not found in sessions array");
        }
      } else {
        debugLog("[Session Restore] No stored session ID found");
      }
    } catch (error) {
      console.error("[Session Restore] Failed to restore session:", error);
    }
    
    hasRestoredSessionRef.current = true;
    setIsRestoringSession(false);
    debugLog("[Session Restore] Flag set to true, restoration complete");
  }, [isMounted, sessions, hasInitializedSessions]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  useEffect(() => {
    debugLog("[Save Session] Effect triggered - isMounted:", isMounted, "activeSessionId:", activeSessionId);
    
    if (!isMounted) {
      debugLog("[Save Session] Skipped - not mounted yet");
      return;
    }
    
    if (!activeSessionId) {
      debugLog("[Save Session] Skipped - activeSessionId is null (keeping existing localStorage)");
      return;
    }
    
    try {
      debugLog("[Save Session] Saving to localStorage:", activeSessionId);
      window.localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, activeSessionId);
      debugLog("[Save Session] Saved successfully");
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

    if (typeof ResizeObserver === "undefined") {
      const interval = window.setInterval(updateHeight, 500);
      return () => window.clearInterval(interval);
    }

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

    debugLog("[Load Messages] activeSessionId:", activeSessionId);

    if (activeSessionId) {
      setHasLoadedMessages(false);
      debugLog("[Load Messages] Loading messages for:", activeSessionId);
      loadMessages(activeSessionId);
    } else {
      debugLog("[Load Messages] Clearing messages (no active session)");
      setMessages([]);
      setHasLoadedMessages(true);
    }
  }, [activeSessionId, isLoading.sending, loadMessages]);

  useEffect(() => {
    setCurrentPhase("explore");
  }, [activeSessionId]);

  useLayoutEffect(() => {
    if (messages.length === 0) return;
    scheduleScrollToBottom();
  }, [messages.length, scheduleScrollToBottom]);

  useEffect(() => {
    if (!hasPendingResponse) return;
    const interval = setInterval(() => {
      setCurrentThinkingIndex((prev) => (prev + 1) % thinkingMessages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [hasPendingResponse]);

  const handleNewChat = () => {
    debugLog("[User Action] New chat clicked - clearing session");
    setActiveSessionId(null);
    setMessages([]);
    setError(null);
    setHasLoadedMessages(true);
    setCurrentPhase("explore");
    hasRestoredSessionRef.current = false;
    
    // 新しいチャットの場合のみlocalStorageを削除
    try {
      window.localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
      debugLog("[User Action] localStorage cleared for new chat");
    } catch (error) {
      console.error("[User Action] Failed to clear localStorage:", error);
    }
    
    // モバイルでは自動フォーカスしない（キーボードがURLバーに被る問題を防ぐ）
    if (!isMobile) {
      textareaRef.current?.focus();
    }
  };

  const handleBridgeResolved = async () => {
    if (!attractionBridge?.session_id) {
      window.location.href = "/michelle/attraction/chat";
      return;
    }
    setIsUpdatingBridge(true);
    try {
      const res = await fetch("/api/michelle-attraction/progress/recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: attractionBridge.session_id, action: "resolve" }),
      });
      if (!res.ok) {
        throw new Error("更新に失敗しました");
      }
      setAttractionBridge(null);
      window.location.href = "/michelle/attraction/chat";
    } catch (err) {
      console.error("[Psychology] Failed to resolve bridge", err);
      setError("引き寄せ側の状態更新に失敗しました");
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsUpdatingBridge(false);
    }
  };

  const appendGuidedSystemNote = (action: GuidedAction) => {
    const note = GUIDED_ACTION_NOTES[action];
    if (!note) return;
    const timestamp = new Date().toISOString();
    setMessages((prev) => [
      ...prev,
      {
        id: `system-${action}-${timestamp}`,
        role: "system",
        content: note,
        created_at: timestamp,
      },
    ]);
  };

  const transitionPhase = (action: GuidedAction) => {
    setCurrentPhase((prev) => {
      const currentIndex = GUIDED_PHASE_SEQUENCE.indexOf(prev);
      if (currentIndex === -1) return prev;
      if (action === "back") {
        const nextIndex = Math.max(0, currentIndex - 1);
        return GUIDED_PHASE_SEQUENCE[nextIndex];
      }
      if (action === "next") {
        const nextIndex = Math.min(GUIDED_PHASE_SEQUENCE.length - 1, currentIndex + 1);
        return GUIDED_PHASE_SEQUENCE[nextIndex];
      }
      return prev;
    });
  };

  const handleGuidedAction = async (action: GuidedAction) => {
    if (isLoading.sending || hasPendingResponse || guidedActionLoading) {
      return;
    }

    const preset = GUIDED_ACTION_PRESETS[action];
    if (!preset) return;

    setGuidedActionLoading(action);
    setError(preset.success);
    appendGuidedSystemNote(action);
    transitionPhase(action);

    try {
      // Show message briefly before sending
      await new Promise(resolve => setTimeout(resolve, 800));
      setError(null);
      
      await handleSendMessage(preset.prompt, { preserveStatus: true });
    } catch (actionError) {
      console.error("Guided action error", actionError);
      setError(actionError instanceof Error ? actionError.message : "送信に失敗しました");
    } finally {
      setGuidedActionLoading(null);
    }
  };

  const handleSendMessage = async (overrideText?: string, options?: { preserveStatus?: boolean }) => {
    const textToSend = overrideText ? overrideText.trim() : input.trim();
    if (!textToSend || isLoading.sending) return;

    if (hasPendingResponse) {
      mobileLog.warn("Send blocked: AI is still responding");
      debugLog("[Send] Blocked - AI is still responding");
      setError("前の応答を待っています...");
      setTimeout(() => setError(null), 1000);
      return;
    }

    if (!overrideText) {
      setInput("");
    }
    if (!options?.preserveStatus) {
      setError(null);
    }
    
    // モバイルでは送信後にキーボードを閉じる
    if (isMobile && textareaRef.current) {
      textareaRef.current.blur();
    }

    const tempUserId = `user-${Date.now()}`;
    const tempAiId = `ai-${Date.now()}`;
    const timestamp = new Date().toISOString();

    setMessages((prev) => [
      ...prev,
      { id: tempUserId, role: "user", content: textToSend, created_at: timestamp },
      { id: tempAiId, role: "assistant", content: "", created_at: timestamp, pending: true },
    ]);

    setIsLoading((prev) => ({ ...prev, sending: true }));
    mobileLog.info("Loading state set to true");
    
    let hasError = false;
    let retryCount = 0;
    const maxRetries = 2;

    try {
      let res: Response | null = null;
      
      // リトライループ
      while (retryCount <= maxRetries) {
        try {
          mobileLog.info("Starting API call", { 
            sessionId: activeSessionId, 
            attempt: retryCount + 1,
            maxRetries: maxRetries + 1
          });
          
          res = await fetch("/api/michelle/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: activeSessionId ?? undefined, message: textToSend }),
          });
          
          mobileLog.info("API response received", { 
            status: res.status, 
            ok: res.ok,
            attempt: retryCount + 1
          });
          
          break; // 成功したらループを抜ける
          
        } catch (fetchError) {
          retryCount++;
          mobileLog.error("Network error", { 
            error: fetchError,
            message: fetchError instanceof Error ? fetchError.message : "Unknown",
            attempt: retryCount,
            willRetry: retryCount <= maxRetries
          });
          
          if (retryCount > maxRetries) {
            throw new Error(
              "ネットワークエラーが発生しました。接続を確認してもう一度お試しください。"
            );
          }
          
          // exponential backoff: 1秒、2秒
          const delay = Math.min(1000 * retryCount, 2000);
          mobileLog.info("Retrying after delay", { delayMs: delay });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      if (!res) {
        throw new Error("Failed to get response after retries");
      }

      if (!res.ok || !res.body) {
        let serverMessage = "ネットワークエラーが発生しました";
        try {
          const errorBody = (await res.json()) as { error?: string };
          if (errorBody?.error) {
            serverMessage = errorBody.error;
          }
          // 429エラーの場合は特別な処理
          if (res.status === 429) {
            mobileLog.warn("Rate limited - AI still responding", { status: 429 });
            debugLog("[Send] Rate limited - AI still responding");
            serverMessage = "前の応答がまだ処理中です。少しお待ちください。";
          }
          // ステータスコードをログ
          mobileLog.error("API error response", { status: res.status, message: serverMessage });
          debugLog("[Send] Error response:", { status: res.status, message: serverMessage });
        } catch (parseError) {
          mobileLog.error("Failed to parse error response", parseError);
          console.error("Failed to parse error response", parseError);
        }
        throw new Error(serverMessage);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiContent = "";
      let resolvedSessionId = activeSessionId;
      let streamCompleted = false;
      let buffer = ""; // Buffer for incomplete SSE events

      const TIMEOUT_MS = 60000; // 60秒タイムアウト
      const startTime = Date.now();

      try {
        while (true) {
          const timeoutPromise = new Promise<never>((_, reject) => {
            const elapsed = Date.now() - startTime;
            const remaining = TIMEOUT_MS - elapsed;
            if (remaining <= 0) {
              reject(new Error("TIMEOUT"));
            } else {
              setTimeout(() => reject(new Error("TIMEOUT")), remaining);
            }
          });

          let readResult;
          try {
            readResult = await Promise.race([reader.read(), timeoutPromise]);
          } catch (err) {
            if (err instanceof Error && err.message === "TIMEOUT") {
              try {
                await reader.cancel();
              } catch (cancelErr) {
                console.error("Failed to cancel reader:", cancelErr);
              }
              throw new Error(
                "応答に時間がかかりすぎています。ネットワークが不安定な可能性があります。もう一度お試しください。",
              );
            }
            throw err;
          }

          const { value, done } = readResult;
          if (done) break;

          // Append to buffer
          buffer += decoder.decode(value, { stream: true });

          // Split by SSE delimiter, but keep the last incomplete event in buffer
          const events = buffer.split("\n\n");
          buffer = events.pop() || ""; // Keep incomplete event for next iteration

          for (const event of events) {
            if (!event.trim()) continue;
            if (!event.startsWith("data:")) continue;
            try {
              const payload = JSON.parse(event.slice(5)) as StreamPayload;
              if (payload.type === "meta") {
                if (payload.sessionId) {
                  resolvedSessionId = payload.sessionId;
                  if (!activeSessionId) {
                    setActiveSessionId(payload.sessionId);
                    loadSessions();
                  }
                }
              }
              if (payload.type === "delta" && payload.content) {
                aiContent += payload.content;
                setMessages((prev) => prev.map((msg) => (msg.id === tempAiId ? { ...msg, content: aiContent } : msg)));
              }
              if (payload.type === "done") {
                streamCompleted = true;
                debugLog("[Stream] Completed successfully");
              }
              if (payload.type === "error") {
                throw new Error(payload.message ?? "AI応答中にエラーが発生しました");
              }
            } catch (err) {
              console.error("Failed to parse stream payload", err);
            }
          }
        }
      } catch (streamError) {
        try {
          await reader.cancel();
        } catch (cancelErr) {
          console.error("Failed to cancel reader after error:", cancelErr);
        }
        throw streamError;
      }

      // ストリーム完了を確認
      if (!streamCompleted) {
        debugLog("[Stream] Ended without 'done' event");
        throw new Error("ストリームが正常に完了しませんでした。もう一度お試しください。");
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempAiId
            ? { ...msg, content: aiContent, pending: false }
            : msg,
        ),
      );

      if (!activeSessionId && resolvedSessionId) {
        setActiveSessionId(resolvedSessionId);
      }
    } catch (err) {
      hasError = true;
      mobileLog.error("Send message error", { error: err, message: err instanceof Error ? err.message : "Unknown" });
      console.error(err);
      const friendlyError = err instanceof Error ? err.message : "送信に失敗しました";
      setError(friendlyError);
      
      // エラー時は必ずpendingメッセージを削除
      mobileLog.info("Clearing pending message due to error");
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempAiId ? { ...msg, content: "申し訳ありません。もう一度送ってみてください。", pending: false } : msg,
        ),
      );
    } finally {
      // エラー時は即座にリセット、成功時は短い遅延
      if (hasError) {
        mobileLog.info("Loading state reset (error - immediate)");
        setIsLoading((prev) => ({ ...prev, sending: false }));
        debugLog("[Send] Loading state released (error)");
      } else {
        mobileLog.info("Loading state reset (success - 100ms delay)");
        setTimeout(() => {
          setIsLoading((prev) => ({ ...prev, sending: false }));
          debugLog("[Send] Loading state released (success)");
        }, 100);
      }
    }
  };

  const handleDeleteSession = async (sessionId: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    if (!confirm("このチャット履歴を削除しますか？\n削除後は復元できません。")) return;
    
    const wasActive = activeSessionId === sessionId;
    
    try {
      const res = await fetch(`/api/michelle/sessions/${sessionId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete session");
      
      debugLog("[Delete] Session deleted:", sessionId);
      setSessions((prev) => prev.filter((session) => session.id !== sessionId));
      
      if (wasActive) {
        debugLog("[Delete] Deleted active session, creating new chat");
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
      .map((m) => `${m.role === "user" ? "あなた" : "ミシェル"}: ${m.content}`)
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
      if (!hasPendingResponse) {
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
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-br from-[#fff2f6] to-[#ffe4ef]">
        <div className="rounded-3xl bg-white px-10 py-12 text-center shadow-2xl">
          <p className="text-lg font-semibold text-[#a1315d]">ログインが必要です</p>
          <p className="mt-4 text-sm text-[#8b5269]">ミシェルAIをご利用いただくにはログインしてください。</p>
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
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-br from-[#fff8fb] via-[#fff2f6] to-[#ffe2ef]">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#ff6ba6]" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex w-full flex-1 items-stretch bg-gradient-to-br from-[#fff8fb] via-[#fff2f6] to-[#ffe2ef] text-[#2b152c]"
      style={{
        minHeight: "calc(100vh - 4rem)",
        height: "calc(100vh - 4rem)",
        maxHeight: "calc(100vh - 4rem)",
      }}
    >
      <aside
        className="hidden w-[260px] min-w-[260px] flex-col border-r border-[#ffd7e8] bg-white/90 px-4 py-6 shadow-sm md:flex md:sticky md:top-16 md:self-start md:overflow-y-auto"
        style={{ height: "calc(100vh - 4rem)" }}
      >
        <Button
          onClick={handleNewChat}
          disabled={isLoading.sending}
          className="mb-6 w-full justify-start gap-2 rounded-2xl border border-[#ffd7e8] bg-[#fff5f8] text-[#a1315d] shadow-sm hover:bg-white"
        >
          <Plus className="h-4 w-4" /> 新しいチャット
        </Button>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#d48ca9]">チャット</p>
        <div className="flex-1 overflow-y-auto">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => {
                debugLog("[User Action] Desktop: Clicked on session:", session.id);
                setActiveSessionId(session.id);
              }}
              className={cn(
                "group flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left text-sm transition-all mb-2",
                session.id === activeSessionId
                  ? "border-[#ffc2d8] bg-[#fff0f6] text-[#a63c68]"
                  : "border-transparent bg-transparent text-[#7a4f63] hover:border-[#ffe1ed] hover:bg-[#fff7fb]",
              )}
            >
              <div className="flex min-w-0 items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="truncate">{session.title || "新しいチャット"}</span>
              </div>
              <button
                type="button"
                onClick={(event) => handleDeleteSession(session.id, event)}
                className="rounded-full p-1 text-[#cfa0b3] opacity-0 transition group-hover:opacity-100 hover:bg-white"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </button>
          ))}
          {sessions.length === 0 && !isLoading.sessions && (
            <p className="text-center text-xs text-[#c08ca3]">まだチャット履歴がありません。</p>
          )}
        </div>
        {/* user info removed */}
      </aside>

      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setIsSidebarOpen(false)} />
          <div className="relative ml-auto flex h-full w-[80%] max-w-[300px] flex-col border-l border-[#ffdbe8] bg-white/95 px-4 py-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-[#a1315d]">履歴</span>
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
              className="mb-4 gap-2 rounded-2xl border border-[#ffd7e8] bg-[#fff5f8] text-[#a1315d] hover:bg-white"
            >
              <Plus className="h-4 w-4" /> 新しいチャット
            </Button>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#d48ca9]">チャット</p>
            <div className="flex-1 overflow-y-auto">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => {
                    debugLog("[User Action] Mobile: Clicked on session:", session.id);
                    setActiveSessionId(session.id);
                    setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "group flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left text-sm transition-all mb-2",
                    session.id === activeSessionId
                      ? "border-[#ffc2d8] bg-[#fff0f6] text-[#a63c68]"
                      : "border-transparent bg-transparent text-[#7a4f63] hover:border-[#ffe1ed] hover:bg-[#fff7fb]"
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <span className="truncate">{session.title || "新しいチャット"}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => handleDeleteSession(session.id, event)}
                    className="rounded-full p-1 text-[#cfa0b3] transition hover:bg-white"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </button>
              ))}
              {sessions.length === 0 && !isLoading.sessions && (
                <p className="text-center text-xs text-[#c08ca3]">まだチャット履歴がありません。</p>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-white/75 touch-auto overscroll-none">
        <header className="flex items-center justify-between border-b border-[#ffdfea] px-4 py-3 text-sm text-[#95506a]">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full border border-[#ffd7e8] bg-white text-[#ff6ba6] hover:bg-[#fff4f7] md:hidden"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            <span className="font-semibold text-[#a1315d]">{activeSession?.title || "ミシェルAI"}</span>
            {isLoading.messages && messages.length === 0 && <Loader2 className="h-4 w-4 animate-spin text-[#9aa4c2]" />}
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" className="text-[#b1637d]" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" /> 共有
            </Button>
          )}
        </header>

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto bg-gradient-to-b from-white via-[#fff3f7] to-[#ffe8f1]"
          style={{ 
            WebkitOverflowScrolling: "touch"
          }}
        >
          {attractionBridge && (
            <div className="px-4 pt-4">
              <div className="rounded-3xl border border-[#facc15] bg-[#fff9db] p-4 text-sm text-[#6d5300] shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#b45309]">Michelle Attraction からの依頼</p>
                <p className="mt-1 text-base font-semibold text-[#8b5e00]">
                  引き寄せカリキュラムを一時停止し、感情のブロックを癒やしてください。
                </p>
                {attractionBridge.psychology_recommendation_reason && (
                  <p className="mt-2 rounded-2xl bg-white/70 px-3 py-2 text-xs text-[#7c4a00]">
                    {attractionBridge.psychology_recommendation_reason}
                  </p>
                )}
                <p className="mt-2 text-sm">
                  心が整ったら「引き寄せに戻る」ボタンで再開できます。焦らずに今は感情の声を丁寧に感じてみましょう。
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="rounded-full bg-[#f97316] text-white hover:bg-[#ea580c]"
                    onClick={() => {
                      window.location.href = "/michelle/attraction/chat";
                    }}
                  >
                    引き寄せチャットを開く
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[#7c4a00] hover:bg-amber-100"
                    onClick={handleBridgeResolved}
                    disabled={isUpdatingBridge}
                  >
                    {isUpdatingBridge ? "更新中..." : "感情ケア完了・再開する"}
                  </Button>
                </div>
              </div>
            </div>
          )}
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-6 px-4 text-center">
              <MichelleAvatar size="lg" variant="rose" />
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-[#a1315d]">こんにちは、ミシェルです</h2>
                <p className="text-sm text-[#8b5269]">
                  心のモヤモヤ、誰にも言えない悩み、なんでも話してください。<br />
                  私はあなたの鏡となって、一緒に答えを探します。
                </p>
              </div>
              <div className="grid w-full max-w-2xl gap-3 px-6 md:grid-cols-2">
                {initialPrompts.slice(0, isMobile ? 2 : 4).map((prompt) => (
                  <button
                    key={prompt}
                    disabled={isLoading.sending || hasPendingResponse}
                    className="rounded-2xl border border-[#ffd7e8] bg-white px-4 py-3 text-sm text-[#7a4f63] shadow-sm transition hover:-translate-y-0.5 hover:border-[#ffc8de] disabled:opacity-50 disabled:cursor-not-allowed"
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
              {messages.map((message) => {
                if (message.role === "system") {
                  return (
                    <div key={message.id} className="flex justify-center">
                      <p className="text-[11px] text-[#a0657f]">
                        <span className="rounded-full bg-[#fff4f8] px-3 py-1 text-[#b23462]">
                          {message.content}
                        </span>
                      </p>
                    </div>
                  );
                }

                return (
                  <div
                    key={message.id}
                    className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}
                  >
                    {message.role === "assistant" && <MichelleAvatar size="sm" variant="rose" className="mt-1" />}
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                        message.role === "user"
                          ? "rounded-tr-sm bg-gradient-to-r from-[#ff77b3] via-[#ff94c3] to-[#ffb8d6] text-white"
                          : "rounded-tl-sm border border-[#e4e9fb] bg-white text-[#4c5368]",
                      )}
                    >
                      {message.pending && !message.content ? (
                        <div className="flex items-center gap-2 text-xs text-[#6f7ba5]">
                          <span className="inline-flex gap-1">
                            <span className="h-2 w-2 rounded-full bg-[#4a6bf2] animate-bounce" />
                            <span className="h-2 w-2 rounded-full bg-[#4a6bf2] animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="h-2 w-2 rounded-full bg-[#4a6bf2] animate-bounce" style={{ animationDelay: "300ms" }} />
                          </span>
                          {thinkingMessages[currentThinkingIndex]}
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{cleanContent(message.content)}</p>
                      )}
                      {message.pending && message.content && <span className="ml-1 inline-block h-4 w-1.5 animate-pulse bg-current" />}
                    </div>
                    {message.role === "user" && (
                      <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-[#ffd7e8] bg-white text-[#b1637d]">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#7a4f63]">
                <span className="font-semibold text-[#b23462]">感情ケア操作</span>
                <span className="rounded-full border border-[#ffd1e4] bg-[#fff5f9] px-3 py-1 text-[#b23462]">
                  現在: {GUIDED_PHASE_LABELS[currentPhase]}
                </span>
                <span className="text-[#c08ba5]">{GUIDED_PHASE_DESCRIPTIONS[currentPhase]}</span>
                <div className="flex flex-wrap gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px] text-[#b23462] hover:bg-[#ffe6ef]"
                    onClick={() => handleGuidedAction("back")}
                    disabled={guidedActionLoading !== null || hasPendingResponse || isLoading.sending}
                  >
                    {guidedActionLoading === "back" ? "整理中..." : "◀ 前のテーマ"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px] text-[#b23462] hover:bg-[#ffe6ef]"
                    onClick={() => handleGuidedAction("deeper")}
                    disabled={guidedActionLoading !== null || hasPendingResponse || isLoading.sending}
                  >
                    {guidedActionLoading === "deeper" ? "準備中..." : "◎ 深掘り"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px] text-[#b23462] hover:bg-[#ffe6ef]"
                    onClick={() => handleGuidedAction("next")}
                    disabled={guidedActionLoading !== null || hasPendingResponse || isLoading.sending}
                  >
                    {guidedActionLoading === "next" ? "案内中..." : "次へ ▶"}
                  </Button>
                </div>
              </div>
              <div className="h-12 md:h-20" />
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div 
          ref={composerRef}
          className="sticky bottom-0 left-0 right-0 border-t border-[#ffdbe8] bg-white/95 px-4 pt-2 z-50"
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
            className="mx-auto flex max-w-3xl items-center gap-3 rounded-3xl border border-[#ffd7e8] bg-white px-4 py-3 shadow-sm"
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
              placeholder="ミシェルに話しかける..."
              enterKeyHint="send"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              disabled={isLoading.sending || hasPendingResponse}
              className="max-h-40 flex-1 resize-none border-0 bg-transparent px-1 py-2 text-base leading-relaxed text-[#2c122a] placeholder:text-[#c18aa0] focus:outline-none disabled:opacity-60 md:text-sm"
              rows={1}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading.sending || hasPendingResponse}
              className="h-12 w-12 rounded-full bg-gradient-to-tr from-[#ff6ba6] to-[#ff8ac0] text-white shadow-lg hover:brightness-105 disabled:opacity-50"
            >
              {isLoading.sending || hasPendingResponse ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
          <p className="mt-2 text-center text-[10px] text-[#c896a8]">ミシェルAIは誤った情報を生成する場合があります。</p>
        </div>
      </main>
      <MobileLogger />
    </div>
  );
}
