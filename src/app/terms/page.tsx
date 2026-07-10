import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { canonical } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.terms");
  return {
    title: t("title"),
    description: t("intro").slice(0, 160),
    alternates: { canonical: canonical("/terms") },
  };
}

/** Ordered section keys — the page renders each as <h2> + <p>. */
const SECTIONS = [
  "acceptance",
  "service",
  "accounts",
  "bookings",
  "cancellation",
  "venueManagers",
  "prohibited",
  "content",
  "thirdParties",
  "disclaimer",
  "liability",
  "termination",
  "governingLaw",
  "changes",
  "contact",
] as const;

export default async function TermsPage() {
  const t = await getTranslations("legal.terms");
  const tLegal = await getTranslations("legal");

  return (
    <Container className="py-10 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-cobalt-600">
          {tLegal("label")}
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("title")}</h1>
        <p className="mt-2 text-sm text-muted">{tLegal("lastUpdated")}</p>

        <p className="mt-6 text-base leading-relaxed text-foreground/90">{t("intro")}</p>

        <div className="mt-8 space-y-8">
          {SECTIONS.map((key) => (
            <section key={key}>
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                {t(`sections.${key}.title` as never)}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-foreground/85 whitespace-pre-line">
                {t(`sections.${key}.body` as never)}
              </p>
            </section>
          ))}
        </div>

        <div className="mt-12 border-t border-border pt-6 text-sm">
          <Link href="/privacy" className="text-cobalt-600 hover:text-cobalt-700">
            {tLegal("readPrivacy")} →
          </Link>
        </div>
      </div>
    </Container>
  );
}
