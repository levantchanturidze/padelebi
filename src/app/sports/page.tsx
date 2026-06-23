import Link from "next/link";
import { Trophy } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Sports — Playtora",
  description: "Browse every sport on Playtora — padel, tennis, football, basketball, gym and more.",
};

export default async function SportsCatalogPage() {
  const sports = await prisma.sport.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { facilities: { where: { isActive: true } } } } },
  });

  // Group by category for visual scanning
  const byCategory = new Map<string, typeof sports>();
  for (const s of sports) {
    if (!byCategory.has(s.category)) byCategory.set(s.category, []);
    byCategory.get(s.category)!.push(s);
  }
  const CATEGORY_LABELS: Record<string, string> = {
    RACQUET: "Racquet sports",
    TEAM: "Team sports",
    FITNESS: "Fitness",
    WATER: "Water sports",
    INDIVIDUAL: "Individual sports",
  };

  return (
    <Container className="py-8 sm:py-12">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Find a sport</h1>
      <p className="mt-2 max-w-xl text-muted">
        Every sport on Playtora. Pick one to see venues near you.
      </p>

      <div className="mt-10 space-y-10">
        {Array.from(byCategory.entries()).map(([category, list]) => (
          <section key={category}>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-brand-600">
              {CATEGORY_LABELS[category] ?? category}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((sport) => {
                const count = sport._count.facilities;
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
                              {sport.name}
                            </p>
                            <p className="text-xs text-muted">
                              {count === 0
                                ? "No venues yet"
                                : `${count} ${count === 1 ? "facility" : "facilities"}`}
                            </p>
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
