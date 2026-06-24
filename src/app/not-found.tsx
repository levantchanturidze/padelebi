import Link from "next/link";
import { Search } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { tSportName } from "@/lib/sports";

export default async function NotFound() {
  // Use the root translator so we can read both the "notFound" namespace
  // AND sport names which live under "sports.names.*". Scoping `t` to one
  // namespace (the previous behaviour) caused t("sports.names.padel") to
  // resolve to the non-existent key `notFound.sports.names.padel` — which
  // threw during render and cascaded into a 500 on every page where
  // Next.js mounts the not-found segment.
  const t = await getTranslations();

  // Suggested links — top sports to ease the user back into discovery.
  const SUGGESTED = [
    { href: "/sports/padel", slug: "padel" },
    { href: "/sports/tennis", slug: "tennis" },
    { href: "/sports/football", slug: "football" },
    { href: "/sports/gym", slug: "gym" },
  ];

  return (
    <Container className="py-16 sm:py-24">
      <div className="mx-auto max-w-md text-center">
        <PinMark />

        <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
          {t("notFound.title")}
        </h1>
        <p className="mt-3 text-base text-muted">
          {t("notFound.description")}
        </p>

        <form action="/venues" className="mt-8 flex w-full gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              name="city"
              placeholder={t("notFound.searchPlaceholder")}
              className="h-11 w-full rounded-[var(--radius-lg)] border border-border bg-surface pl-10 pr-4 text-sm placeholder:text-muted focus-ring"
            />
          </div>
          <button
            type="submit"
            className="h-11 rounded-[var(--radius-lg)] bg-brand-500 px-5 text-sm font-bold text-foreground shadow-[0_2px_12px_rgba(196,255,61,0.45)] transition-all duration-150 hover:bg-brand-400"
          >
            {t("notFound.search")}
          </button>
        </form>

        <div className="mt-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
            {t("notFound.popularSports")}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {SUGGESTED.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-cobalt-200 hover:bg-cobalt-50 hover:text-cobalt-700"
              >
                {tSportName(t, s.slug)}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-cobalt-600 hover:text-cobalt-700"
          >
            ← {t("notFound.backHome")}
          </Link>
        </div>
      </div>
    </Container>
  );
}

function PinMark() {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 32 32"
      aria-hidden
      className="mx-auto"
    >
      <path
        d="M11 6 L11 26"
        stroke="var(--color-foreground)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M11 6 H17 C22.523 6 27 9.806 27 14.5 C27 19.194 22.523 23 17 23 H11"
        stroke="var(--color-foreground)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="19" cy="14.5" r="2.6" fill="#C4FF3D" />
    </svg>
  );
}
