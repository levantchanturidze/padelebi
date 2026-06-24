"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitReviewAction } from "@/app/actions/review";

/**
 * Inline review form. Stars are interactive; comment is optional.
 * Resubmitting overwrites the user's existing review on the server.
 */
export function ReviewForm({
  venueId,
  slug,
  initialRating = 0,
  initialComment = "",
}: {
  venueId: string;
  slug: string;
  initialRating?: number;
  initialComment?: string;
}) {
  const t = useTranslations("review");
  const [rating, setRating] = useState(initialRating);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState(initialComment);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function onSubmit(formData: FormData) {
    formData.set("rating", String(rating));
    formData.set("comment", comment);
    startTransition(async () => {
      await submitReviewAction(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  const disabled = rating === 0 || pending;

  return (
    <form action={onSubmit} className="space-y-3">
      <input type="hidden" name="venueId" value={venueId} />
      <input type="hidden" name="slug" value={slug} />

      <div>
        <p className="mb-1.5 text-xs font-medium text-muted">{t("yourRating")}</p>
        <div
          className="flex gap-0.5"
          onMouseLeave={() => setHovered(0)}
        >
          {[1, 2, 3, 4, 5].map((n) => {
            const active = (hovered || rating) >= n;
            return (
              <button
                key={n}
                type="button"
                onMouseEnter={() => setHovered(n)}
                onClick={() => setRating(n)}
                aria-label={t("starsLabel", { n })}
                className="grid h-8 w-8 place-items-center rounded-[var(--radius-sm)] transition-transform hover:scale-110"
              >
                <Star
                  className={["h-6 w-6", active ? "text-warning" : "text-border"].join(" ")}
                  fill={active ? "currentColor" : "none"}
                  strokeWidth={1.5}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-muted">{t("commentOptional")}</p>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder={t("placeholder")}
          className="w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted/70 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={disabled} size="sm">
          {pending ? t("saving") : initialRating > 0 ? t("updateReview") : t("postReview")}
        </Button>
        {saved && <span className="text-xs text-brand-600">{t("saved")}</span>}
      </div>
    </form>
  );
}
