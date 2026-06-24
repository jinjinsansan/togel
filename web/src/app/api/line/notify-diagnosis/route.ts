import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";
import { pushMessage } from "@/lib/line/client";
import { diagnosisResultMessages } from "@/lib/line/messages";
import { updateLineUserDiagnosis } from "@/lib/line/db";
import { denyUnlessInternal } from "@/lib/auth/internal";
import type { BigFiveScores, PersonalityTypeDefinition } from "@/types/diagnosis";

export async function POST(req: NextRequest) {
  const denied = await denyUnlessInternal(req);
  if (denied) {
    return NextResponse.json({ error: denied }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { lineUserId, gender, togelType, diagnosisResult, bigFiveScores } = body;

    if (!lineUserId || !togelType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await updateLineUserDiagnosis({
      lineUserId,
      gender: gender ?? "male",
      togelType,
      diagnosisResult: diagnosisResult ?? {},
      bigFiveScores: bigFiveScores ?? {},
    });

    if (diagnosisResult?.personalityType && bigFiveScores) {
      const resultMsgs = diagnosisResultMessages(
        bigFiveScores as BigFiveScores,
        diagnosisResult.personalityType as PersonalityTypeDefinition,
      );
      await pushMessage(lineUserId, resultMsgs);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[LINE Notify] Error:", err);
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
