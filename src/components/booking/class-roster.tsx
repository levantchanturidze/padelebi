"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { createClassBookingAction, type BookingActionState } from "@/app/actions/booking";
import { Button } from "@/components/ui/button";
import { formatGEL } from "@/lib/utils";

export type ClientClassSession = {
  id: string;
  title: string;
  startISO: string;
  endISO: string;
  capacity: number;
  taken: number;
  priceGEL: number;
  instructor: string | null;
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Booking widget for CLASS-mode facilities. Lists upcoming sessions and lets
 * the player reserve N seats in one.
 */
export function ClassRoster({
  sessions,
  slug,
  isAuthenticated,
}: {
  sessions: ClientClassSession[];
  slug: string;
  isAuthenticated: boolean;
}) {
  const t = useTranslations("classRoster");
  const [state, action, pending] = useActionState<BookingActionState, FormData>(
    createClassBookingAction,
    undefined,
  );
  const [openId, setOpenId] = useState<string | null>(sessions[0]?.id ?? null);
  const [attendeesById, setAttendeesById] = useState<Record<string, number>>({});

  if (sessions.length === 0) {
    return (
      <p className="rounded-[var(--radius-md)] bg-background p-4 text-sm text-muted">
        {t("noClasses")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {state?.error && (
        <p className="rounded-[var(--radius-md)] bg-red-50 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <ul className="space-y-2">
        {sessions.map((s) => {
          const left = Math.max(0, s.capacity - s.taken);
          const isOpen = openId === s.id;
          const attendees = attendeesById[s.id] ?? 1;
          const full = left === 0;
          return (
            <li
              key={s.id}
              className={[
                "rounded-[var(--radius-md)] border bg-surface transition-shadow",
                isOpen ? "border-brand-300 shadow-sm" : "border-border",
              ].join(" ")}
            >
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : s.id)}
                className="flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left"
                disabled={full && !isOpen}
              >
                <div>
                  <p className="text-sm font-semibold">{s.title}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {fmtTime(s.startISO)}
                    {s.instructor ? ` · ${s.instructor}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-brand-600">{formatGEL(s.priceGEL)}</p>
                  <p className={["mt-0.5 text-xs", full ? "text-danger" : "text-muted"].join(" ")}>
                    {full
                      ? t("full")
                      : left === 1
                        ? t("seatsLeftOne")
                        : t("seatsLeftMany", { count: left })}
                  </p>
                </div>
              </button>

              {isOpen && !full && (
                <form
                  action={action}
                  className="border-t border-border bg-background/60 px-3 py-3"
                >
                  <input type="hidden" name="classSessionId" value={s.id} />
                  <input type="hidden" name="slug" value={slug} />
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="flex flex-col text-xs font-medium text-muted">
                      {t("seats")}
                      <select
                        name="attendees"
                        value={attendees}
                        onChange={(e) =>
                          setAttendeesById((p) => ({ ...p, [s.id]: Number(e.target.value) }))
                        }
                        className="mt-1 h-9 w-20 rounded-[var(--radius-md)] border border-border bg-surface px-2 text-sm"
                      >
                        {Array.from({ length: Math.min(left, 10) }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </label>
                    <p className="text-sm">
                      {t("total")} <span className="font-bold text-brand-600">{formatGEL(s.priceGEL * attendees)}</span>
                    </p>
                    <Button type="submit" disabled={pending} size="sm" className="ml-auto">
                      {pending ? t("joining") : isAuthenticated ? t("joinClass") : t("signInToJoin")}
                    </Button>
                  </div>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
