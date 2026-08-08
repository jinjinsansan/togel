import { lineEnv } from "./env";

const LINE_API_BASE = "https://api.line.me/v2/bot";

type LineApiOptions = {
  method?: string;
  body?: unknown;
};

async function lineApi(path: string, options: LineApiOptions = {}) {
  const res = await fetch(`${LINE_API_BASE}${path}`, {
    method: options.method ?? "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lineEnv.channelAccessToken}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`[LINE API] Error ${res.status}: ${errorText}`);
    throw new Error(`LINE API error: ${res.status}`);
  }

  const contentType = res.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return res.json();
  }
  return null;
}

export async function replyMessage(replyToken: string, messages: LineMessage[]) {
  return lineApi("/message/reply", {
    body: { replyToken, messages },
  });
}

export async function pushMessage(to: string, messages: LineMessage[]) {
  return lineApi("/message/push", {
    body: { to, messages },
  });
}

/** 同一メッセージを最大500人へ一括送信（LINE multicast API の上限） */
export async function multicastMessage(to: string[], messages: LineMessage[]) {
  if (to.length === 0) return null;
  if (to.length > 500) {
    throw new Error("multicastMessage: recipients must be 500 or fewer per call");
  }
  return lineApi("/message/multicast", {
    body: { to, messages },
  });
}

export async function getProfile(userId: string): Promise<LineProfile> {
  return lineApi(`/profile/${userId}`, { method: "GET" });
}

// LINE Message Types
export type LineTextMessage = {
  type: "text";
  text: string;
};

export type LineFlexMessage = {
  type: "flex";
  altText: string;
  contents: Record<string, unknown>;
};

export type LineTemplateMessage = {
  type: "template";
  altText: string;
  template: Record<string, unknown>;
};

export type LineMessage = LineTextMessage | LineFlexMessage | LineTemplateMessage;

export type LineProfile = {
  displayName: string;
  userId: string;
  pictureUrl?: string;
  statusMessage?: string;
};

// LINE Webhook Event Types
export type LineEvent = {
  type: string;
  replyToken?: string;
  source: {
    type: string;
    userId?: string;
  };
  message?: {
    type: string;
    id: string;
    text?: string;
  };
  postback?: {
    data: string;
  };
  timestamp: number;
};

export type LineWebhookBody = {
  destination: string;
  events: LineEvent[];
};
