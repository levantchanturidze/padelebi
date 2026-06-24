import Link from "next/link";
import { Trophy } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { tSportName, tSportCategory } from "@/lib/sports";

export const metadata = {
  title: "Sports — Playtora",
  description: "Browse every sport on Playtora.",
};

export default async function SportsCatalogPage() {
  const [sports, t] = await Promise.all([
    prisma.sport.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { facilities: { where: { isActive: true } } } } },
    }),
    getTranslations(),
  ]);

  const byCategory = new Map<string, typeof sports>();
  for (const s of sports) {
    if (!byCategory.has(s.category)) byCategory.set(s.category, []);
    byCategory.get(s.category)!.push(s);
  }

  return (
    <Container className="py-8 sm:py-12">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("sportsPage.title")}</h1>
      <p className="mt-2 max-w-xl text-muted">{t("sportsPage.subtitle")}</p>

      <div className="mt-10 space-y-10">
        {Array.from(byCategory.entries()).map(([category, list]) => (
          <section key={category}>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-brand-600">
              {tSportCategory(t, category)}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((sport) => {
                const count = sport._count.facilities;
                const countLabel =
                  count === 0
                    ? t("sportsPage.noVenuesYet")
                    : count === 1
                      ? t("sportsPage.facilitiesOne")
                      : t("sportsPage.facilitiesMany", { count });
                return (
                  <Link key={sport.id} href={`/sports/${sport.slug}`} className="group">
                    <Card className="h-full transition-all duration-150 group-hover:-translate-y-0.5 group-hover:shadow-card-md">
                      <CardContent className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 place-items-center rounded-[var(--radius-md)] bg-brand-50 text-brand-600">
                            <Trophy className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-semibold transition-colors group-hover:text-brand-700">
                              {tSportName(t, sport.slug)}
                            </p>
                            <p className="text-xs text-muted">{countLabel}</p>
                          </div>
                        </div>
                        {count > 0 && <Badge tone="brand">{count}</Badge>}
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </Container>
  );
}
