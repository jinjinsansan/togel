"use client";

import { usePathname } from "next/navigation";

import { SiteFooter } from "@/components/layout/site-footer";

const EXCLUDE_FOOTER_PATHS = [
  "/michelle",
  "/michelle/attraction",
  "/diagnosis",
  "/admin"
];

export const ConditionalFooter = () => {
  const pathname = usePathname();

  // チャットページや管理画面ではフッターを非表示
  if (EXCLUDE_FOOTER_PATHS.some(path => pathname.startsWith(path))) {
    return null;
  }

  return <SiteFooter />;
};
