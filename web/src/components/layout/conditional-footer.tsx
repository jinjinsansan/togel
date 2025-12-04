"use client";

import { usePathname } from "next/navigation";

import { SiteFooter } from "@/components/layout/site-footer";

const EXCLUDE_FOOTER_PATHS = [
  "/michelle",
  "/michelle/attraction",
  "/diagnosis",
  "/admin",
  "/result",
  "/result/mismatch",
];

const MOBILE_ALLOWED_PATHS = ["/"];

export const ConditionalFooter = () => {
  const pathname = usePathname();

  if (EXCLUDE_FOOTER_PATHS.some((path) => pathname.startsWith(path))) {
    return null;
  }

  const allowMobileFooter = MOBILE_ALLOWED_PATHS.includes(pathname);

  return (
    <>
      <div className="hidden md:block">
        <SiteFooter />
      </div>
      {allowMobileFooter && (
        <div className="block md:hidden">
          <SiteFooter />
        </div>
      )}
    </>
  );
};
