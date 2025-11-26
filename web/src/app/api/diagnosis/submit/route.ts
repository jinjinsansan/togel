import { NextResponse } from "next/server";
import { z } from "zod";

import { runMatching } from "@/lib/matching/engine";

const schema = z.object({
  diagnosisType: z.enum(["light", "full"]),
  answers: z
    .array(
      z.object({
        questionId: z.string(),
        value: z.number().min(1).max(5),
      })
    )
    .min(1),
});

export const POST = async (request: Request) => {
  const json = await request.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ message: "invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const results = runMatching(parsed.data);
  return NextResponse.json({ results });
};
