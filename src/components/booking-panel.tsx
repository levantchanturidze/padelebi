"use client";

import { useActionState, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { createBookingAction, type BookingActionState } from "@/app/actions/booking";
import { Button } from "@/components/ui/button";
import { formatGEL } from "@/lib/utils";

export type ClientSlot = {
  start: string;
  end: string;
  available: boolean;
  priceGEL: number;
};

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function durationLabel(slotMs: number, numSlots: number): string {
  const h = (slotMs * numSlots) / 3_600_000;
  return `${h}h`;
}

export function BookingPanel({
  slots,
  facilityId,
  slug,
  isAuthenticated,
}: {
  slots: ClientSlot[];
  facilityId: string;
  slug: string;
  isAuthenticated: boolean;
}) {
  const t = useTranslations("booking");
  const [state, action, pending] = useActionState<BookingActionState, FormData>(createBookingAction, undefined);
  const [startIdx, setStartIdx] = useState<number | null>(null);
  const [numSlots, setNumSlots] = useState(1);

  const slotMs = slots.length > 0
    ? new Date(slots[0].end).getTime() - new Date(slots[0].start).getTime()
    : 3_600_000;

  // Count consecutive available slots starting from startIdx
  const maxSlots = useMemo(() => {
    if (startIdx === null) return 0;
    let count = 0;
    for (let i = startIdx; i < slots.length; i++) {
      if (slots[i].available) count++;
      else break;
    }
    return count;
  }, [startIdx, slots]);

  const endIdx = startIdx !== null ? startIdx + numSlots - 1 : null;
  const startSlot = startIdx !== null ? slots[startIdx] : null;
  const endSlot = endIdx !== null ? slots[endIdx] : null;
  const totalPrice = startSlot ? startSlot.priceGEL * numSlots : 0;

  function handleSlotClick(idx: number) {
    if (!slots[idx].available) return;
    if (startIdx === idx) {
      setStartIdx(null);
      setNumSlots(1);
    } else {
      setStartIdx(idx);
      setNumSlots(1);
    }
  }

  if (slots.length === 0) {
    return (
      <p className="rounded-[var(--radius-md)] bg-background p-4 text-sm text-muted">
        {t("closed")}
      </p>
    );
  }

  return (
    <div>
      {/* Slot grid */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {slots.map((slot, idx) => {
          const inRange = startIdx !== null && endIdx !== null && idx >= startIdx && idx <= endIdx;
          const isStart = idx === startIdx;
          return (
            <button
              key={slot.start}
              type="button"
              disabled={!slot.available}
              onClick={() => handleSlotClick(idx)}
              className={[
                "rounded-[var(--radius-md)] border px-2 py-2.5 text-sm font-medium transition-all duration-150",
                slot.available
                  ? inRange
                    ? isStart
                      ? "border-brand-600 bg-gradient-to-b from-brand-500 to-brand-600 text-foreground shadow-[0_2px_10px_rgba(196,255,61,0.55)]"
                      : "border-brand-400 bg-brand-100 text-foreground"
                    : "border-border bg-surface hover:border-brand-400 hover:bg-brand-50 hover:text-foreground"
                  : "cursor-not-allowed border-border bg-background text-muted line-through opacity-50",
              ].join(" ")}
            >
              {timeLabel(slot.start)}
            </button>
          );
        })}
      </div>

      {/* Duration pills — only when a slot is selected and extension is possible */}
      {startIdx !== null && maxSlots > 1 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted">{t("duration")}:</span>
          {Array.from({ length: maxSlots }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNumSlots(n)}
              className={[
                "rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-150",
                numSlots === n
                  ? "border-brand-600 bg-brand-500 text-foreground shadow-[0_2px_8px_rgba(196,255,61,0.5)]"
                  : "border-border bg-surface text-muted hover:border-brand-400 hover:text-foreground",
              ].join(" ")}
            >
              {durationLabel(slotMs, n)}
            </button>
          ))}
        </div>
      )}

      {state?.error && (
        <p className="mt-4 rounded-[var(--radius-md)] bg-red-50 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      {/* Confirm card */}
      {startSlot && endSlot && (
        <form
          action={action}
          className="mt-4 overflow-hidden rounded-[var(--radius-lg)] border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-brand-50/40 shadow-[0_4px_24px_rgba(196,255,61,0.25)]"
        >
          <input type="hidden" name="facilityId" value={facilityId} />
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="start" value={startSlot.start} />
          <input type="hidden" name="end" value={endSlot.end} />

          <div className="px-4 pt-4">
            {/* Time + price row */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-foreground">
                  {timeLabel(startSlot.start)}–{timeLabel(endSlot.end)}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {durationLabel(slotMs, numSlots)} · {t("payAtClub")}
                </p>
              </div>
              <p className="text-xl font-bold text-foreground">{formatGEL(totalPrice)}</p>
            </div>

            {/* Notes textarea */}
            <textarea
              name="notes"
              rows={2}
              placeholder={t("notesPlaceholder")}
              className="mt-3 w-full resize-none rounded-[var(--radius-md)] border border-border bg-white/80 px-3 py-2 text-sm placeholder:text-muted/70 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>

          <div className="px-4 pb-4 pt-3">
            <Button type="submit" disabled={pending} size="lg" className="w-full">
              {pending ? t("confirming") : isAuthenticated ? t("confirm") : t("signInToBook")}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
