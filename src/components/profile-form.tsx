"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { updateProfileAction, type ProfileState } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { SKILL_LABELS, SKILL_LEVELS } from "@/lib/enums";

export function ProfileForm({
  defaults,
}: {
  defaults: { name: string; phone: string; skillLevel: string };
}) {
  const t = useTranslations("profile");
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfileAction, undefined);

  return (
    <form action={action} className="max-w-md space-y-4">
      {state?.error && (
        <p className="rounded-[var(--radius-md)] bg-red-50 px-3 py-2 text-sm text-danger">{state.error}</p>
      )}
      {state?.success && (
        <p className="rounded-[var(--radius-md)] bg-brand-50 px-3 py-2 text-sm text-brand-700">{state.success}</p>
      )}
      <div>
        <Label htmlFor="name">{t("fullName")}</Label>
        <Input id="name" name="name" defaultValue={defaults.name} required />
      </div>
      <div>
        <Label htmlFor="phone">{t("phone")}</Label>
        <Input id="phone" name="phone" defaultValue={defaults.phone} placeholder="+995 …" />
      </div>
      <div>
        <Label htmlFor="skillLevel">{t("skillLevel")}</Label>
        <Select id="skillLevel" name="skillLevel" defaultValue={defaults.skillLevel}>
          <option value="">{t("preferNotToSay")}</option>
          {SKILL_LEVELS.map((s) => (
            <option key={s} value={s}>{SKILL_LABELS[s]}</option>
          ))}
        </Select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? t("saving") : t("saveChanges")}
      </Button>
    </form>
  );
}
