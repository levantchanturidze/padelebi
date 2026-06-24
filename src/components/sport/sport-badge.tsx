import { SportIcon } from "./sport-icon";

/**
 * Sport chip used on venue / facility cards. Resolves the sport icon by slug
 * so each sport reads as itself rather than via a generic trophy.
 */
export function SportBadge({
  name,
  slug,
  className = "",
}: {
  name: string;
  slug?: string;
  className?: string;
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] font-medium text-muted",
        className,
      ].join(" ")}
    >
      {slug ? <SportIcon slug={slug} className="h-3 w-3" /> : null}
      {name}
    </span>
  );
}
