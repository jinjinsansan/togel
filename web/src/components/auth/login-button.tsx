"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export const LoginButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClientComponentClient();

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "line",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: "profile openid email", // メール取得にはLINE側での申請も必須
        },
      });

      if (error) {
        console.error("Login error:", error);
        alert("ログインに失敗しました");
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("エラーが発生しました");
    } finally {
      // リダイレクトされるため、loading状態を解除する必要はあまりないが、
      // エラー時などのために解除
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="default"
      className="bg-[#06C755] text-white hover:bg-[#06C755]/90 font-bold"
      onClick={handleLogin}
      disabled={isLoading}
    >
      {isLoading ? "接続中..." : "LINEでログイン"}
    </Button>
  );
};
