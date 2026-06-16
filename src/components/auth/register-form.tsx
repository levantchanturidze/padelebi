"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import dynamic from "next/dynamic";
import { registerAction, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

const ReCAPTCHA = dynamic(() => import("react-google-recaptcha"), { ssr: false });

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

export function RegisterForm() {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<AuthState, FormData>(registerAction, undefined);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  return (
    <form action={action} className="space-y-4">
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

      {/* reCAPTCHA token passed with form */}
      <input type="hidden" name="recaptchaToken" value={captchaToken ?? ""} />

      {SITE_KEY && (
        <div className="flex justify-center">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <ReCAPTCHA
            sitekey={SITE_KEY}
            onChange={(token: string | null) => setCaptchaToken(token)}
            onExpired={() => setCaptchaToken(null)}
          />
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={pending || (!!SITE_KEY && !captchaToken)}
      >
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
