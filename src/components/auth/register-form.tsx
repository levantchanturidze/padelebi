"use client";

import { useActionState, useEffect, useCallback, startTransition } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { registerAction, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

declare global {
  interface Window {
    grecaptcha: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
    onRecaptchaLoad?: () => void;
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

export function RegisterForm() {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<AuthState, FormData>(registerAction, undefined);

  useEffect(() => {
    if (!SITE_KEY || document.getElementById("recaptcha-v3-script")) return;
    const script = document.createElement("script");
    script.id = "recaptcha-v3-script";
    script.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
    script.async = true;
    document.head.appendChild(script);
  }, []);

  const getToken = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!SITE_KEY) { resolve(""); return; }
      window.grecaptcha.ready(async () => {
        try {
          const token = await window.grecaptcha.execute(SITE_KEY, { action: "register" });
          resolve(token);
        } catch (err) {
          reject(err);
        }
      });
    });
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (SITE_KEY) {
      try {
        const token = await getToken();
        formData.set("recaptchaToken", token);
      } catch {
        // continue — server will reject if token missing
      }
    }

    startTransition(() => { action(formData); });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {state?.error && (
        <p className="rounded-[var(--radius-md)] bg-red-50 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      <div>
        <Label htmlFor="name">{t("fullName")}</Label>
        <Input id="name" name="name" required autoComplete="name" />
      </div>
      <div>
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div>
        <Label htmlFor="password">{t("password")}</Label>
        <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
      </div>
      <div>
        <Label htmlFor="confirm">{t("confirmPassword")}</Label>
        <Input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
      </div>
      <div>
        <Label htmlFor="role">{t("iWantTo")}</Label>
        <Select id="role" name="role" defaultValue="PLAYER">
          <option value="PLAYER">{t("bookAsPlayer")}</option>
          <option value="CLUB_ADMIN">{t("listMyClub")}</option>
        </Select>
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t("creatingAccount") : t("createAccountBtn")}
      </Button>
      <p className="text-center text-sm text-muted">
        {t("alreadyHaveAccount")}{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          {t("signIn")}
        </Link>
      </p>
    </form>
  );
}
