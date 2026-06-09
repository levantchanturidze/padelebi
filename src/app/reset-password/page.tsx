"use client";

import { useActionState, use } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { resetPasswordAction, type ResetState } from "@/app/actions/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const t = useTranslations("auth");
  const { token } = use(searchParams);
  const [state, action, pending] = useActionState<ResetState, FormData>(resetPasswordAction, undefined);

  if (!token) {
    return (
      <Container className="flex justify-center py-16">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-sm text-danger">{t("invalidResetLink")}</p>
            <p className="mt-2 text-center text-sm text-muted">
              <Link href="/forgot-password" className="font-medium text-brand-600 hover:underline">
                {t("requestNewOne")}
              </Link>
            </p>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="flex justify-center py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("chooseNewPassword")}</CardTitle>
        </CardHeader>
        <CardContent>
          {state?.success ? (
            <div className="space-y-4">
              <p className="rounded-[var(--radius-md)] bg-brand-50 px-3 py-2 text-sm text-brand-700">
                {state.success}
              </p>
              <p className="text-center text-sm text-muted">
                <Link href="/login" className="font-medium text-brand-600 hover:underline">
                  {t("signIn")}
                </Link>
              </p>
            </div>
          ) : (
            <form action={action} className="space-y-4">
              <input type="hidden" name="token" value={token} />
              {state?.error && (
                <p className="rounded-[var(--radius-md)] bg-red-50 px-3 py-2 text-sm text-danger">
                  {state.error}
                </p>
              )}
              <div>
                <Label htmlFor="password">{t("newPassword")}</Label>
                <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
              </div>
              <div>
                <Label htmlFor="confirm">{t("confirmNewPassword")}</Label>
                <Input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
              </div>
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? t("sending") : t("resetPasswordBtn")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
