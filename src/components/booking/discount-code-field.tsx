"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { BadgePercent, Loader2, X } from "lucide-react";
import { previewDiscountAction, type PreviewDiscountResult } from "@/app/actions/discount";
import { formatGEL } from "@/lib/utils";

/**
 * Reusable discount input for booking forms. Rendered inline; on Apply it
 * calls previewDiscountAction and, on success, injects a hidden
 * `discountCode` field so the parent form submits with the applied code.
 *
 * The parent form still submits the code — we don't send anything to the
 * server here except the preview. That keeps the redemption transaction
 * on the booking side, where it's atomic with slot creation.
 */
export function DiscountCodeField({ subtotalGEL }: { subtotalGEL: number }) {
  const t = useTranslations("discount");
  const [raw, setRaw] = useState("");
  const [applied, setApplied] = useState<
    | { code: string; discountGEL: number; discountedGEL: number }
    | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function messageFor(res: Extract<PreviewDiscountResult, { ok: false }>): string {
    switch (res.reason) {
      case "NOT_FOUND": return t("errNotFound");
      case "INACTIVE": return t("errInactive");
      case "EXPIRED": return t("errExpired");
      case "MAXED_OUT": return t("errMaxedOut");
      case "USER_LIMIT_REACHED": return t("errUserLimit");
      case "MIN_AMOUNT": return t("errMinAmount", { amount: formatGEL(res.minAmountGEL ?? 0) });
      case "AUTH_REQUIRED": return t("errAuthRequired");
      case "BAD_SUBTOTAL": return t("errBadSubtotal");
      default: return t("errGeneric");
    }
  }

  function tryApply() {
    const code = raw.trim();
    if (!code) return;
    setError(null);
    startTransition(async () => {
      const res = await previewDiscountAction({ code, subtotalGEL });
      if (res.ok) {
        setApplied({ code: res.code, discountGEL: res.discountGEL, discountedGEL: res.discountedGEL });
      } else {
        setError(messageFor(res));
      }
    });
  }

  function clear() {
    setApplied(null);
    setRaw("");
    setError(null);
  }

  return (
    <div className="mt-3">
      {applied ? (
        <>
          {/* Hidden field so the form action carries the applied code */}
          <input type="hidden" name="discountCode" value={applied.code} />
          <div className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] border border-brand-500 bg-brand-50 px-3 py-2 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <BadgePercent className="h-4 w-4 shrink-0 text-brand-700" />
              <span className="truncate font-semibold text-foreground">{applied.code}</span>
              <span className="text-xs text-muted">−{formatGEL(applied.discountGEL)}</span>
            </div>
            <button
              type="button"
              onClick={clear}
              aria-label={t("remove")}
              className="rounded-full p-0.5 text-muted hover:bg-brand-100 hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value.toUpperCase());
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                tryApply();
              }
            }}
            placeholder={t("placeholder")}
            className="min-w-0 flex-1 rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm uppercase tracking-wide text-foreground placeholder:text-muted/70 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={tryApply}
            disabled={pending || !raw.trim()}
            className="inline-flex items-center gap-1 rounded-[var(--radius-md)] border border-cobalt-200 bg-cobalt-50 px-3 py-2 text-sm font-semibold text-cobalt-700 transition-colors hover:bg-cobalt-100 disabled:opacity-50"
          >
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {t("apply")}
          </button>
        </div>
      )}
      {error && (
        <p className="mt-1.5 text-xs text-danger">{error}</p>
      )}
    </div>
  );
}
