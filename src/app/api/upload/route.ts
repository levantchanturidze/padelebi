import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

const MANAGER_ROLES = new Set(["CLUB_ADMIN", "PLATFORM_ADMIN"]);
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 5 * 1024 * 1024;
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * Derive a safe blob key. The client-supplied filename is never trusted for the
 * path (avoids traversal / key injection); we keep only a slugified stem and
 * force the extension from the validated MIME type.
 */
function safeBlobKey(originalName: string, mime: string): string {
  const stem = originalName
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "photo";
  const ext = EXT_BY_TYPE[mime] ?? "img";
  const rand = crypto.randomUUID().slice(0, 8);
  return `clubs/${Date.now()}-${rand}-${stem}.${ext}`;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Only venue managers/admins upload photos — not every signed-in player.
  if (!MANAGER_ROLES.has(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const limit = checkRateLimit(`upload:${session.user.id}`, 30, 10 * 60_000);
  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many uploads. Please slow down." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Only images are allowed" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Max file size is 5MB" }, { status: 400 });
  }

  const blob = await put(safeBlobKey(file.name, file.type), file, {
    access: "public",
    contentType: file.type,
  });
  return NextResponse.json({ url: blob.url });
}
