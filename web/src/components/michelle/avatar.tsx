"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type MichelleAvatarProps = {
  size?: "sm" | "md" | "lg";
  variant?: "rose" | "aqua";
  className?: string;
};

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-[110px] w-[110px]",
} as const;

const variantClasses = {
  rose: "border-white/60 bg-[#ffeef4]",
  aqua: "border-white/70 bg-[#e0f4ff]",
} as const;

export const MichelleAvatar = ({ size = "md", variant = "rose", className = "" }: MichelleAvatarProps) => {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-full shadow-lg",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
    >
      <Image src="/1.png" alt="Michelle" width={200} height={200} className="h-full w-full object-cover" />
    </div>
  );
};
