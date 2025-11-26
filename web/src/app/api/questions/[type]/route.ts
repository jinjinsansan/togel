import { NextRequest, NextResponse } from "next/server";

import { getQuestionsByType } from "@/data/questions";

type Params = Promise<{
  type: string;
}>;

export const GET = async (_request: NextRequest, { params }: { params: Params }) => {
  const resolvedParams = await params;
  const typeParam =
    resolvedParams.type === "full"
      ? "full"
      : resolvedParams.type === "light"
        ? "light"
        : null;
  if (!typeParam) {
    return NextResponse.json({ message: "invalid diagnosis type" }, { status: 400 });
  }
  const data = getQuestionsByType(typeParam);
  return NextResponse.json({ questions: data });
};
