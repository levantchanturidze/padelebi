import { Section, Text } from "@react-email/components";
import { EmailLayout, CtaButton, EMAIL_STYLES } from "./_layout";
import type { Locale } from "@/lib/email";

const STRINGS = {
  en: {
    preview: "Booking cancelled.",
    heading: "Booking cancelled.",
    body: "Your booking has been cancelled. No charge was made — payment was due at the venue.",
    cta: "Book another time",
  },
  ka: {
    preview: "ჯავშანი გაუქმდა.",
    heading: "ჯავშანი გაუქმდა.",
    body: "შენი ჯავშანი გაუქმდა. გადახდა არ მომხდარა — გადახდა ადგილზე იყო გათვალისწინებული.",
    cta: "სხვა დროის დაჯავშნა",
  },
};

export function BookingCancelledEmail({
  locale = "ka",
  venueName,
  whenLabel,
  venuesUrl,
}: {
  locale?: Locale;
  venueName: string;
  whenLabel: string;
  venuesUrl: string;
}) {
  const t = STRINGS[locale];

  return (
    <EmailLayout preview={t.preview}>
      <Text style={EMAIL_STYLES.h1}>{t.heading}</Text>
      <Text style={EMAIL_STYLES.body}>{t.body}</Text>
      <Text style={EMAIL_STYLES.meta}>
        {venueName} · {whenLabel}
      </Text>

      <Section style={{ marginTop: 20 }}>
        <CtaButton href={venuesUrl} label={t.cta} />
      </Section>
    </EmailLayout>
  );
}
