import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";
import { verifyLineSignature } from "@/lib/line/verify";
import {
  replyMessage,
  getProfile,
  type LineEvent,
  type LineWebhookBody,
} from "@/lib/line/client";
import {
  welcomeMessage,
  alreadyDiagnosedMessage,
  helpMessage,
} from "@/lib/line/messages";
import { getLineUser, upsertLineUser } from "@/lib/line/db";
import { handleTextMessage } from "./handlers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-line-signature");

    if (!signature || !verifyLineSignature(body, signature)) {
      console.error("[LINE Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const parsed: LineWebhookBody = JSON.parse(body);

    // Process events asynchronously (LINE expects 200 quickly)
    for (const event of parsed.events) {
      try {
        await processEvent(event);
      } catch (err) {
        console.error("[LINE Webhook] Event processing error:", err);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[LINE Webhook] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function processEvent(event: LineEvent) {
  const userId = event.source.userId;
  if (!userId) return;

  switch (event.type) {
    case "follow":
      await handleFollow(userId, event.replyToken);
      break;

    case "message":
      if (event.message?.type === "text" && event.message.text && event.replyToken) {
        await handleTextMessage(userId, event.message.text, event.replyToken);
      }
      break;

    case "postback":
      if (event.postback?.data && event.replyToken) {
        await handlePostback(userId, event.postback.data, event.replyToken);
      }
      break;
  }
}

async function handleFollow(userId: string, replyToken?: string) {
  const profile = await getProfile(userId);

  await upsertLineUser({
    lineUserId: userId,
    displayName: profile.displayName,
    pictureUrl: profile.pictureUrl,
  });

  if (replyToken) {
    await replyMessage(replyToken, [welcomeMessage()]);
  }

  console.log("[LINE Webhook] New follower:", profile.displayName);
}

async function handlePostback(userId: string, data: string, replyToken: string) {
  const params = new URLSearchParams(data);
  const action = params.get("action");

  switch (action) {
    case "start_diagnosis": {
      const user = await getLineUser(userId);
      if (user?.togel_type) {
        await replyMessage(replyToken, [
          alreadyDiagnosedMessage(user.togel_type, ""),
        ]);
      } else {
        await replyMessage(replyToken, [welcomeMessage()]);
      }
      break;
    }

    case "help":
      await replyMessage(replyToken, [helpMessage()]);
      break;

    default:
      console.log("[LINE Webhook] Unknown postback action:", action);
  }
}
