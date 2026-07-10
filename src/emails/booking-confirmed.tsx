import { Section, Text } from "@react-email/components";
import { EmailLayout, CtaButton, EMAIL_STYLES } from "./_layout";
import type { Locale } from "@/lib/email";

const STRINGS = {
  en: {
    preview: "You're booked.",
    heading: "You're on.",
    body: "Your booking is confirmed. Show this email or your account when you arrive.",
    venueLabel: "Venue",
    facilityLabel: "Facility",
    whenLabel: "When",
    totalLabel: "Total",
    discountLabel: "Discount",
    payAtVenue: "Pay at venue",
    cta: "View booking",
  },
  ka: {
    preview: "ჯავშანი დადასტურდა.",
    heading: "მზადაა!",
    body: "ჯავშანი დადასტურდა. ადგილზე ჩასვლისას აჩვენე ეს წერილი ან შენი ანგარიში.",
    venueLabel: "ობიექტი",
    facilityLabel: "ფასილიტი",
    whenLabel: "როდის",
    totalLabel: "სულ",
    discountLabel: "ფასდაკლება",
    payAtVenue: "გადახდა ადგილზე",
    cta: "ნახე ჯავშანი",
  },
};

export function BookingConfirmedEmail({
  locale = "ka",
  userName,
  venueName,
  facilityName,
  whenLabel,
  totalLabel,
  discountLabel,
  bookingUrl,
}: {
  locale?: Locale;
  userName: string;
  venueName: string;
  facilityName: string;
  /** Pre-formatted "Friday, 27 June · 19:30–21:00 · 90 min" */
  whenLabel: string;
  /** Pre-formatted "₾90" */
  totalLabel: string;
  /** Pre-formatted "LAUNCH25 · −₾10" — omit when no discount was applied. */
  discountLabel?: string | null;
  bookingUrl: string;
}) {
  const t = STRINGS[locale];

  return (
    <EmailLayout preview={t.preview}>
      <Text style={EMAIL_STYLES.h1}>{t.heading}</Text>
      <Text style={EMAIL_STYLES.body}>
        {locale === "ka" ? `გამარჯობა, ${userName}.` : `Hi ${userName},`} {t.body}
      </Text>

      <Section style={detailBoxStyle}>
        <Row label={t.venueLabel} value={venueName} />
        <Row label={t.facilityLabel} value={facilityName} />
        <Row label={t.whenLabel} value={whenLabel} />
        <Row label={t.totalLabel} value={`${totalLabel} · ${t.payAtVenue}`} />
        {discountLabel && <Row label={t.discountLabel} value={discountLabel} />}
      </Section>

      <Section style={{ marginTop: 20 }}>
        <CtaButton href={bookingUrl} label={t.cta} />
      </Section>
    </EmailLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <table cellPadding={0} cellSpacing={0} border={0} style={{ width: "100%" }}>
      <tr>
        <td style={{ ...EMAIL_STYLES.cell, width: 110, color: EMAIL_STYLES.MUTED, fontSize: 13 }}>
          {label}
        </td>
        <td style={{ ...EMAIL_STYLES.cell, color: EMAIL_STYLES.OBSIDIAN, fontSize: 14, fontWeight: 600 }}>
          {value}
        </td>
      </tr>
    </table>
  );
}

const detailBoxStyle: React.CSSProperties = {
  background: "#F7F6F2",
  borderRadius: 12,
  padding: "16px 18px",
  marginTop: 12,
};
