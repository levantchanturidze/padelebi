"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { changePasswordAction, type ProfileState } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function ChangePasswordForm() {
  const t = useTranslations("profile");
  const [state, action, pending] = useActionState<ProfileState, FormData>(changePasswordAction, undefined);

  return (
    <form action={action} className="max-w-md space-y-4">
      {state?.error && (
        <p className="rounded-[var(--radius-md)] bg-red-50 px-3 py-2 text-sm text-danger">{state.error}</p>
      )}
      {state?.success && (
        <p className="rounded-[var(--radius-md)] bg-brand-50 px-3 py-2 text-sm text-brand-700">{state.success}</p>
      )}
      <div>
        <Label htmlFor="current">{t("currentPassword")}</Label>
        <Input id="current" name="current" type="password" required />
      </div>
      <div>
        <Label htmlFor="next">{t("newPassword")}</Label>
        <Input id="next" name="next" type="password" required minLength={8} />
      </div>
      <div>
        <Label htmlFor="confirm">{t("confirmNewPassword")}</Label>
        <Input id="confirm" name="confirm" type="password" required minLength={8} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? t("saving") : t("changePasswordBtn")}
      </Button>
    </form>
  );
}
