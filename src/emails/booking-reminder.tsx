import { Section, Text } from "@react-email/components";
import { EmailLayout, CtaButton, EMAIL_STYLES } from "./_layout";
import type { Locale } from "@/lib/email";

const STRINGS = {
  en: {
    preview: "Your booking is tomorrow.",
    heading: "Tomorrow.",
    body: "A quick reminder — you're booked.",
    venueLabel: "Venue",
    whenLabel: "When",
    cta: "View booking",
  },
  ka: {
    preview: "შენი ჯავშანი ხვალაა.",
    heading: "ხვალ.",
    body: "მცირე შეხსენება — ჯავშანი დადასტურებულია.",
    venueLabel: "ობიექტი",
    whenLabel: "როდის",
    cta: "ნახე ჯავშანი",
  },
};

export function BookingReminderEmail({
  locale = "ka",
  venueName,
  whenLabel,
  bookingUrl,
}: {
  locale?: Locale;
  venueName: string;
  whenLabel: string;
  bookingUrl: string;
}) {
  const t = STRINGS[locale];

  return (
    <EmailLayout preview={t.preview}>
      <Text style={EMAIL_STYLES.h1}>{t.heading}</Text>
      <Text style={EMAIL_STYLES.body}>{t.body}</Text>

      <Section style={detailBoxStyle}>
        <table cellPadding={0} cellSpacing={0} border={0} style={{ width: "100%" }}>
          <tr>
            <td style={{ width: 80, color: EMAIL_STYLES.MUTED, fontSize: 13, padding: "4px 0" }}>
              {t.venueLabel}
            </td>
            <td style={{ color: EMAIL_STYLES.OBSIDIAN, fontSize: 14, fontWeight: 600, padding: "4px 0" }}>
              {venueName}
            </td>
          </tr>
          <tr>
            <td style={{ color: EMAIL_STYLES.MUTED, fontSize: 13, padding: "4px 0" }}>{t.whenLabel}</td>
            <td style={{ color: EMAIL_STYLES.OBSIDIAN, fontSize: 14, fontWeight: 600, padding: "4px 0" }}>
              {whenLabel}
            </td>
          </tr>
        </table>
      </Section>

      <Section style={{ marginTop: 20 }}>
        <CtaButton href={bookingUrl} label={t.cta} />
      </Section>
    </EmailLayout>
  );
}

const detailBoxStyle: React.CSSProperties = {
  background: "#F7F6F2",
  borderRadius: 12,
  padding: "16px 18px",
  marginTop: 12,
};
