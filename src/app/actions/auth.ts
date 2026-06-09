"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signIn, signOut } from "@/lib/auth";

const registerSchema = z
  .object({
    name: z.string().min(2, "Please enter your name."),
    email: z.string().email("Enter a valid email."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    role: z.enum(["PLAYER", "CLUB_ADMIN"]).default("PLAYER"),
  });

export type AuthState = { error?: string } | undefined;

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
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
  const callbackUrl = String(formData.get("callbackUrl") ?? "") || "/account/bookings";

  try {
    await signIn("credentials", { email, password, redirectTo: callbackUrl });
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
