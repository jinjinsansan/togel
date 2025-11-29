"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Menu, X } from "lucide-react";

import { useUser } from "@supabase/auth-helpers-react";
import { LoginButton } from "@/components/auth/login-button";

import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/diagnosis/select", label: "診断", en: "Diagnosis" },
  { href: "/result", label: "マッチング", en: "Matching" },
  { href: "/types", label: "型一覧", en: "Types" },
  { href: "/types/distribution", label: "分布図", en: "Distribution" },
  { href: "/mypage", label: "マイページ", en: "My Page" },
  { href: "/settings", label: "設定", en: "Settings" },
];

export const SiteHeader = () => {
  const user = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const firstNavLinkRef = useRef<HTMLAnchorElement | null>(null);
  const isBrowser = typeof document !== "undefined";

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
            <div className="absolute top-16 right-0 bottom-0 w-[85vw] max-w-sm bg-zinc-950/90 backdrop-blur-xl border-l border-white/10 shadow-2xl animate-slide-in-right flex flex-col">
              {/* 装飾的な背景グラデーション */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -right-[20%] w-[150%] h-[50%] bg-gradient-to-b from-[#E91E63]/20 to-transparent blur-3xl rounded-full" />
                <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-[#E91E63]/10 to-transparent" />
              </div>

              <div className="relative z-10 flex flex-col h-full px-6 pt-8 pb-10">
                <nav
                  id="mobile-nav-panel"
                  className="flex flex-col gap-2"
                >
                  <p className="text-xs font-bold text-white/40 tracking-widest mb-4 px-4">MENU</p>
                  {navItems.map((item, index) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      ref={index === 0 ? firstNavLinkRef : undefined}
                      className="group relative flex items-center py-4 px-4 rounded-xl hover:bg-white/5 transition-all active:scale-[0.98]"
                      onClick={closeMenu}
                      style={{
                        animation: `fade-in-up 0.5s ease-out ${index * 0.05}s backwards`
                      }}
                    >
                      <span className="text-lg font-bold text-white group-hover:text-[#E91E63] transition-colors">
                        {item.label}
                      </span>
                      <span className="ml-auto text-white/30 group-hover:text-[#E91E63] group-hover:translate-x-1 transition-all">
                        →
                      </span>
                    </Link>
                  ))}
                </nav>

                <div className="mt-auto space-y-6">
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  
                  <div className="px-2">
                    {!user ? (
                      <LoginButton />
                    ) : (
                      <Button
                        className="h-14 w-full rounded-xl bg-gradient-to-r from-[#E91E63] to-[#C2185B] text-lg font-bold text-white shadow-lg shadow-[#E91E63]/25 hover:shadow-xl hover:shadow-[#E91E63]/40 hover:-translate-y-0.5 transition-all"
                        asChild
                      >
                        <Link href="/mypage" onClick={closeMenu}>
                          マイページへ
                        </Link>
                      </Button>
                    )}
                    {!user && (
                      <p className="mt-3 text-center text-xs text-white/40">
                        ログインして診断結果を保存
                      </p>
                    )}
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
          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="text-[#E91E63]/80 transition-colors hover:text-[#E91E63]">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {/* Desktop Auth Button */}
            <div className="hidden md:block">
              {!user ? (
                <LoginButton />
              ) : (
                <Button
                  variant="outline"
                  asChild
                  className="border-[#E91E63] text-[#E91E63] hover:bg-[#E91E63] hover:text-white"
                >
                  <Link href="/mypage">マイページ</Link>
                </Button>
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
