"use client";

import { useActionState, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { rescheduleBookingAction, type BookingActionState } from "@/app/actions/booking";
import { Button } from "@/components/ui/button";
import { formatGEL } from "@/lib/utils";
import type { ClientSlot } from "@/components/booking-panel";

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function durationLabel(ms: number): string {
  const h = ms / 3_600_000;
  return `${h}h`;
}

export function ReschedulePanel({
  slots,
  bookingId,
  originalDurationMs,
  originalStartISO,
  originalEndISO,
  pricePerHourGEL,
}: {
  slots: ClientSlot[];
  bookingId: string;
  originalDurationMs: number;
  originalStartISO: string;
  originalEndISO: string;
  pricePerHourGEL: number;
}) {
  const t = useTranslations("reschedule");
  const [state, action, pending] = useActionState<BookingActionState, FormData>(
    rescheduleBookingAction,
    undefined,
  );
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const slotMs = slots.length > 0
    ? new Date(slots[0].end).getTime() - new Date(slots[0].start).getTime()
    : 3_600_000;

  // numSlotsNeeded must be a positive integer; clamp to at least 1
  const numSlotsNeeded = Math.max(1, Math.round(originalDurationMs / slotMs));

  // A slot at index i is selectable if all slots [i..i+numSlotsNeeded-1] are available
  const selectable = useMemo<boolean[]>(() => {
    return slots.map((_, i) => {
      if (i + numSlotsNeeded > slots.length) return false;
      return slots.slice(i, i + numSlotsNeeded).every((s) => s.available);
    });
  }, [slots, numSlotsNeeded]);

  const hasAnySelectable = selectable.some(Boolean);

  const newStartISO = selectedIdx !== null ? slots[selectedIdx].start : null;
  const newEndMs = newStartISO ? new Date(newStartISO).getTime() + originalDurationMs : null;
  const newEndISO = newEndMs ? new Date(newEndMs).toISOString() : null;

  const isSameSlot =
    newStartISO === originalStartISO && newEndISO === originalEndISO;

  const totalPrice = Math.round(pricePerHourGEL * (originalDurationMs / 3_600_000));

  if (slots.length === 0) {
    return (
      <p className="rounded-[var(--radius-md)] bg-background p-4 text-sm text-muted">
        {t("closed")}
      </p>
    );
  }

  if (!hasAnySelectable) {
    return (
      <p className="rounded-[var(--radius-md)] bg-background p-4 text-sm text-muted">
        {t("noSlots")}
      </p>
    );
  }

  return (
    <div>
      {/* Slot grid */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {slots.map((slot, idx) => {
          const isSelected = idx === selectedIdx;
          const inRange =
            selectedIdx !== null && idx > selectedIdx && idx < selectedIdx + numSlotsNeeded;
          const canSelect = selectable[idx];

          return (
            <button
              key={slot.start}
              type="button"
              disabled={!canSelect}
              onClick={() => setSelectedIdx(isSelected ? null : idx)}
              className={[
                "rounded-[var(--radius-md)] border px-2 py-2.5 text-sm font-medium transition-all duration-150",
                canSelect
                  ? isSelected
                    ? "border-brand-600 bg-gradient-to-b from-brand-500 to-brand-600 text-foreground shadow-[0_2px_10px_rgba(196,255,61,0.55)]"
                    : inRange
                    ? "border-brand-400 bg-brand-100 text-foreground"
                    : "border-border bg-surface hover:border-brand-400 hover:bg-brand-50 hover:text-foreground"
                  : "cursor-not-allowed border-border bg-background text-muted line-through opacity-40",
              ].join(" ")}
            >
              {timeLabel(slot.start)}
            </button>
          );
        })}
      </div>

      {state?.error && (
        <p className="mt-4 rounded-[var(--radius-md)] bg-red-50 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      {/* Confirm card */}
      {newStartISO && newEndISO && (
        <div className="mt-4 overflow-hidden rounded-[var(--radius-lg)] border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-brand-50/40 shadow-[0_4px_24px_rgba(196,255,61,0.25)]">
          {isSameSlot ? (
            <p className="px-4 py-4 text-sm text-muted">{t("sameSlot")}</p>
          ) : (
            <form action={action}>
              <input type="hidden" name="bookingId" value={bookingId} />
              <input type="hidden" name="start" value={newStartISO} />
              <input type="hidden" name="end" value={newEndISO} />
              <div className="px-4 pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-foreground">
                      {timeLabel(newStartISO)}–{timeLabel(newEndISO)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {durationLabel(originalDurationMs)} · {t("payAtClub")}
                    </p>
                  </div>
                  <p className="text-xl font-bold text-foreground">{formatGEL(totalPrice)}</p>
                </div>
              </div>
              <div className="px-4 pb-4 pt-3">
                <Button type="submit" disabled={pending} size="lg" className="w-full">
                  {pending ? t("confirming") : t("confirm")}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
