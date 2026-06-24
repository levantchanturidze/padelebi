/**
 * Theme preference — light | dark | system.
 *
 * Persistence: a non-HttpOnly cookie so both the server (for no-flash SSR)
 * and the client (for the toggle) can read & write it. Cookie name and
 * possible values are centralised here.
 */
export type ThemePref = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_COOKIE = "playtora.theme";

export function isThemePref(v: unknown): v is ThemePref {
  return v === "light" || v === "dark" || v === "system";
}

/**
 * Resolve a preference into an actual paint class. On the server we don't
 * know the user's OS theme, so `system` is treated as `light` for the
 * initial server render and corrected on the client by the boot script
 * before paint.
 */
export function resolveThemeForServer(pref: ThemePref | undefined): ResolvedTheme {
  if (pref === "dark") return "dark";
  // Both "light" and "system" → light initially. The boot script will flip
  // to dark before first paint if "system" matches a dark OS.
  return "light";
}
