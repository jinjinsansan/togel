"use client";

import { useEffect, useState, useCallback } from "react";
import { X, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LogLevel = "info" | "warn" | "error" | "debug";

type LogEntry = {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  data?: unknown;
};

const LOG_COLORS: Record<LogLevel, string> = {
  info: "bg-blue-50 text-blue-900 border-blue-200",
  warn: "bg-yellow-50 text-yellow-900 border-yellow-200",
  error: "bg-red-50 text-red-900 border-red-200",
  debug: "bg-gray-50 text-gray-900 border-gray-200",
};

const MAX_LOGS = 50;

let globalLoggerCallback: ((level: LogLevel, message: string, data?: unknown) => void) | null = null;

// グローバルに利用可能なロガー関数
export const mobileLog = {
  info: (message: string, data?: unknown) => {
    console.log("[MobileLogger]", message, data);
    globalLoggerCallback?.("info", message, data);
  },
  warn: (message: string, data?: unknown) => {
    console.warn("[MobileLogger]", message, data);
    globalLoggerCallback?.("warn", message, data);
  },
  error: (message: string, data?: unknown) => {
    console.error("[MobileLogger]", message, data);
    globalLoggerCallback?.("error", message, data);
  },
  debug: (message: string, data?: unknown) => {
    console.debug("[MobileLogger]", message, data);
    globalLoggerCallback?.("debug", message, data);
  },
};

export function MobileLogger() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const addLog = useCallback((level: LogLevel, message: string, data?: unknown) => {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      level,
      message,
      data,
    };

    setLogs((prev) => {
      const newLogs = [entry, ...prev];
      return newLogs.slice(0, MAX_LOGS);
    });

    // エラーの場合は自動的に開く
    if (level === "error") {
      setIsOpen(true);
    }
  }, []);

  useEffect(() => {
    globalLoggerCallback = addLog;

    // グローバルエラーハンドラー
    const handleError = (event: ErrorEvent) => {
      addLog("error", `Global Error: ${event.message}`, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      addLog("error", `Unhandled Rejection: ${event.reason}`, event.reason);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    // コンソールメソッドをインターセプト
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    console.error = (...args: unknown[]) => {
      originalConsoleError.apply(console, args);
      addLog("error", String(args[0]), args.slice(1));
    };

    console.warn = (...args: unknown[]) => {
      originalConsoleWarn.apply(console, args);
      addLog("warn", String(args[0]), args.slice(1));
    };

    mobileLog.info("MobileLogger initialized");

    return () => {
      globalLoggerCallback = null;
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    };
  }, [addLog]);

  const clearLogs = () => {
    setLogs([]);
    mobileLog.info("Logs cleared");
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });
  };

  const copyLogs = () => {
    const text = logs
      .map((log) => {
        const data = log.data ? `\n${JSON.stringify(log.data, null, 2)}` : "";
        return `[${formatTime(log.timestamp)}] ${log.level.toUpperCase()}: ${log.message}${data}`;
      })
      .join("\n\n");

    navigator.clipboard.writeText(text).then(() => {
      mobileLog.info("Logs copied to clipboard");
    });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-[9999] rounded-full bg-red-600 p-3 text-white shadow-lg hover:bg-red-700"
        aria-label="Open debug logger"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 6h0" />
          <path d="M12 12h0" />
          <path d="M12 18h0" />
        </svg>
        {logs.filter((l) => l.level === "error").length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500 text-xs font-bold">
            {logs.filter((l) => l.level === "error").length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-[9999] flex flex-col border-t border-gray-300 bg-white shadow-2xl",
        isExpanded ? "h-[80vh]" : "h-[40vh]",
      )}
    >
      <div className="flex items-center justify-between border-b border-gray-300 bg-gray-100 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900">Debug Logger</span>
          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-700">
            {logs.length} logs
          </span>
          {logs.filter((l) => l.level === "error").length > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
              {logs.filter((l) => l.level === "error").length} errors
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-7 w-7"
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={clearLogs} className="h-7 w-7">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={copyLogs} className="h-7 w-7">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
            </svg>
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {logs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            No logs yet
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((log) => (
              <div
                key={log.id}
                className={cn(
                  "rounded border p-2 text-xs font-mono",
                  LOG_COLORS[log.level],
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold uppercase">{log.level}</span>
                  <span className="text-[10px] opacity-70">{formatTime(log.timestamp)}</span>
                </div>
                <div className="mt-1 break-words">{String(log.message)}</div>
                {log.data ? (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-[10px] opacity-70">
                      Show data
                    </summary>
                    <pre className="mt-1 max-h-32 overflow-auto rounded bg-black/5 p-1 text-[10px]">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  </details>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
