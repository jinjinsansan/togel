"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/diagnosis/select", label: "診断" },
  { href: "/result", label: "マッチング" },
  { href: "/types", label: "Togel一覧" },
  { href: "/types/distribution", label: "Togel分布" },
  { href: "/mypage", label: "マイページ" },
  { href: "/settings", label: "設定" },
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
            className="mobile-nav-overlay fixed inset-0 z-[9999] bg-white md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="ナビゲーションメニュー"
            onClick={closeMenu}
            style={{ backgroundColor: '#FFFFFF' }}
          >
            <div className="absolute inset-0 bg-white opacity-100" aria-hidden="true" style={{ backgroundColor: '#FFFFFF' }} />
            <div className="absolute inset-0 bg-white opacity-100" aria-hidden="true" style={{ backgroundColor: '#FFFFFF' }} />
            <div className="absolute inset-0 bg-white opacity-100" aria-hidden="true" style={{ backgroundColor: '#FFFFFF' }} />
            <div
              className="relative z-10 flex h-full flex-col overflow-y-auto bg-white px-6 pb-12 pt-20"
              onClick={(event) => event.stopPropagation()}
              style={{ backgroundColor: '#FFFFFF' }}
            >
              <div className="flex items-center justify-between">
                <Link
                  href="/"
                  className="font-heading text-2xl font-semibold text-[#E91E63]"
                  onClick={closeMenu}
                >
                  Togel
                </Link>
                <button
                  type="button"
                  className="inline-flex flex-col items-center justify-center rounded-full border border-[#E91E63]/30 px-4 py-2 text-[#E91E63] shadow-sm"
                  onClick={closeMenu}
                  aria-label="メニューを閉じる"
                >
                  <Menu size={20} aria-hidden="true" />
                  <span className="text-[0.65rem] font-semibold tracking-[0.2em]">CLOSE</span>
                </button>
              </div>

              <nav
                id="mobile-nav-panel"
                className="mt-12 flex flex-1 flex-col justify-center gap-8 text-center"
              >
                {navItems.map((item, index) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    ref={index === 0 ? firstNavLinkRef : undefined}
                    className="text-2xl font-semibold tracking-wide text-[#E91E63]"
                    onClick={closeMenu}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <Button
                className="mt-auto h-14 w-full rounded-full bg-[#E91E63] text-lg font-semibold text-white shadow-lg hover:bg-[#c2185b]"
                asChild
              >
                <Link href="/diagnosis/select" onClick={closeMenu}>
                  診断をはじめる
                </Link>
              </Button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <header className="sticky top-0 z-[15000] bg-white backdrop-blur">
        <div className={`container flex h-16 items-center justify-between transition-opacity ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <Link href="/" className="font-heading text-xl font-semibold text-[#E91E63]">
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
              className="flex items-center justify-center rounded-full border border-[#E91E63]/30 p-2 text-[#E91E63] md:hidden"
              onClick={toggleMenu}
              aria-label={isOpen ? "メニューを閉じる" : "メニューを開く"}
              aria-expanded={isOpen}
              aria-controls="mobile-nav-panel"
            >
              <Menu size={24} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {overlay}
    </>
  );
};
