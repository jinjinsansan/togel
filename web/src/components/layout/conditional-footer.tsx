"use client";

import { usePathname } from "next/navigation";

import { showsFooter } from "@/components/layout/footer-paths";
import { SiteFooter } from "@/components/layout/site-footer";

export const ConditionalFooter = () => {
  const pathname = usePathname();

  if (!showsFooter(pathname)) {
    return null;
  }

  return (
    <>
      <div className="hidden md:block">
        <SiteFooter />
      </div>
      <div className="block md:hidden">
        <SiteFooter />
      </div>
    </>
  );
};
