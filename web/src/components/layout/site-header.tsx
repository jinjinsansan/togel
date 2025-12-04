"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Menu, X, LogOut } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";

import { LoginButton } from "@/components/auth/login-button";
import { Button } from "@/components/ui/button";
import { MICHELLE_AI_ENABLED, MICHELLE_ATTRACTION_AI_ENABLED } from "@/lib/feature-flags";

const primaryNavItems = [
  { href: "/diagnosis/select", label: "診断" },
  { href: "/result", label: "マッチング結果" },
  { href: "/types", label: "型一覧" },
  { href: "/types/distribution", label: "分布図" },
  { href: "/profile/edit", label: "プロフィール" },
];

const journeyNavItems = [
  ...(MICHELLE_AI_ENABLED
    ? [{ href: "/michelle", label: "心理カウンセリング" }]
    : []),
  ...(MICHELLE_ATTRACTION_AI_ENABLED
    ? [{ href: "/michelle/attraction", label: "引き寄せ講座" }]
    : []),
];

const utilityNavItems = [
  { href: "/points", label: "ポイント" },
  { href: "https://lin.ee/T7OYAGQ", label: "お問い合わせ" },
  { href: "/mypage", label: "マイページ" },
];

const ADMIN_EMAILS = ["goldbenchan@gmail.com", "kusanokiyoshi1@gmail.com"];

export const SiteHeader = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const firstNavLinkRef = useRef<HTMLAnchorElement | null>(null);
  const isBrowser = typeof document !== "undefined";
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/");
    router.refresh();
  };

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!isBrowser) return;

    const { body } = document;

    if (isOpen) {
      body.style.setProperty("overflow", "hidden");
      body.dataset.menuOpen = "true";
    } else {
      body.style.removeProperty("overflow");
      delete body.dataset.menuOpen;
    }

    return () => {
      body.style.removeProperty("overflow");
      delete body.dataset.menuOpen;
    };
  }, [isBrowser, isOpen]);

  useEffect(() => {
    if (!isBrowser || !isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isBrowser, isOpen]);

  useEffect(() => {
    if (!isBrowser || !isOpen || !firstNavLinkRef.current) {
      return;
    }

    firstNavLinkRef.current.focus();

    const node = firstNavLinkRef.current;

    return () => {
      if (node && typeof node.blur === "function") {
        node.blur();
      }
    };
  }, [isBrowser, isOpen]);

  const closeMenu = () => setIsOpen(false);
  const toggleMenu = () => setIsOpen((prev) => !prev);

  const overlay =
    isBrowser && isOpen
      ? createPortal(
          <div
            className="mobile-nav-overlay fixed inset-0 top-0 z-[14000] md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="ナビゲーションメニュー"
          >
            {/* 背景オーバーレイ */}
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
              onClick={closeMenu}
            />

            {/* メニュー本体 */}
            <div className="absolute top-16 right-0 bottom-0 w-[85vw] max-w-sm bg-[#0a0a0a] backdrop-blur-xl border-l border-white/10 shadow-2xl animate-slide-in-right flex flex-col overflow-y-auto">
              <div className="relative flex flex-col h-full">
                {/* ブランディングエリア */}
                <div className="relative bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] px-6 pt-8 pb-6 border-b border-white/10">
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#E91E63]/20 rounded-full blur-3xl" />
                  </div>
                  
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E91E63] to-[#C2185B] shadow-lg shadow-[#E91E63]/30">
                        <span className="font-heading text-2xl font-bold text-white">T</span>
                      </div>
                      <div>
                        <h2 className="font-heading text-2xl font-bold text-white">Togel</h2>
                        <p className="text-xs text-white/50">24タイプ性格診断AI</p>
                      </div>
                    </div>
                    
                    <p className="text-sm leading-relaxed text-white/70">
                      あなたの本音と相性が一瞬でわかる<br />
                      24タイプTogel型診断+AIマッチング
                    </p>

                    <a
                      href="https://lin.ee/T7OYAGQ"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-[#06C755] to-[#00B900] py-3 px-4 text-sm font-bold text-white shadow-lg shadow-[#06C755]/20 hover:shadow-xl hover:shadow-[#06C755]/30 transition-all active:scale-[0.98]"
                      onClick={closeMenu}
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                      </svg>
                      LINEでお問い合わせ
                    </a>
                  </div>
                </div>

                {/* ナビゲーションエリア */}
                <div className="flex-1 px-6 py-6">
                  <nav id="mobile-nav-panel" className="space-y-8">
                    {/* プロダクト */}
                    <div>
                      <h3 className="text-xs font-bold text-white/40 tracking-widest mb-3 px-2">プロダクト</h3>
                      <div className="space-y-1">
                        {primaryNavItems.map((item, index) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            ref={index === 0 ? firstNavLinkRef : undefined}
                            className="group flex items-center py-3 px-2 rounded-lg hover:bg-white/5 transition-all active:scale-[0.98]"
                            onClick={closeMenu}
                          >
                            <span className="text-base font-medium text-white/90 group-hover:text-white transition-colors">
                              {item.label}
                            </span>
                            <span className="ml-auto text-white/20 group-hover:text-[#E91E63] group-hover:translate-x-1 transition-all">
                              →
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>

                    {/* サポート */}
                    {journeyNavItems.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold text-white/40 tracking-widest mb-3 px-2">サポート</h3>
                        <div className="space-y-1">
                          {journeyNavItems.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              className="group flex items-center py-3 px-2 rounded-lg hover:bg-white/5 transition-all active:scale-[0.98]"
                              onClick={closeMenu}
                            >
                              <span className="text-base font-medium text-white/90 group-hover:text-white transition-colors">
                                {item.label}
                              </span>
                              <span className="ml-auto text-white/20 group-hover:text-[#E91E63] group-hover:translate-x-1 transition-all">
                                →
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* その他 */}
                    <div>
                      <h3 className="text-xs font-bold text-white/40 tracking-widest mb-3 px-2">その他</h3>
                      <div className="space-y-1">
                        {utilityNavItems.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            className="group flex items-center py-3 px-2 rounded-lg hover:bg-white/5 transition-all active:scale-[0.98]"
                            onClick={closeMenu}
                            target={item.href.startsWith("http") ? "_blank" : undefined}
                          >
                            <span className="text-base font-medium text-white/90 group-hover:text-white transition-colors">
                              {item.label}
                            </span>
                            <span className="ml-auto text-white/20 group-hover:text-[#E91E63] group-hover:translate-x-1 transition-all">
                              →
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </nav>
                </div>

                {/* フッターエリア */}
                <div className="border-t border-white/10 px-6 py-6 bg-[#0a0a0a]">
                  <div className="space-y-4">
                    {!user ? (
                      <>
                        <LoginButton />
                        <p className="text-center text-xs text-white/40">
                          ログインして診断結果を保存
                        </p>
                      </>
                    ) : (
                      <div className="space-y-3">
                        {isAdmin && (
                          <Button
                            className="h-12 w-full rounded-xl border border-white/20 bg-white/5 text-sm font-semibold text-white shadow-none hover:bg-white/10"
                            asChild
                          >
                            <Link href="/admin" onClick={closeMenu}>
                              管理者パネル
                            </Link>
                          </Button>
                        )}
                        <Button
                          className="h-12 w-full rounded-xl bg-gradient-to-r from-[#E91E63] to-[#C2185B] text-sm font-bold text-white shadow-lg shadow-[#E91E63]/25 hover:shadow-xl hover:shadow-[#E91E63]/40 hover:-translate-y-0.5 transition-all"
                          asChild
                        >
                          <Link href="/mypage" onClick={closeMenu}>
                            マイページへ
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          className="h-10 w-full rounded-xl border-red-900/50 bg-red-950/20 text-red-400 hover:bg-red-900/30 hover:text-red-300"
                          onClick={() => {
                            handleLogout();
                            closeMenu();
                          }}
                        >
                          ログアウト
                        </Button>
                      </div>
                    )}

                    <div className="pt-4 border-t border-white/5">
                      <p className="text-xs text-white/30 text-center">
                        © {new Date().getFullYear()} Togel. All rights reserved.
                      </p>
                      <div className="mt-2 flex items-center justify-center gap-2 text-xs text-white/40">
                        <span>D-powerAIチーム</span>
                        <span className="h-1 w-1 rounded-full bg-white/20" />
                        <span>全てのサービスにAIを</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <header className="sticky top-0 z-[15000] bg-white backdrop-blur border-b border-[#E91E63]/10">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="font-heading text-xl font-semibold text-[#E91E63]" onClick={closeMenu}>
            Togel
          </Link>
          
          {/* Desktop Nav */}
          <div className="hidden flex-col gap-1 md:flex">
            <nav className="flex items-center gap-4 text-[13px] font-semibold text-[#ba2d65]">
              {primaryNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full px-3 py-1 transition-colors hover:bg-[#ffe4ef] hover:text-[#E91E63]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <nav className="flex items-center gap-3 text-[12px] text-[#7a4c63]">
              {journeyNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-[#f3c5d7] px-3 py-0.5 transition-colors hover:border-[#E91E63] hover:text-[#E91E63]"
                >
                  {item.label}
                </Link>
              ))}
              {journeyNavItems.length > 0 && <span className="h-3 w-px bg-[#f0cada]" aria-hidden="true" />}
              {utilityNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-2 py-0.5 text-[#956477] transition-colors hover:text-[#E91E63]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {/* Desktop Auth Button */}
            <div className="hidden md:flex items-center gap-2">
              {!user ? (
                <LoginButton />
              ) : (
                <>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      asChild
                      className="border-slate-800 text-slate-800 hover:bg-slate-100"
                    >
                      <Link href="/admin">管理者パネル</Link>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    className="text-slate-500 hover:text-[#E91E63] hover:bg-red-50"
                    aria-label="ログアウト"
                  >
                    <LogOut size={20} />
                  </Button>
                </>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              className="flex items-center justify-center rounded-full border border-[#E91E63]/30 p-2 text-[#E91E63] md:hidden transition-colors hover:bg-[#E91E63]/5"
              onClick={toggleMenu}
              aria-label={isOpen ? "メニューを閉じる" : "メニューを開く"}
              aria-expanded={isOpen}
              aria-controls="mobile-nav-panel"
            >
              {isOpen ? (
                <X size={24} aria-hidden="true" />
              ) : (
                <Menu size={24} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </header>

      {overlay}
    </>
  );
};
