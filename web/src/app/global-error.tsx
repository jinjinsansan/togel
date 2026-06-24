"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error boundary:", error);
  }, [error]);

  return (
    <html lang="ja">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          backgroundColor: "#f8fafc",
          fontFamily: "sans-serif",
          textAlign: "center",
          padding: "1.5rem",
        }}
      >
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#1e293b" }}>
          重大なエラーが発生しました
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#64748b" }}>
          ページを再読み込みしてください。
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            borderRadius: "9999px",
            backgroundColor: "#E91E63",
            color: "white",
            padding: "0.625rem 1.5rem",
            fontSize: "0.875rem",
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
          }}
        >
          再試行
        </button>
      </body>
    </html>
  );
}
