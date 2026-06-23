"use client";

import { useOptimistic, useTransition } from "react";
import { Heart } from "lucide-react";
import { toggleFavoriteAction } from "@/app/actions/favorite";

/**
 * Heart toggle. Renders optimistically so the icon flips on tap, then the
 * server action persists the change. Server-rendered initial state is required
 * (so unauthenticated visitors see a non-filled heart consistently).
 */
export function FavoriteButton({
  venueId,
  initialFavorited,
  redirectTo,
  size = "md",
}: {
  venueId: string;
  initialFavorited: boolean;
  redirectTo?: string;
  size?: "sm" | "md" | "lg";
}) {
  const [optimistic, setOptimistic] = useOptimistic(initialFavorited, (_prev, next: boolean) => next);
  const [pending, startTransition] = useTransition();

  const dimensions = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-11 w-11" : "h-9 w-9";
  const iconSize = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-5.5 w-5.5" : "h-4.5 w-4.5";

  return (
    <form
      action={(formData) => {
        const next = !optimistic;
        setOptimistic(next);
        startTransition(() => toggleFavoriteAction(formData));
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <input type="hidden" name="venueId" value={venueId} />
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
      <button
        type="submit"
        aria-label={optimistic ? "Remove from favorites" : "Add to favorites"}
        disabled={pending}
        className={[
          "grid place-items-center rounded-full border transition-all duration-150 disabled:opacity-60",
          dimensions,
          optimistic
            ? "border-brand-200 bg-brand-50 text-danger"
            : "border-border bg-surface/90 text-muted hover:border-brand-300 hover:text-foreground backdrop-blur-sm",
        ].join(" ")}
      >
        <Heart className={iconSize} fill={optimistic ? "currentColor" : "none"} />
      </button>
    </form>
  );
}
