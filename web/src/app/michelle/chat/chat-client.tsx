"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
};

type KnowledgeReference = {
  id: string;
  content?: string;
  similarity?: number;
};

type StreamPayload = {
  type: "meta" | "delta" | "done" | "error";
  content?: string;
  message?: string;
  sessionId?: string;
  knowledge?: KnowledgeReference[];
};

const initialAssistantMessage =
  "こんにちは、ミシェルAIです。まずは状況を自由に話してみてください。うまく言葉にならなくても大丈夫です。";

export function MichelleChatClient() {
  const [messages, setMessages] = useState<Message[]>([
    { id: "intro", role: "assistant", content: initialAssistantMessage },
  ]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [knowledgeRefs, setKnowledgeRefs] = useState<KnowledgeReference[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;
    const content = input.trim();
    setInput("");
    setError(null);

    const userId = `user-${Date.now()}`;
    const assistantId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: userId, role: "user", content, pending: false },
      { id: assistantId, role: "assistant", content: "", pending: true },
    ]);

    setIsSending(true);

    try {
      const response = await fetch("/api/michelle/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId ?? undefined,
          message: content,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("ネットワークエラーが発生しました");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

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
                setSessionId(payload.sessionId);
              }
              if (payload.knowledge) {
                setKnowledgeRefs(payload.knowledge);
              }
            }
            if (payload.type === "delta" && payload.content) {
              assistantMessage += payload.content;
              setMessages((prev) =>
                prev.map((msg) => (msg.id === assistantId ? { ...msg, content: assistantMessage } : msg)),
              );
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
          msg.id === assistantId
            ? { ...msg, content: assistantMessage || "少し時間をおいてもう一度お試しください。", pending: false }
            : msg,
        ),
      );
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "送信に失敗しました");
      setMessages((prev) => prev.filter((msg) => msg.id !== assistantId && msg.id !== userId));
      setMessages((prev) => [
        ...prev,
        { id: userId, role: "user", content, pending: false },
        { id: assistantId, role: "assistant", content: "申し訳ありません。もう一度送ってみてください。", pending: false },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-white via-pink-50/30 to-white py-10">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg">
          <div className="rounded-2xl border border-pink-100 bg-pink-50/60 p-4 text-sm text-slate-700">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-pink-400">Michelle Psychology</p>
            <p className="mt-3 leading-relaxed">
              思考・感情・行動の3層に働きかけるミシェル心理学をベースに、AIが寄り添いながら対話を進めます。
              質問に答えられなくても大丈夫。感じていることをそのまま書いてみてください。
            </p>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">SESSION</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{sessionId ? "継続中" : "新しい対話"}</p>
              <p className="text-xs text-slate-500">同じ画面で続けると流れを保持できます。</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">REFERENCES</p>
              {knowledgeRefs.length === 0 ? (
                <p className="mt-2 text-xs text-slate-500">初回メッセージでは内部知識の参照結果をこちらに表示します。</p>
              ) : (
                <ul className="mt-2 space-y-2 text-xs text-slate-600">
                  {knowledgeRefs.map((ref) => (
                    <li key={ref.id} className="rounded-xl border border-pink-100/70 bg-white/70 p-3">
                      <p className="font-semibold text-pink-600">参考ノート</p>
                      <p className="mt-1 line-clamp-3">{ref.content ?? "非公開メモ"}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </aside>

        <section className="flex h-[70vh] flex-col rounded-3xl border border-white/60 bg-white shadow-2xl">
          <div className="flex items-center gap-3 border-b border-pink-50 px-6 py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-100 text-pink-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-pink-400">Michelle AI</p>
              <p className="text-sm text-slate-500">思考をほぐし、次の一歩を一緒に探します</p>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
            {messages.map((message) => (
              <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start") }>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                    message.role === "user"
                      ? "rounded-br-sm bg-gradient-to-br from-[#E91E63] to-[#D81B60] text-white"
                      : "rounded-bl-sm border border-pink-100 bg-white text-slate-700",
                  )}
                >
                  {message.content || (message.pending ? "考えを整理しています..." : "")}
                  {message.pending && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      処理中
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-pink-50 px-6 py-4">
            {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
            <div className="flex items-end gap-3">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                placeholder="今どんな状況か教えてください。"
                className="h-24 flex-1 resize-none rounded-2xl border border-pink-100 bg-pink-50/60 px-4 py-3 text-sm text-slate-700 outline-none focus:border-pink-300"
              />
              <Button
                onClick={handleSend}
                disabled={isSending || !input.trim()}
                className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#E91E63] to-[#D81B60] p-0 text-white shadow-lg disabled:opacity-60"
              >
                {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Shift+Enterで改行できます。</p>
          </div>
        </section>
      </div>
    </div>
  );
}
