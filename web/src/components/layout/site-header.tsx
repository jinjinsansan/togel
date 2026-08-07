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
import { TogelMark } from "@/components/brand/togel-mark";
import { MICHELLE_AI_ENABLED, MICHELLE_ATTRACTION_AI_ENABLED } from "@/lib/feature-flags";

const primaryNavItems = [
  { href: "/result/mismatch", label: "ミスマッチ" },
  { href: "/result", label: "診断結果" },
  { href: "/coaching", label: "地雷回避ガイド" },
  { href: "/types", label: "24タイプ" },
  { href: "/types/distribution", label: "分布図" },
];

const journeyNavItems = [
  ...(MICHELLE_AI_ENABLED ? [{ href: "/michelle", label: "心理カウンセリング" }] : []),
  ...(MICHELLE_ATTRACTION_AI_ENABLED
    ? [{ href: "/michelle/attraction", label: "引き寄せ講座" }]
    : []),
];

const utilityNavItems = [
  { href: "/profile/edit", label: "プロフィール" },
  { href: "/mypage", label: "マイページ" },
  { href: "https://lin.ee/T7OYAGQ", label: "お問い合わせ" },
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
              className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
              onClick={closeMenu}
            />

            {/* メニュー本体 */}
            <div className="absolute top-[66px] right-0 bottom-0 w-[85vw] max-w-sm bg-panel border-l border-line shadow-2xl animate-slide-in-right flex flex-col overflow-y-auto">
              <div className="relative flex flex-col h-full">
                {/* ブランディングエリア */}
                <div className="relative bg-ink px-6 pt-7 pb-6 border-b border-line-soft">
                  <div className="flex items-center gap-3">
                    <TogelMark size={44} className="rounded-2xl" />
                    <div>
                      <h2 className="font-heading text-xl font-black text-white">Togel</h2>
                      <p className="mt-0.5 text-[10px] font-bold tracking-[0.18em] text-txt-subtle">
                        運命の人は教えない。地雷なら教える。
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/diagnosis/select"
                    onClick={closeMenu}
                    className="mt-5 flex min-h-[52px] items-center justify-center rounded-[14px] bg-hazard text-sm font-black text-ink shadow-cta transition-transform active:scale-[0.98]"
                  >
                    診断する
                  </Link>
                </div>

                {/* ナビゲーションエリア */}
                <div className="flex-1 px-6 py-6">
                  <nav id="mobile-nav-panel" className="space-y-7">
                    <div>
                      <h3 className="text-[10px] font-black tracking-[0.22em] text-txt-subtle mb-3 px-2">メニュー</h3>
                      <div className="space-y-1">
                        {primaryNavItems.map((item, index) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            ref={index === 0 ? firstNavLinkRef : undefined}
                            className="group flex items-center py-3 px-2 rounded-[10px] hover:bg-white/5 transition-all active:scale-[0.98]"
                            onClick={closeMenu}
                          >
                            <span className="text-[15px] font-bold text-white/90 group-hover:text-white transition-colors">
                              {item.label}
                            </span>
                            <span className="ml-auto text-txt-disabled group-hover:text-primary group-hover:translate-x-1 transition-all">
                              →
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>

                    {journeyNavItems.length > 0 && (
                      <div>
                        <h3 className="text-[10px] font-black tracking-[0.22em] text-txt-subtle mb-3 px-2">サポート</h3>
                        <div className="space-y-1">
                          {journeyNavItems.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              className="group flex items-center py-3 px-2 rounded-[10px] hover:bg-white/5 transition-all active:scale-[0.98]"
                              onClick={closeMenu}
                            >
                              <span className="text-[15px] font-bold text-white/90 group-hover:text-white transition-colors">
                                {item.label}
                              </span>
                              <span className="ml-auto text-txt-disabled group-hover:text-primary group-hover:translate-x-1 transition-all">
                                →
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h3 className="text-[10px] font-black tracking-[0.22em] text-txt-subtle mb-3 px-2">その他</h3>
                      <div className="space-y-1">
                        {utilityNavItems.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            className="group flex items-center py-3 px-2 rounded-[10px] hover:bg-white/5 transition-all active:scale-[0.98]"
                            onClick={closeMenu}
                            target={item.href.startsWith("http") ? "_blank" : undefined}
                          >
                            <span className="text-[15px] font-bold text-white/90 group-hover:text-white transition-colors">
                              {item.label}
                            </span>
                            <span className="ml-auto text-txt-disabled group-hover:text-primary group-hover:translate-x-1 transition-all">
                              →
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </nav>
                </div>

                {/* フッターエリア */}
                <div className="border-t border-line-soft px-6 py-6 bg-panel">
                  <div className="space-y-4">
                    {!user ? (
                      <>
                        <LoginButton />
                        <p className="text-center text-xs text-txt-subtle">
                          ログインして診断結果を保存
                        </p>
                      </>
                    ) : (
                      <div className="space-y-3">
                        {isAdmin && (
                          <Button
                            className="h-12 w-full rounded-input border border-line bg-white/5 text-sm font-bold text-white shadow-none hover:bg-white/10"
                            asChild
                          >
                            <Link href="/admin" onClick={closeMenu}>
                              管理者パネル
                            </Link>
                          </Button>
                        )}
                        <Button
                          className="h-12 w-full rounded-input bg-primary text-sm font-black text-white shadow-danger hover:bg-primary-hover transition-all"
                          asChild
                        >
                          <Link href="/mypage" onClick={closeMenu}>
                            マイページへ
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          className="h-10 w-full rounded-input border-line bg-transparent text-txt-muted hover:bg-white/5 hover:text-white"
                          onClick={() => {
                            handleLogout();
                            closeMenu();
                          }}
                        >
                          ログアウト
                        </Button>
                      </div>
                    )}

                    <div className="pt-4 border-t border-line-soft">
                      <p className="text-xs text-txt-subtle text-center">
                        © {new Date().getFullYear()} Togel. All rights reserved.
                      </p>
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
      <header className="sticky top-0 z-[15000]">
        {/* サイト全体の識別子: ハザードテープ */}
        <div className="h-[10px] bg-hazard-sm" aria-hidden="true" />
        <div className="border-b border-line-soft bg-base/95 backdrop-blur">
          <div className="container flex h-[56px] items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 font-heading text-lg font-black text-white"
              onClick={closeMenu}
            >
              <TogelMark size={28} />
              Togel
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden items-center gap-1 text-[13px] font-bold text-txt-muted md:flex">
              {primaryNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full px-3 py-1.5 transition-colors hover:bg-white/5 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
              {journeyNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full px-3 py-1.5 transition-colors hover:bg-white/5 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
              {utilityNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full px-3 py-1.5 text-txt-subtle transition-colors hover:bg-white/5 hover:text-white"
                  target={item.href.startsWith("http") ? "_blank" : undefined}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              {/* Desktop Auth */}
              <div className="hidden items-center gap-2 md:flex">
                {!user ? (
                  <LoginButton />
                ) : (
                  <>
                    {isAdmin && (
                      <Button
                        variant="outline"
                        asChild
                        className="h-9 rounded-full border-line bg-transparent text-xs font-bold text-txt-muted hover:bg-white/5 hover:text-white"
                      >
                        <Link href="/admin">管理者パネル</Link>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleLogout}
                      className="text-txt-subtle hover:bg-white/5 hover:text-white"
                      aria-label="ログアウト"
                    >
                      <LogOut size={18} />
                    </Button>
                  </>
                )}
              </div>

              {/* 常設CTA */}
              <Link
                href="/diagnosis/select"
                className="flex h-9 items-center rounded-full bg-hazard px-4 text-[13px] font-black text-ink shadow-cta transition-transform hover:scale-[1.03] active:scale-[0.97]"
              >
                診断する
              </Link>

              {/* Mobile Hamburger */}
              <button
                type="button"
                className="flex items-center justify-center rounded-full border border-line p-2 text-white md:hidden transition-colors hover:bg-white/5"
                onClick={toggleMenu}
                aria-label={isOpen ? "メニューを閉じる" : "メニューを開く"}
                aria-expanded={isOpen}
                aria-controls="mobile-nav-panel"
              >
                {isOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {overlay}
    </>
  );
};
