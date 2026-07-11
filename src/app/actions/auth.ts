"use server";

import { createHash, randomBytes } from "crypto";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signIn, signOut } from "@/lib/auth";
import { notifyPasswordReset } from "@/lib/notify";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { rateLimit } from "@/lib/rate-limit";

/** Single source of truth for the bcrypt work factor across the app. */
const BCRYPT_COST = 12;

/** SHA-256 hex digest — used to store reset tokens hashed at rest. */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const TOO_MANY = "Too many attempts. Please wait a moment and try again.";

const registerSchema = z
  .object({
    name: z.string().min(2, "Please enter your name."),
    email: z.string().email("Enter a valid email."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirm: z.string().min(1, "Please confirm your password."),
    role: z.enum(["PLAYER", "CLUB_ADMIN"]).default("PLAYER"),
  })
  .refine((d) => d.password === d.confirm, { message: "Passwords do not match.", path: ["confirm"] });

export type AuthState = { error?: string } | undefined;

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const limit = await rateLimit("register", { limit: 5, windowMs: 10 * 60_000 });
  if (!limit.success) return { error: TOO_MANY };

  const captchaOk = await verifyRecaptcha(formData.get("recaptchaToken") as string | null);
  if (!captchaOk) return { error: "CAPTCHA verification failed. Please try again." };

  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
    role: formData.get("role") ?? "PLAYER",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { name, email, password, role } = parsed.data;
  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (existing) return { error: "An account with that email already exists." };

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  await prisma.user.create({
    data: { name, email: email.toLowerCase(), passwordHash, role },
  });

  await signIn("credentials", {
    email: email.toLowerCase(),
    password,
    redirectTo: role === "CLUB_ADMIN" ? "/onboarding" : "/account/bookings",
  });
  return undefined;
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const limit = await rateLimit("login", { limit: 10, windowMs: 5 * 60_000 });
  if (!limit.success) return { error: TOO_MANY };

  const email = String(formData.get("email") ?? "").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const remember = formData.get("remember") === "on" ? "on" : "off";
  const callbackUrl = safeCallbackUrl(formData.get("callbackUrl"));

  try {
    await signIn("credentials", { email, password, remember, redirectTo: callbackUrl });
  } catch (err) {
    // NextAuth throws a redirect on success; re-throw those.
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    if ((err as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw err;
    return { error: "Invalid email or password." };
  }
  return undefined;
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
  redirect("/");
}

export type ResetState = { error?: string; success?: string } | undefined;

export async function forgotPasswordAction(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const limit = await rateLimit("forgot-password", { limit: 5, windowMs: 15 * 60_000 });
  if (!limit.success) return { error: TOO_MANY };

  const email = String(formData.get("email") ?? "").toLowerCase();
  if (!email) return { error: "Please enter your email." };

  const user = await prisma.user.findUnique({ where: { email } });
  // Always return success to avoid email enumeration.
  if (!user) return { success: "If that email exists, a reset link has been sent." };

  // Email the raw token; store only its hash so a DB read can't be used to
  // reset accounts.
  const rawToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
  await prisma.passwordResetToken.create({
    data: { userId: user.id, token: hashToken(rawToken), expiresAt },
  });

  await notifyPasswordReset({ email, locale: user.locale, token: rawToken });

  return { success: "If that email exists, a reset link has been sent." };
}

export async function resetPasswordAction(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const limit = await rateLimit("reset-password", { limit: 10, windowMs: 15 * 60_000 });
  if (!limit.success) return { error: TOO_MANY };

  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirm) return { error: "Passwords do not match." };

  const tokenHash = hashToken(token);
  const record = await prisma.passwordResetToken.findUnique({ where: { token: tokenHash } });
  if (!record || record.expiresAt < new Date()) {
    return { error: "This reset link is invalid or has expired." };
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  await prisma.user.update({ where: { id: record.userId }, data: { passwordHash } });
  await prisma.passwordResetToken.delete({ where: { token: tokenHash } });

  return { success: "Password reset! You can now sign in." };
}

/**
 * Only allow relative, same-site callback paths to prevent open redirects.
 * A value like "//evil.com" or "https://evil.com" is rejected in favour of the
 * default landing page.
 */
function safeCallbackUrl(raw: FormDataEntryValue | null): string {
  const fallback = "/account/bookings";
  const value = String(raw ?? "");
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
