import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";
import { pushMessage } from "@/lib/line/client";
import { diagnosisCompleteMessage } from "@/lib/line/messages";
import { updateLineUserDiagnosis } from "@/lib/line/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lineUserId, gender, togelType, typeName, emoji, diagnosisResult, bigFiveScores } = body;

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

    await pushMessage(lineUserId, [
      diagnosisCompleteMessage(togelType, typeName ?? "", emoji ?? "🔮"),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[LINE Notify] Error:", err);
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
