import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";
import { verifyLineSignature } from "@/lib/line/verify";
import {
  replyMessage,
  getProfile,
  type LineEvent,
  type LineWebhookBody,
} from "@/lib/line/client";
import { welcomeMessage } from "@/lib/line/messages";
import { upsertLineUser } from "@/lib/line/db";
import { handleTextMessage, handlePostback } from "./handlers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-line-signature");

    if (!signature || !verifyLineSignature(body, signature)) {
      console.error("[LINE Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const parsed: LineWebhookBody = JSON.parse(body);

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
