"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot, Loader2, Menu, MessageSquare, Plus, Send, Share2, Trash2, User, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MichelleAvatar } from "./avatar";

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

      if (!res.ok || !res.body) {
        let serverMessage = "ネットワークエラーが発生しました";
        try {
          const errorBody = (await res.json()) as { error?: string };
          if (errorBody?.error) {
            serverMessage = errorBody.error;
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
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-br from-[#fff2f6] to-[#ffe4ef]">
        <div className="rounded-3xl bg-white px-10 py-12 text-center shadow-2xl">
          <p className="text-lg font-semibold text-[#a1315d]">ログインが必要です</p>
          <p className="mt-4 text-sm text-[#8b5269]">ミシェルAIをご利用いただくにはログインしてください。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gradient-to-br from-[#fff8fb] via-[#fff2f6] to-[#ffe2ef] text-[#2b152c]">
      <aside className="hidden w-[260px] flex-col border-r border-[#ffd7e8] bg-white/90 px-4 py-6 shadow-sm md:flex">
        <Button
          onClick={handleNewChat}
          disabled={isLoading.sending}
          className="mb-6 w-full justify-start gap-2 rounded-2xl border border-[#ffd7e8] bg-[#fff5f8] text-[#a1315d] shadow-sm hover:bg-white"
        >
          <Plus className="h-4 w-4" /> 新しいチャット
        </Button>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#d48ca9]">履歴</p>
        <div className="flex-1 overflow-y-auto">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => setActiveSessionId(session.id)}
              className={cn(
                "group flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left text-sm transition-all",
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
              <span className="text-sm font-semibold">履歴</span>
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <Button
              onClick={handleNewChat}
              className="mb-4 gap-2 rounded-2xl border border-[#ffd7e8] bg-[#fff5f8] text-[#a1315d]"
            >
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

      <main className="flex flex-1 flex-col bg-white/75">
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
            {isLoading.messages && <Loader2 className="h-4 w-4 animate-spin text-[#9aa4c2]" />}
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" className="text-[#b1637d]" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" /> 共有
            </Button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-white via-[#fff3f7] to-[#ffe8f1]">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-6 px-4 text-center">
              <MichelleAvatar size="lg" />
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-[#a1315d]">こんにちは、ミシェルです</h2>
                <p className="text-sm text-[#8b5269]">
                  心のモヤモヤ、誰にも言えない悩み、なんでも話してください。<br />
                  私はあなたの鏡となって、一緒に答えを探します。
                </p>
              </div>
              <div className="grid w-full max-w-2xl gap-3 px-6 md:grid-cols-2">
                {initialPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    className="rounded-2xl border border-[#ffd7e8] bg-white px-4 py-3 text-sm text-[#7a4f63] shadow-sm transition hover:-translate-y-0.5 hover:border-[#ffc8de]"
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

        <div className="border-t border-[#ffdbe8] bg-white/95 px-4 py-4">
          {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
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
              placeholder="ミシェルに話しかける..."
              className="max-h-40 flex-1 resize-none border-0 bg-transparent px-1 py-2 text-sm leading-relaxed text-[#2c122a] placeholder:text-[#c18aa0] focus:outline-none"
              rows={1}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading.sending}
              className="h-12 w-12 rounded-full bg-gradient-to-tr from-[#ff6ba6] to-[#ff8ac0] text-white shadow-lg hover:brightness-105"
            >
              {isLoading.sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
          <p className="mt-2 text-center text-[10px] text-[#c896a8]">ミシェルAIは誤った情報を生成する場合があります。重要事項は専門家にご相談ください。</p>
        </div>
      </main>
    </div>
  );
}
