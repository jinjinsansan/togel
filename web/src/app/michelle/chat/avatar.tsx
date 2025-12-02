"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type MichelleAvatarProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-[110px] w-[110px]",
} as const;

export const MichelleAvatar = ({ size = "md", className = "" }: MichelleAvatarProps) => {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-full border border-white/60 bg-[#ffeef4] shadow-lg",
        sizeClasses[size],
        className,
      )}
    >
      <Image src="/1.png" alt="Michelle" width={200} height={200} className="h-full w-full object-cover" />
    </div>
  );
};
