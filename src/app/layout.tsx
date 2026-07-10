import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { ThemeScript } from "@/components/theme/theme-script";
import { CookieBanner } from "@/components/consent/cookie-banner";
import { getCurrentUser } from "@/lib/session";
import { SITE_URL, SITE_NAME, TWITTER_HANDLE, DEFAULT_OG_IMAGE } from "@/lib/seo";
import {
  THEME_COOKIE,
  isThemePref,
  resolveThemeForServer,
} from "@/lib/theme";
import { CONSENT_COOKIE, isConsentPref } from "@/lib/consent";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Find and book sports venues`,
    template: `%s — ${SITE_NAME}`,
  },
  description:
    "Discover and book padel, tennis, football and more — real-time availability, instant booking, any sport.",
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    url: SITE_URL,
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE,
    images: [DEFAULT_OG_IMAGE],
  },
  alternates: { canonical: SITE_URL },
  robots: { index: true, follow: true },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [user, locale, messages, cookieStore] = await Promise.all([
    getCurrentUser(),
    getLocale(),
    getMessages(),
    cookies(),
  ]);

  // Server-side theme decision. The inline ThemeScript will correct
  // `system` against the live OS preference before paint if needed.
  const themeCookie = cookieStore.get(THEME_COOKIE)?.value;
  const serverTheme = resolveThemeForServer(
    isThemePref(themeCookie) ? themeCookie : undefined,
  );

  // Show the consent banner only if the user hasn't recorded a choice yet.
  // Prevents flash-of-banner after acceptance.
  const consentCookie = cookieStore.get(CONSENT_COOKIE)?.value;
  const needsConsent = !isConsentPref(consentCookie);

  return (
    <html
      lang={locale}
      className={[
        geistSans.variable,
        geistMono.variable,
        "h-full antialiased",
        serverTheme === "dark" ? "dark" : "",
      ].join(" ")}
      style={{ colorScheme: serverTheme }}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider messages={messages}>
          <SiteHeader user={user} locale={locale} />
          <div className="flex flex-1">
            {user && <SiteNav role={user.role} />}
            <main className="min-w-0 flex-1">{children}</main>
          </div>
          <SiteFooter />
          {needsConsent && <CookieBanner />}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
