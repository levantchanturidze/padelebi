import { Trophy } from "lucide-react";

/**
 * Minimal sport badge used on venue/facility cards. We use lucide's Trophy as
 * a sport-neutral icon for now — per-sport icons live in the Sport.icon column
 * for later, when we wire dynamic icon resolution.
 */
export function SportBadge({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] font-medium text-muted",
        className,
      ].join(" ")}
    >
      <Trophy className="h-3 w-3" />
      {name}
    </span>
  );
}
