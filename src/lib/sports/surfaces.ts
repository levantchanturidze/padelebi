import type { SurfaceCategory } from "@/lib/enums";

/**
 * Which surface categories apply to each sport. Used by the manager
 * facility form so the Surface dropdown narrows to the realistic options
 * once a sport is picked.
 *
 *   - Empty list → the sport has no meaningful surface (swimming, gym).
 *     The dropdown will only offer "Any".
 *   - Unmapped sport → all 7 surfaces are offered (lets admin-added
 *     sports stay flexible).
 */
const SURFACES_BY_SPORT: Record<string, readonly SurfaceCategory[]> = {
  padel:           ["SYNTHETIC", "HARD"],
  tennis:          ["CLAY", "HARD", "GRASS", "CARPET"],
  football:        ["GRASS", "SYNTHETIC", "SAND"],
  futsal:          ["PARQUET", "HARD", "SYNTHETIC"],
  basketball:      ["PARQUET", "HARD"],
  volleyball:      ["PARQUET", "SAND", "HARD"],
  badminton:       ["PARQUET", "CARPET", "HARD"],
  "table-tennis":  ["HARD"],
  squash:          ["PARQUET", "HARD"],
  "fitness-class": ["PARQUET", "CARPET"],
  "martial-arts":  ["CARPET", "PARQUET"],
  swimming:        [],
  gym:             [],
};

const ALL_SURFACES: readonly SurfaceCategory[] = [
  "SYNTHETIC", "PARQUET", "CLAY", "HARD", "GRASS", "CARPET", "SAND",
];

export function surfacesForSport(slug: string | null | undefined): readonly SurfaceCategory[] {
  if (!slug) return ALL_SURFACES;
  const list = SURFACES_BY_SPORT[slug];
  if (list === undefined) return ALL_SURFACES; // unmapped sport
  return list;                                  // includes the deliberate empty case
}
