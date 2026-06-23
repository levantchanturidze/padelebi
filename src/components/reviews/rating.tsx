import { Star } from "lucide-react";

/**
 * Read-only star rating. Shows N filled stars out of 5 with optional count.
 */
export function Rating({
  value,
  count,
  size = "md",
}: {
  value: number; // 0..5 (can be fractional)
  count?: number;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const rounded = Math.round(value * 2) / 2;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted">
      <span className="inline-flex">
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = rounded >= i;
          const half = !filled && rounded >= i - 0.5;
          return (
            <Star
              key={i}
              className={[
                dim,
                filled || half ? "text-warning" : "text-border",
              ].join(" ")}
              fill={filled ? "currentColor" : half ? "url(#half)" : "none"}
              strokeWidth={1.5}
            />
          );
        })}
      </span>
      {value > 0 && <span className="tabular-nums text-foreground">{value.toFixed(1)}</span>}
      {typeof count === "number" && count > 0 && (
        <span className="text-muted">({count})</span>
      )}
    </span>
  );
}
