import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { getCurrentUser } from "@/lib/session";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Playtora — Find and book sports venues",
  description:
    "Discover and book padel, tennis, football and more — real-time availability, instant booking, any sport.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [user, locale, messages] = await Promise.all([
    getCurrentUser(),
    getLocale(),
    getMessages(),
  ]);

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider messages={messages}>
          <SiteHeader user={user} locale={locale} />
          <div className="flex flex-1">
            {user && <SiteNav role={user.role} />}
            <main className="min-w-0 flex-1">{children}</main>
          </div>
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
