"use client";

import { usePathname } from "next/navigation";

import { FooterHighlight } from "@/components/layout/footer-highlight";
import { SiteFooter } from "@/components/layout/site-footer";

export const ConditionalFooter = () => {
  const pathname = usePathname();

  if (pathname !== "/") {
    return null;
  }

  return (
    <>
      <FooterHighlight />
      <SiteFooter />
    </>
  );
};
