import Link from "next/link";
import { CalendarCheck, MapPin, Search, Zap } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { parseJSON, formatGEL } from "@/lib/utils";

export default async function HomePage() {
  const t = await getTranslations("home");

  const clubs = await prisma.club.findMany({
    where: { status: "APPROVED" },
    include: { courts: { where: { isActive: true } } },
    take: 3,
    orderBy: { createdAt: "desc" },
  });

  const steps = [
    { icon: Search, title: t("step1Title"), text: t("step1Desc") },
    { icon: CalendarCheck, title: t("step2Title"), text: t("step2Desc") },
    { icon: Zap, title: t("step3Title"), text: t("step3Desc") },
  ];

  return (
    <>
      {/* Hero */}
      <section className="bg-court text-white">
        <Container className="py-12 sm:py-24">
          <div className="max-w-2xl">
            <Badge tone="brand" className="bg-white/10 text-accent border-white/20">
              {t("headline")}
            </Badge>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight sm:mt-4 sm:text-5xl">
              {t("subheadline")}
            </h1>
            <p className="mt-3 text-base text-white/75 sm:mt-4 sm:text-lg">
              {t("description")}
            </p>
            <form action="/clubs" className="mt-6 flex w-full max-w-md gap-2 sm:mt-8">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  name="city"
                  placeholder={t("searchPlaceholder")}
                  className="h-11 w-full rounded-[var(--radius-md)] border border-transparent bg-white pl-9 pr-3 text-sm text-foreground placeholder:text-muted focus-ring sm:h-12"
                />
              </div>
              <button
                type="submit"
                className="h-11 rounded-[var(--radius-md)] bg-accent px-4 text-sm font-semibold text-brand-900 transition-colors hover:bg-accent/90 sm:h-12 sm:px-5"
              >
                {t("search")}
              </button>
            </form>
          </div>
        </Container>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-10 sm:py-16">
        <Container>
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{t("howItWorks")}</h2>
          {/* Mobile: horizontal scroll; Desktop: 3-column grid */}
          <div className="mt-5 flex gap-4 overflow-x-auto pb-2 scrollbar-none sm:mt-8 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0">
            {steps.map(({ icon: Icon, title, text }) => (
              <Card key={title} className="w-64 shrink-0 sm:w-auto">
                <CardContent>
                  <div className="grid h-10 w-10 place-items-center rounded-[var(--radius-md)] bg-brand-50 text-brand-600 sm:h-11 sm:w-11">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 font-semibold sm:mt-4">{title}</h3>
                  <p className="mt-1 text-sm text-muted">{text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* Featured clubs */}
      <section className="pb-10 sm:pb-12">
        <Container>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{t("featuredClubs")}</h2>
            <Link href="/clubs" className="text-sm font-medium text-brand-600 hover:underline">
              {t("viewAll")}
            </Link>
          </div>
          <div className="mt-5 grid gap-4 sm:mt-6 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {clubs.map((club) => {
              const photos = parseJSON<string[]>(club.photos, []);
              const minPrice = club.courts.length
                ? Math.min(...club.courts.map((c) => c.pricePerHourGEL))
                : null;
              return (
                <Link key={club.id} href={`/clubs/${club.slug}`}>
                  <Card className="overflow-hidden transition-shadow hover:shadow-md">
                    <div
                      className="h-36 bg-brand-100 bg-cover bg-center sm:h-40"
                      style={photos[0] ? { backgroundImage: `url(${photos[0]})` } : undefined}
                    />
                    <CardContent>
                      <h3 className="font-semibold">{club.name}</h3>
                      <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                        <MapPin className="h-3.5 w-3.5" /> {club.city}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <Badge tone="brand">{t("courts", { count: club.courts.length })}</Badge>
                        {minPrice !== null && (
                          <span className="text-sm font-medium">{t("fromPrice", { price: formatGEL(minPrice) })}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </Container>
      </section>
    </>
  );
}
