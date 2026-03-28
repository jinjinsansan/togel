import crypto from "crypto";

import { lineEnv } from "./env";

export function verifyLineSignature(body: string, signature: string): boolean {
  const hash = crypto
    .createHmac("SHA256", lineEnv.channelSecret)
    .update(body)
    .digest("base64");
  return hash === signature;
}
