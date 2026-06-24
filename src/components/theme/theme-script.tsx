import { THEME_COOKIE } from "@/lib/theme";

/**
 * Inline `<script>` that runs synchronously before React hydrates so the
 * browser never paints the wrong theme. Reads the theme cookie (set by the
 * toggle) and falls through to OS `prefers-color-scheme`. Adds or removes
 * the `dark` class on `<html>` accordingly.
 *
 * Must be a regular <script>, not next/script, because Next defers
 * next/script and a one-frame flash would defeat the point.
 */
export function ThemeScript() {
  const body = `(function(){try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]*)/);var p=m?decodeURIComponent(m[1]):"system";if(p!=="light"&&p!=="dark"&&p!=="system")p="system";var dark=p==="dark"||(p==="system"&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches);var e=document.documentElement;e.classList.toggle("dark",!!dark);e.style.colorScheme=dark?"dark":"light";}catch(_){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: body }} />;
}
