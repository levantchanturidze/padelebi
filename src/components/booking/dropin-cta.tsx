"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { createDropInAction, type BookingActionState } from "@/app/actions/booking";
import { Button } from "@/components/ui/button";
import { formatGEL } from "@/lib/utils";

/**
 * Booking widget for DROP_IN facilities (gym day pass, pool entry).
 * One date, one button.
 */
export function DropInCta({
  facilityId,
  facilityName,
  priceGEL,
  slug,
  isAuthenticated,
}: {
  facilityId: string;
  facilityName: string;
  priceGEL: number;
  slug: string;
  isAuthenticated: boolean;
}) {
  const t = useTranslations("dropIn");
  const [state, action, pending] = useActionState<BookingActionState, FormData>(
    createDropInAction,
    undefined,
  );

  const today = new Date();
  const todayStr = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
  const [date, setDate] = useState(todayStr);

  return (
    <div className="space-y-3">
      {state?.error && (
        <p className="rounded-[var(--radius-md)] bg-red-50 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <form
        action={action}
        className="overflow-hidden rounded-[var(--radius-lg)] border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-brand-50/40 shadow-[0_4px_24px_rgba(21,163,71,0.13)]"
      >
        <input type="hidden" name="facilityId" value={facilityId} />
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="date" value={date} />

        <div className="px-4 pt-4">
          <p className="text-base font-semibold text-foreground">{facilityName}</p>
          <p className="mt-0.5 text-xs text-muted">{t("validForDay")}</p>

          <label className="mt-3 block">
            <span className="text-xs font-medium text-muted">{t("date")}</span>
            <input
              type="date"
              value={date}
              min={todayStr}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 h-9 w-full rounded-[var(--radius-md)] border border-border bg-white/80 px-2 text-sm"
            />
          </label>

          <p className="mt-3 flex items-end justify-between">
            <span className="text-sm text-muted">{t("total")}</span>
            <span className="text-2xl font-bold text-brand-600">{formatGEL(priceGEL)}</span>
          </p>
        </div>

        <div className="px-4 pb-4 pt-3">
          <Button type="submit" disabled={pending} size="lg" className="w-full">
            {pending ? t("confirming") : isAuthenticated ? t("buyDayPass") : t("signInToBuy")}
          </Button>
        </div>
      </form>
    </div>
  );
}
