import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-2.5 font-bold tracking-tight", className)}
    >
      <span
        className={cn(
          "grid h-8 w-8 place-items-center rounded-[var(--radius-md)] text-sm font-black",
          light
            ? "bg-accent text-brand-900 shadow-[0_2px_8px_rgba(170,239,44,0.4)]"
            : "bg-gradient-to-b from-brand-500 to-brand-700 text-white shadow-[0_2px_6px_rgba(21,163,71,0.35),inset_0_1px_0_rgba(255,255,255,0.15)]",
        )}
        aria-hidden
      >
        P
      </span>
      <span className={cn("text-lg", light ? "text-white" : "text-foreground")}>
        Playtora
      </span>
    </Link>
  );
}
