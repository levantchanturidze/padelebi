/**
 * Tiny helpers used by both server and client surfaces to render translated
 * sport names + adapter summary chips with consistent fallback behaviour.
 */

type Translator = (key: string, values?: Record<string, string | number>) => string;

/**
 * Translate a sport.slug to its localized name.
 *
 * Fallback chain:
 *   1. `sports.names.<slug>` translation key (built-in sports have these)
 *   2. `fallbackName` (the DB-stored Sport.name — admin-created sports)
 *   3. the slug itself (last resort)
 */
export function tSportName(t: Translator, slug: string, fallbackName?: string): string {
  try {
    const value = t(`sports.names.${slug}` as never);
    // next-intl returns the key itself when missing in some modes — treat
    // that as "no translation" and fall through.
    if (value && value !== `sports.names.${slug}`) return value;
  } catch {
    /* fall through */
  }
  return fallbackName ?? slug;
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
