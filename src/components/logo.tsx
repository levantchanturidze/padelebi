import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-2 font-bold tracking-tight", className)}
    >
      <span
        className={cn(
          "grid h-8 w-8 place-items-center rounded-[var(--radius-md)] text-sm font-black",
          light ? "bg-accent text-brand-900" : "bg-brand-500 text-white",
        )}
        aria-hidden
      >
        P
      </span>
      <span className={cn("text-lg", light && "text-white")}>Padelebi</span>
    </Link>
  );
}
