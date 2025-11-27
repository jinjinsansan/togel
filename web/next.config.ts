import type { NextConfig } from "next";

type RemotePattern = NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>[number];

const remotePatterns: RemotePattern[] = [
  {
    protocol: "https",
    hostname: "api.dicebear.com",
  },
  {
    protocol: "https",
    hostname: "images.unsplash.com",
  },
];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (supabaseUrl) {
  try {
    const hostname = new URL(supabaseUrl).hostname;
    remotePatterns.push({ protocol: "https", hostname });
  } catch (error) {
    console.warn("Invalid NEXT_PUBLIC_SUPABASE_URL for image remotePatterns", error);
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
};

export default nextConfig;
