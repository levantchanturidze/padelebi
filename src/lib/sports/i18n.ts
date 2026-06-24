/**
 * Tiny helpers used by both server and client surfaces to render translated
 * sport names + adapter summary chips with consistent fallback behaviour.
 */

type Translator = (key: string, values?: Record<string, string | number>) => string;

/** Translate a sport.slug. Falls back to the slug itself if no key exists. */
export function tSportName(t: Translator, slug: string): string {
  try {
    return t(`sports.names.${slug}` as never);
  } catch {
    return slug;
  }
}

/** Translate a sport.category. Falls back to the raw category string. */
export function tSportCategory(t: Translator, category: string): string {
  try {
    return t(`sports.categories.${category}` as never);
  } catch {
    return category;
  }
}

/**
 * Resolve a summary chip's valueKey to a display string.
 *
 * Encoding convention used by some adapters:
 *   - "@<text>"           → literal text (skip translation)
 *   - "#k1,k2,k3"         → translate each key and join with " · "
 *   - otherwise           → translate as-is
 */
export function tSummaryValue(t: Translator, valueKey: string): string {
  if (valueKey.startsWith("@")) return valueKey.slice(1);
  if (valueKey.startsWith("#")) {
    return valueKey
      .slice(1)
      .split(",")
      .filter(Boolean)
      .map((k) => t(k as never))
      .join(" · ");
  }
  return t(valueKey as never);
}
