import Link from "next/link";
import { CalendarCheck, MapPin, Search, Zap } from "lucide-react";
import { Container } from "@/components/ui/container";
import { LinkButton } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { parseJSON, formatGEL } from "@/lib/utils";

export default async function HomePage() {
  const clubs = await prisma.club.findMany({
    where: { status: "APPROVED" },
    include: { courts: { where: { isActive: true } } },
    take: 3,
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      {/* Hero */}
      <section className="bg-court text-white">
        <Container className="py-20 sm:py-28">
          <div className="max-w-2xl">
            <Badge tone="brand" className="bg-white/10 text-accent border-white/20">
              Padel in Georgia
            </Badge>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Book your padel court in seconds
            </h1>
            <p className="mt-4 text-lg text-white/80">
              Find courts in Tbilisi, Batumi and across Georgia. See real-time
              availability and reserve instantly.
            </p>
            <form action="/clubs" className="mt-8 flex max-w-md gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  name="city"
                  placeholder="Search by city…"
                  className="h-12 w-full rounded-[var(--radius-md)] border border-transparent bg-white pl-9 pr-3 text-foreground placeholder:text-muted focus-ring"
                />
              </div>
              <LinkButton href="/clubs" size="lg" className="bg-accent text-brand-900 hover:bg-accent/90">
                Search
              </LinkButton>
            </form>
          </div>
        </Container>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-16">
        <Container>
          <h2 className="text-2xl font-bold tracking-tight">How it works</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              { icon: Search, title: "Find a club", text: "Browse padel clubs by city and filter by surface, indoor/outdoor and price." },
              { icon: CalendarCheck, title: "Pick a slot", text: "See live availability for each court and choose a time that works for you." },
              { icon: Zap, title: "Book instantly", text: "Confirm your booking in one tap. Manage or cancel anytime from your account." },
            ].map(({ icon: Icon, title, text }) => (
              <Card key={title}>
                <CardContent>
                  <div className="grid h-11 w-11 place-items-center rounded-[var(--radius-md)] bg-brand-50 text-brand-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-muted">{text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* Featured clubs */}
      <section className="pb-8">
        <Container>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Featured clubs</h2>
            <Link href="/clubs" className="text-sm font-medium text-brand-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {clubs.map((club) => {
              const photos = parseJSON<string[]>(club.photos, []);
              const minPrice = club.courts.length
                ? Math.min(...club.courts.map((c) => c.pricePerHourGEL))
                : null;
              return (
                <Link key={club.id} href={`/clubs/${club.slug}`}>
                  <Card className="overflow-hidden transition-shadow hover:shadow-md">
                    <div
                      className="h-40 bg-brand-100 bg-cover bg-center"
                      style={photos[0] ? { backgroundImage: `url(${photos[0]})` } : undefined}
                    />
                    <CardContent>
                      <h3 className="font-semibold">{club.name}</h3>
                      <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                        <MapPin className="h-3.5 w-3.5" /> {club.city}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <Badge tone="brand">{club.courts.length} courts</Badge>
                        {minPrice !== null && (
                          <span className="text-sm font-medium">
                            from {formatGEL(minPrice)}/hr
                          </span>
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
