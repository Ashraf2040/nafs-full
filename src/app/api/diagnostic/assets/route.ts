import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";
import { requireRole } from "@/lib/guard";

export const runtime = "nodejs";

export async function PUT() {
  const { response } = await requireRole("TEACHER", "ADMIN");
  if (response) return response;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: "Image storage is not configured. Add the Cloudinary settings to the deployment." }, { status: 503 });
  }

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "nafs-prep/diagnostic-assets";
  const publicId = randomUUID();
  const paramsToSign = { folder, public_id: publicId, timestamp };
  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);
  return NextResponse.json({ cloudName, apiKey, timestamp, signature, folder, publicId });
}
