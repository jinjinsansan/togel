import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";

const getEnv = (key: string) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is not configured`);
  }
  return value;
};

let r2Client: S3Client | null = null;

const getR2Client = () => {
  if (r2Client) return r2Client;

  const accountId = getEnv("R2_ACCOUNT_ID");
  r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    forcePathStyle: true,
    credentials: {
      accessKeyId: getEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: getEnv("R2_SECRET_ACCESS_KEY"),
    },
  });

  return r2Client;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const fileName = body?.fileName as string | undefined;
  const fileType = body?.fileType as string | undefined;
  const fileSize = Number(body?.fileSize ?? 0);

  if (!fileName || !fileType) {
    return NextResponse.json({ error: "filename and fileType are required" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(fileType)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  if (fileSize > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File is too large" }, { status: 413 });
  }

  const safeExtension = fileName.split(".").pop()?.toLowerCase() || "jpg";
  const objectKey = `avatars/${user.id}/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;

  const bucketName = getEnv("R2_BUCKET_NAME");

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: objectKey,
    ContentType: fileType,
    CacheControl: "public, max-age=31536000, immutable",
  });

  const uploadUrl = await getSignedUrl(getR2Client(), command, { expiresIn: 60 });
  const publicBaseUrl = getEnv("R2_PUBLIC_BASE_URL").replace(/\/$/, "");
  const publicUrl = `${publicBaseUrl}/${objectKey}`;

  return NextResponse.json({ uploadUrl, publicUrl, key: objectKey });
}
