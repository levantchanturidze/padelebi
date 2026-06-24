import {
  Trophy,
  Goal,
  Target,
  Volleyball,
  Feather,
  CircleDot,
  Waves,
  Dumbbell,
  HeartPulse,
  Swords,
  Activity,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Map a sport slug to its lucide icon. Centralised here so adding a new
 * sport only requires a row in the Sport catalog + (optionally) one entry
 * below. Any unmapped slug falls through to a neutral `Activity` icon.
 */
const ICON_BY_SLUG: Record<string, LucideIcon> = {
  padel: Trophy,
  tennis: Trophy,
  football: Goal,
  futsal: Goal,
  basketball: Target,
  volleyball: Volleyball,
  badminton: Feather,
  "table-tennis": CircleDot,
  squash: CircleDot,
  swimming: Waves,
  gym: Dumbbell,
  "fitness-class": HeartPulse,
  "martial-arts": Swords,
};

export function SportIcon({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  const Icon = ICON_BY_SLUG[slug] ?? Activity;
  return <Icon className={className} />;
}
