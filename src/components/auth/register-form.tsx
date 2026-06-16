"use client";

import { useActionState, useRef, startTransition } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import dynamic from "next/dynamic";
import { registerAction, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReCAPTCHA = dynamic(() => import("react-google-recaptcha"), { ssr: false }) as any;

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

export function RegisterForm() {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<AuthState, FormData>(registerAction, undefined);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recaptchaRef = useRef<any>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (SITE_KEY && recaptchaRef.current) {
      recaptchaRef.current.reset();
      const token: string | null = await recaptchaRef.current.executeAsync();
      if (token) formData.set("recaptchaToken", token);
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

      {SITE_KEY && (
        <ReCAPTCHA
          ref={recaptchaRef}
          sitekey={SITE_KEY}
          size="invisible"
        />
      )}

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
