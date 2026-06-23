import Link from "next/link";
import { CalendarCheck, MapPin, Search, Zap, ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { parseJSON, formatGEL } from "@/lib/utils";

export default async function HomePage() {
  const t = await getTranslations("home");

  const venues = await prisma.venue.findMany({
    where: { status: "APPROVED" },
    include: { facilities: { where: { isActive: true } } },
    take: 3,
    orderBy: { createdAt: "desc" },
  });

  const steps = [
    {
      icon: Search,
      number: "01",
      title: t("step1Title"),
      text: t("step1Desc"),
      accent: "from-brand-500/10 to-brand-600/5",
      iconBg: "bg-brand-500",
    },
    {
      icon: CalendarCheck,
      number: "02",
      title: t("step2Title"),
      text: t("step2Desc"),
      accent: "from-brand-400/10 to-accent/5",
      iconBg: "bg-brand-600",
    },
    {
      icon: Zap,
      number: "03",
      title: t("step3Title"),
      text: t("step3Desc"),
      accent: "from-accent/15 to-brand-400/5",
      iconBg: "bg-brand-700",
    },
  ];

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="bg-court relative overflow-hidden text-white">
        <Container className="relative z-10 py-14 sm:py-28">
          <div className="max-w-2xl">
            <Badge
              tone="brand"
              className="border-white/20 bg-white/10 text-accent backdrop-blur-sm"
            >
              {t("headline")}
            </Badge>

            <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl">
              <span className="text-white">{t("subheadline")}</span>
            </h1>

            <p className="mt-4 max-w-lg text-base leading-relaxed text-white/70 sm:text-lg">
              {t("description")}
            </p>

            {/* Search bar */}
            <form action="/venues" className="mt-7 flex w-full max-w-lg gap-2 sm:mt-9">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  name="city"
                  placeholder={t("searchPlaceholder")}
                  className="h-12 w-full rounded-[var(--radius-lg)] border border-white/10 bg-white pl-10 pr-4 text-sm text-foreground placeholder:text-muted shadow-[0_2px_16px_rgba(0,0,0,0.2)] focus-ring"
                />
              </div>
              <button
                type="submit"
                className="h-12 rounded-[var(--radius-lg)] bg-accent px-5 text-sm font-bold text-brand-900 shadow-[0_2px_12px_rgba(170,239,44,0.4)] transition-all duration-150 hover:bg-accent/90 hover:shadow-[0_4px_20px_rgba(170,239,44,0.5)] active:scale-[0.98]"
              >
                {t("search")}
              </button>
            </form>

            {/* Quick stats */}
            <div className="mt-6 flex flex-wrap gap-4 text-sm text-white/50">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {t("stat1")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {t("stat2")}
              </span>
            </div>
          </div>
        </Container>
      </section>

      {/* ── How it works — Bento grid ─────────────────────────────────── */}
      <section id="how-it-works" className="py-12 sm:py-20">
        <Container>
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
              {t("howItWorksLabel")}
            </p>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t("howItWorks")}
            </h2>
          </div>

          {/* Bento: mobile stack → desktop asymmetric 2-col */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 md:grid-cols-2 md:grid-rows-2">

            {/* Step 1 — large hero card, spans 2 rows */}
            <Card className={[
              "md:row-span-2 overflow-hidden",
              "bg-gradient-to-br from-brand-600 to-brand-900 border-brand-700/50",
              "transition-shadow duration-300 hover:shadow-[0_12px_40px_rgba(21,163,71,0.25)]",
            ].join(" ")}>
              <CardContent className="flex h-full flex-col justify-between p-6 sm:p-8">
                <div>
                  <span className="text-5xl font-black text-white/10 sm:text-7xl">01</span>
                  <div className="mt-4 grid h-12 w-12 place-items-center rounded-[var(--radius-lg)] bg-white/10 backdrop-blur-sm">
                    <Search className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-white sm:text-2xl">
                    {steps[0].title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/65 sm:text-base">
                    {steps[0].text}
                  </p>
                </div>
                <Link
                  href="/venues"
                  className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-bold text-brand-900 transition-all duration-150 hover:bg-accent/90 hover:gap-3"
                >
                  {t("browseAll")} <ArrowRight className="h-4 w-4" />
                </Link>
              </CardContent>
            </Card>

            {/* Step 2 */}
            <Card className="overflow-hidden bg-gradient-to-br from-surface to-brand-50 transition-shadow duration-300 hover:shadow-[0_8px_28px_rgba(21,163,71,0.12)]">
              <CardContent className="p-5 sm:p-6">
                <span className="text-3xl font-black text-brand-100 sm:text-4xl">02</span>
                <div className="mt-3 grid h-10 w-10 place-items-center rounded-[var(--radius-md)] bg-brand-500 text-white shadow-[0_2px_8px_rgba(21,163,71,0.35)]">
                  <CalendarCheck className="h-5 w-5" />
                </div>
                <h3 className="mt-3 font-bold text-foreground">{steps[1].title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{steps[1].text}</p>
              </CardContent>
            </Card>

            {/* Step 3 */}
            <Card className="overflow-hidden bg-gradient-to-br from-surface to-background transition-shadow duration-300 hover:shadow-[0_8px_28px_rgba(21,163,71,0.12)]">
              <CardContent className="flex items-center gap-5 p-5 sm:p-6">
                <div className="shrink-0">
                  <span className="block text-3xl font-black text-brand-100 sm:text-4xl">03</span>
                  <div className="mt-3 grid h-10 w-10 place-items-center rounded-[var(--radius-md)] bg-gradient-to-b from-brand-500 to-brand-700 text-white shadow-[0_2px_8px_rgba(21,163,71,0.35)]">
                    <Zap className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{steps[2].title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{steps[2].text}</p>
                </div>
              </CardContent>
            </Card>

          </div>
        </Container>
      </section>

      {/* ── Featured clubs ────────────────────────────────────────────── */}
      <section className="pb-14 sm:pb-20">
        <Container>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
                {t("featuredLabel")}
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                {t("featuredClubs")}
              </h2>
            </div>
            <Link
              href="/venues"
              className="flex shrink-0 items-center gap-1 text-sm font-medium text-brand-600 transition-all duration-150 hover:gap-2 hover:text-brand-700"
            >
              {t("viewAll")} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-5 grid gap-4 sm:mt-6 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {venues.map((venue) => {
              const photos = parseJSON<string[]>(venue.photos, []);
              const minPrice = venue.facilities.length
                ? Math.min(...venue.facilities.map((c) => c.pricePerHourGEL))
                : null;
              return (
                <Link key={venue.id} href={`/venues/${venue.slug}`} className="group block">
                  <Card className="overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_36px_rgba(0,0,0,0.12)]">
                    {/* Image */}
                    <div className="relative h-44 overflow-hidden bg-brand-900">
                      {photos[0] ? (
                        <div
                          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                          style={{ backgroundImage: `url(${photos[0]})` }}
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-brand-700 to-brand-900" />
                      )}
                      {/* Bottom gradient overlay */}
                      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />
                      {/* Price pill */}
                      {minPrice !== null && (
                        <span className="absolute bottom-3 right-3 rounded-full bg-black/50 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
                          {t("fromPrice", { price: formatGEL(minPrice) })}
                        </span>
                      )}
                    </div>

                    <CardContent className="p-4">
                      <h3 className="font-semibold transition-colors duration-150 group-hover:text-brand-700">
                        {venue.name}
                      </h3>
                      <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-500" />
                        {venue.city}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <Badge tone="brand">
                          {t("courts", { count: venue.facilities.length })}
                        </Badge>
                        <span className="text-xs font-medium text-brand-600 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                          {t("bookNow")} →
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}

            {venues.length === 0 && (
              <p className="col-span-full text-sm text-muted">{t("noCLubs")}</p>
            )}
          </div>
        </Container>
      </section>
    </>
  );
}
