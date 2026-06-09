"use client";

import { useActionState, useState } from "react";
import { createBookingAction, type BookingActionState } from "@/app/actions/booking";
import { Button } from "@/components/ui/button";
import { formatGEL } from "@/lib/utils";

export type ClientSlot = {
  start: string; // ISO
  end: string; // ISO
  available: boolean;
  priceGEL: number;
};

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BookingPanel({
  slots,
  courtId,
  slug,
  isAuthenticated,
}: {
  slots: ClientSlot[];
  courtId: string;
  slug: string;
  isAuthenticated: boolean;
}) {
  const [state, action, pending] = useActionState<BookingActionState, FormData>(
    createBookingAction,
    undefined,
  );
  const [selected, setSelected] = useState<ClientSlot | null>(null);

  if (slots.length === 0) {
    return (
      <p className="rounded-[var(--radius-md)] bg-background p-4 text-sm text-muted">
        This court is closed on the selected day.
      </p>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {slots.map((slot) => {
          const isSelected = selected?.start === slot.start;
          return (
            <button
              key={slot.start}
              type="button"
              disabled={!slot.available}
              onClick={() => setSelected(slot)}
              className={[
                "rounded-[var(--radius-md)] border px-2 py-2 text-sm font-medium transition-colors",
                slot.available
                  ? isSelected
                    ? "border-brand-500 bg-brand-500 text-white"
                    : "border-border bg-surface hover:border-brand-400"
                  : "cursor-not-allowed border-border bg-background text-muted line-through opacity-60",
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

      {selected && (
        <form action={action} className="mt-4 flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-border bg-background p-4">
          <input type="hidden" name="courtId" value={courtId} />
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="start" value={selected.start} />
          <input type="hidden" name="end" value={selected.end} />
          <div className="text-sm">
            <p className="font-medium">
              {timeLabel(selected.start)}–{timeLabel(selected.end)}
            </p>
            <p className="text-muted">{formatGEL(selected.priceGEL)} · pay at club</p>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Booking…" : isAuthenticated ? "Confirm booking" : "Sign in to book"}
          </Button>
        </form>
      )}
    </div>
  );
}
