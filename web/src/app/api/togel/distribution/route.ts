import { NextResponse } from "next/server";

import { loadTogelDistribution } from "@/lib/personality/distribution";

export const revalidate = 0;

export const GET = async () => {
  try {
    const payload = await loadTogelDistribution();
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Failed to load Togel distribution", error);
    return NextResponse.json({ message: "failed to load distribution" }, { status: 500 });
  }
};
