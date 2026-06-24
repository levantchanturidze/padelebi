import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Playtora logo — "The Pin" direction.
 *
 * A geometric `P` whose bowl doubles as a map pin, with a single Volt dot
 * inside marking "you're here, playing here." Encodes the marketplace thesis
 * (location + intent) on the mark itself.
 *
 * Two variants:
 *   - light=false (default): Obsidian mark on Bone — used in the header
 *   - light=true: Bone mark on Obsidian — used on hero and other dark surfaces
 */
export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  const stroke = light ? "#F7F6F2" : "#0B0E14";
  const dot = "#C4FF3D"; // Volt — always
  const wordmarkClass = light ? "text-white" : "text-foreground";

  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-2.5 font-bold tracking-tight", className)}
      aria-label="Playtora"
    >
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        {/* The Pin: vertical stem + rounded bowl-as-pinhead, with Volt dot inside */}
        <path
          d="M11 6 L11 26"
          stroke={stroke}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M11 6 H17 C22.523 6 27 9.806 27 14.5 C27 19.194 22.523 23 17 23 H11"
          stroke={stroke}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Volt pin-dot */}
        <circle cx="19" cy="14.5" r="2.6" fill={dot} />
      </svg>
      <span className={cn("text-lg leading-none", wordmarkClass)}>
        Playtora
      </span>
    </Link>
  );
}
