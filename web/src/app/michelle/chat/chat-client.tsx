"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot, Loader2, Menu, MessageSquare, Plus, Send, Share2, Trash2, User, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

type KnowledgeReference = {
  id: string;
  preview: string;
  similarity?: number;
};

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

const MichelleAvatar = ({ className = "", size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) => {
  const sizeMap = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-28 w-28",
  } as const;

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-[#e4edff] text-[#4a6bf2] shadow-inner",
        sizeMap[size],
        className,
      )}
    >
      <User className={cn(size === "lg" ? "h-20 w-20" : size === "md" ? "h-6 w-6" : "h-4 w-4") + " text-inherit"} />
    </div>
  );
};

export function MichelleChatClient() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [knowledgeRefs, setKnowledgeRefs] = useState<KnowledgeReference[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState({ sessions: false, messages: false, sending: false });
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentThinkingIndex, setCurrentThinkingIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    }
  }, []);

  const loadMessages = useCallback(
    async (sessionId: string) => {
      setIsLoading((prev) => ({ ...prev, messages: true }));
      try {
        const res = await fetch(`/api/michelle/sessions/${sessionId}/messages`);
        if (res.status === 401) {
          setNeedsAuth(true);
          return;
        }
        if (res.status === 404) {
          setActiveSessionId(null);
          return;
        }
        if (!res.ok) throw new Error("Failed to load messages");
        const data = (await res.json()) as MessagesResponse;
        setMessages(data.messages ?? []);
        setKnowledgeRefs([]);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading((prev) => ({ ...prev, messages: false }));
      }
    },
    [],
  );

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  useEffect(() => {
    if (isLoading.sending) return;
    if (activeSessionId) {
      loadMessages(activeSessionId);
    } else {
      setMessages([]);
    }
  }, [activeSessionId, isLoading.sending, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!messages.some((msg) => msg.pending)) return;
    const interval = setInterval(() => {
      setCurrentThinkingIndex((prev) => (prev + 1) % thinkingMessages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [messages]);

  const handleNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
    setKnowledgeRefs([]);
    setError(null);
    textareaRef.current?.focus();
  };

const deriveKnowledgePreview = (item: SSEKnowledge) => {
  if (item.metadata && typeof item.metadata === "object") {
    const title = (item.metadata as Record<string, unknown>).title;
    if (typeof title === "string" && title.trim()) {
      return title;
    }
  }
  if (item.content) {
    return item.content.slice(0, 60);
  }
  return "参考ノート";
};

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading.sending) return;

    const text = input.trim();
    setInput("");
    setError(null);

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
      const res = await fetch("/api/michelle/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: activeSessionId ?? undefined, message: text }),
      });

      if (!res.ok || !res.body) throw new Error("ネットワークエラーが発生しました");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiContent = "";
      let resolvedSessionId = activeSessionId;

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
                }
              }
              if (payload.knowledge) {
                setKnowledgeRefs(
                  payload.knowledge.slice(0, 4).map((ref) => ({
                    id: ref.id,
                    preview: deriveKnowledgePreview(ref),
                    similarity: ref.similarity,
                  })),
                );
              }
            }
            if (payload.type === "delta" && payload.content) {
              aiContent += payload.content;
              setMessages((prev) => prev.map((msg) => (msg.id === tempAiId ? { ...msg, content: aiContent } : msg)));
            }
            if (payload.type === "error") {
              throw new Error(payload.message ?? "AI応答中にエラーが発生しました");
            }
          } catch (err) {
            console.error("Failed to parse stream payload", err);
          }
        }
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
      setIsLoading((prev) => ({ ...prev, sending: false }));
    }
  };

  const handleDeleteSession = async (sessionId: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    if (!confirm("このチャット履歴を削除しますか？")) return;
    try {
      const res = await fetch(`/api/michelle/sessions/${sessionId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete session");
      setSessions((prev) => prev.filter((session) => session.id !== sessionId));
      if (activeSessionId === sessionId) {
        handleNewChat();
      }
    } catch (err) {
      console.error(err);
      alert("削除に失敗しました");
    }
  };

  const handleShare = () => {
    if (!messages.length) return;
    const text = messages
      .map((m) => `${m.role === "user" ? "あなた" : "ミシェル"}: ${m.content}`)
      .join("\n\n");
    navigator.clipboard
      .writeText(text)
      .then(() => alert("会話内容をコピーしました"))
      .catch(() => alert("コピーに失敗しました"));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const cleanContent = (content: string) => content.replace(/【[^】]+】/g, "");

  if (needsAuth) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#f4f7ff]">
        <div className="rounded-2xl bg-white px-10 py-12 text-center shadow-xl">
          <p className="text-lg font-semibold text-[#1f2a37]">ログインが必要です</p>
          <p className="mt-4 text-sm text-[#596579]">ミシェルAIをご利用いただくにはログインしてください。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#f4f7ff] text-[#1f2a37]">
      <aside className="hidden w-[260px] flex-col border-r border-[#e0e7ff] bg-white/90 px-4 py-6 shadow-sm md:flex">
        <Button
          onClick={handleNewChat}
          disabled={isLoading.sending}
          className="mb-6 w-full justify-start gap-2 rounded-xl bg-[#4a6bf2] text-white shadow-lg hover:bg-[#3d59d2]"
        >
          <Plus className="h-4 w-4" /> 新しいチャット
        </Button>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#9aa4c2]">履歴</p>
        <div className="flex-1 overflow-y-auto">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => setActiveSessionId(session.id)}
              className={cn(
                "group flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left text-sm transition-all",
                session.id === activeSessionId
                  ? "border-[#b8c5ff] bg-[#eef2ff] text-[#2a3b8d]"
                  : "border-transparent bg-transparent text-[#4c5368] hover:border-[#e0e7ff] hover:bg-[#f7f9ff]",
              )}
            >
              <div className="flex min-w-0 items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="truncate">{session.title || "新しいチャット"}</span>
              </div>
              <button
                type="button"
                onClick={(event) => handleDeleteSession(session.id, event)}
                className="rounded-full p-1 text-[#94a3b8] opacity-0 transition group-hover:opacity-100 hover:bg-white"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </button>
          ))}
          {sessions.length === 0 && !isLoading.sessions && (
            <p className="text-center text-xs text-[#94a3b8]">まだチャット履歴がありません。</p>
          )}
        </div>
        <div className="mt-6 flex items-center gap-2 rounded-2xl border border-[#e4e9fb] px-3 py-2 text-sm text-[#5d6b8b]">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eef2ff]">
            <User className="h-4 w-4" />
          </div>
          <span className="font-medium">ユーザー</span>
        </div>
      </aside>

      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setIsSidebarOpen(false)} />
          <div className="relative ml-auto flex h-full w-[80%] max-w-[300px] flex-col border-l border-[#dde5ff] bg-white/95 px-4 py-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold">履歴</span>
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <Button onClick={handleNewChat} className="mb-4 gap-2 rounded-xl bg-[#4a6bf2] text-white">
              <Plus className="h-4 w-4" /> 新しいチャット
            </Button>
            <div className="flex-1 overflow-y-auto">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => {
                    setActiveSessionId(session.id);
                    setIsSidebarOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-2xl border border-transparent px-3 py-3 text-left text-sm hover:border-[#e0e7ff] hover:bg-[#f7f9ff]"
                >
                  <span className="truncate">{session.title || "新しいチャット"}</span>
                  <Trash2
                    className="h-4 w-4 text-[#c1c9e7]"
                    onClick={(event) => handleDeleteSession(session.id, event)}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="flex flex-1 flex-col bg-white/90">
        <header className="flex items-center justify-between border-b border-[#e2e8ff] px-4 py-3 text-sm text-[#5a6380]">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsSidebarOpen(true)}>
              <Menu className="h-5 w-5 text-[#4a6bf2]" />
            </Button>
            <span className="font-semibold text-[#2a3b8d]">{activeSession?.title || "ミシェルAI"}</span>
            {isLoading.messages && <Loader2 className="h-4 w-4 animate-spin text-[#9aa4c2]" />}
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" className="text-[#5a6380]" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" /> 共有
            </Button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto bg-[#f6f8ff]">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-6 px-4 text-center">
              <MichelleAvatar size="lg" />
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-[#1c2a4a]">こんにちは、ミシェルです</h2>
                <p className="text-sm text-[#5d6b8b]">
                  心のモヤモヤ、誰にも言えない悩み、なんでも話してください。<br />
                  私はあなたの鏡となって、一緒に答えを探します。
                </p>
              </div>
              <div className="grid w-full max-w-2xl gap-3 px-6 md:grid-cols-2">
                {initialPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    className="rounded-2xl border border-[#e2e8ff] bg-white px-4 py-3 text-sm text-[#4c5368] shadow-sm transition hover:-translate-y-0.5 hover:border-[#cdd8ff]"
                    onClick={() => {
                      setInput(prompt);
                      textareaRef.current?.focus();
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}
                >
                  {message.role === "assistant" && <MichelleAvatar size="sm" className="mt-1" />}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                      message.role === "user"
                        ? "rounded-tr-sm bg-[#4a6bf2] text-white"
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
                    <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-[#e2e8ff] bg-white">
                      <User className="h-4 w-4 text-[#94a3b8]" />
                    </div>
                  )}
                </div>
              ))}

              {knowledgeRefs.length > 0 && (
                <div className="rounded-2xl border border-[#d9e2ff] bg-white/80 p-4 text-xs text-[#4c5368]">
                  <p className="mb-2 flex items-center gap-2 font-semibold text-[#2a3b8d]">
                    <Bot className="h-3.5 w-3.5" /> 参考にした知識
                  </p>
                  <ul className="space-y-1">
                    {knowledgeRefs.map((ref) => (
                      <li key={ref.id} className="truncate" title={ref.preview}>
                        {ref.preview}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="h-20" />
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="border-t border-[#dfe6ff] bg-white/95 px-4 py-4">
          {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleSendMessage();
            }}
            className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-[#dfe6ff] bg-white p-3 shadow-sm"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="ミシェルに話しかける..."
              className="max-h-40 flex-1 resize-none border-0 bg-transparent text-sm text-[#1f2a37] placeholder:text-[#a0aac8] focus:outline-none"
              rows={1}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading.sending}
              className="h-10 w-10 rounded-full bg-[#4a6bf2] text-white hover:bg-[#3f5cd8]"
            >
              {isLoading.sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
          <p className="mt-2 text-center text-[10px] text-[#94a3b8]">ミシェルAIは誤った情報を生成する場合があります。重要事項は専門家にご相談ください。</p>
        </div>
      </main>
    </div>
  );
}
