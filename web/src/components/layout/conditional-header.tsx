"use client";

import { usePathname } from "next/navigation";
import { SiteHeader } from "./site-header";

export const ConditionalHeader = () => {
  const pathname = usePathname();
  
  // 管理者パネルではSiteHeaderを表示しない
  if (pathname.startsWith("/admin")) {
    return null;
  }
  
  return <SiteHeader />;
};
