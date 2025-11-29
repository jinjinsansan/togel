"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/diagnosis/select", label: "診断", en: "Diagnosis" },
  { href: "/result", label: "マッチング", en: "Matching" },
  { href: "/types", label: "Togel一覧", en: "Types" },
  { href: "/types/distribution", label: "Togel分布", en: "Distribution" },
  { href: "/mypage", label: "マイページ", en: "My Page" },
  { href: "/settings", label: "設定", en: "Settings" },
];

export const SiteHeader = () => {
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
            className="mobile-nav-overlay fixed inset-0 top-16 z-[14000] bg-white/60 backdrop-blur-lg md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="ナビゲーションメニュー"
            onClick={closeMenu}
            style={{ top: '64px' }}
          >
            <div
              className="relative z-10 flex h-full flex-col pb-12 pt-8"
              onClick={(event) => event.stopPropagation()}
            >
              {/* Nav Content */}
              <div className="flex flex-1 flex-col overflow-y-auto px-6">
                <nav
                  id="mobile-nav-panel"
                  className="flex flex-col items-start justify-center gap-10 pl-8"
                >
                  {navItems.map((item, index) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      ref={index === 0 ? firstNavLinkRef : undefined}
                      className="group flex flex-col items-start"
                      onClick={closeMenu}
                    >
                      <span className="font-heading text-3xl font-thin tracking-tight text-[#E91E63] transition-colors group-hover:text-[#d81b60]">
                        {item.en}
                      </span>
                      <span className="text-sm font-medium text-[#E91E63]/70 group-hover:text-[#d81b60]/80">
                        {item.label}
                      </span>
                    </Link>
                  ))}
                </nav>

                <div className="mt-auto flex flex-col gap-4 pt-12 pb-8 px-4">
                  <Button
                    className="h-14 w-full rounded-full bg-[#E91E63] text-lg font-bold text-white shadow-lg hover:bg-[#c2185b]"
                    asChild
                  >
                    <Link href="/diagnosis/select" onClick={closeMenu}>
                      診断をはじめる
                    </Link>
                  </Button>
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
            {/* Desktop Button */}
            <Button
              variant="outline"
              asChild
              className="hidden border-[#E91E63] text-[#E91E63] transition-colors hover:bg-[#E91E63] hover:text-white md:flex"
            >
              <Link href="/diagnosis/select">診断をはじめる</Link>
            </Button>

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
