"use client";

import { usePathname } from "next/navigation";
import { SiteHeader } from "./site-header";

export const ConditionalHeader = () => {
  const pathname = usePathname();
  
  // 管理者パネル・LIFFではSiteHeaderを表示しない
  if (pathname.startsWith("/admin") || pathname.startsWith("/liff")) {
    return null;
  }
  
  return <SiteHeader />;
};
