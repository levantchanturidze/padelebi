"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signIn, signOut } from "@/lib/auth";
import { notifyPasswordReset } from "@/lib/notify";

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
  // Verify reCAPTCHA v3 if secret key is configured
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (secretKey) {
    const token = formData.get("recaptchaToken") as string | null;
    if (!token) return { error: "CAPTCHA verification failed. Please try again." };
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${secretKey}&response=${token}`,
    });
    const data = (await res.json()) as { success: boolean; score?: number };
    if (!data.success || (data.score !== undefined && data.score < 0.5)) {
      return { error: "CAPTCHA verification failed. Please try again." };
    }
  }

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

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { name, email: email.toLowerCase(), passwordHash, role },
  });

  await signIn("credentials", {
    email: email.toLowerCase(),
    password,
    redirectTo: role === "CLUB_ADMIN" ? "/club" : "/account/bookings",
  });
  return undefined;
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const remember = formData.get("remember") === "on" ? "on" : "off";
  const callbackUrl = String(formData.get("callbackUrl") ?? "") || "/account/bookings";

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
  const email = String(formData.get("email") ?? "").toLowerCase();
  if (!email) return { error: "Please enter your email." };

  const user = await prisma.user.findUnique({ where: { email } });
  // Always return success to avoid email enumeration
  if (!user) return { success: "If that email exists, a reset link has been sent." };

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
  await prisma.passwordResetToken.create({ data: { userId: user.id, token, expiresAt } });

  await notifyPasswordReset({ email, locale: user.locale, token });

  return { success: "If that email exists, a reset link has been sent." };
}

export async function resetPasswordAction(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirm) return { error: "Passwords do not match." };

  const record = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!record || record.expiresAt < new Date()) return { error: "This reset link is invalid or has expired." };

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { id: record.userId }, data: { passwordHash } });
  await prisma.passwordResetToken.delete({ where: { token } });

  return { success: "Password reset! You can now sign in." };
}
