import { Section, Text } from "@react-email/components";
import { EmailLayout, CtaButton, EMAIL_STYLES } from "./_layout";
import type { Locale } from "@/lib/email";

const STRINGS = {
  en: {
    preview: "New booking at your venue.",
    heading: "New booking.",
    body: "A player has just reserved a slot.",
    playerLabel: "Player",
    phoneLabel: "Phone",
    facilityLabel: "Facility",
    whenLabel: "When",
    totalLabel: "Total",
    notesLabel: "Notes",
    payAtVenue: "pay at venue",
    cta: "Open bookings dashboard",
  },
  ka: {
    preview: "ახალი ჯავშანი შენს ობიექტში.",
    heading: "ახალი ჯავშანი.",
    body: "მოთამაშემ ახლახან დაჯავშნა დრო.",
    playerLabel: "მოთამაშე",
    phoneLabel: "ტელეფონი",
    facilityLabel: "ფასილიტი",
    whenLabel: "როდის",
    totalLabel: "სულ",
    notesLabel: "შენიშვნა",
    payAtVenue: "გადახდა ადგილზე",
    cta: "ჯავშნების პანელი",
  },
};

export function ManagerNewBookingEmail({
  locale = "ka",
  playerName,
  playerPhone,
  facilityName,
  whenLabel,
  totalLabel,
  notes,
  managerUrl,
}: {
  locale?: Locale;
  playerName: string;
  playerPhone: string | null;
  facilityName: string;
  whenLabel: string;
  totalLabel: string;
  notes: string | null;
  managerUrl: string;
}) {
  const t = STRINGS[locale];

  return (
    <EmailLayout preview={t.preview}>
      <Text style={EMAIL_STYLES.h1}>{t.heading}</Text>
      <Text style={EMAIL_STYLES.body}>{t.body}</Text>

      <Section style={detailBoxStyle}>
        <Row label={t.playerLabel} value={playerName} />
        {playerPhone && <Row label={t.phoneLabel} value={playerPhone} />}
        <Row label={t.facilityLabel} value={facilityName} />
        <Row label={t.whenLabel} value={whenLabel} />
        <Row label={t.totalLabel} value={`${totalLabel} · ${t.payAtVenue}`} />
        {notes && <Row label={t.notesLabel} value={notes} />}
      </Section>

      <Section style={{ marginTop: 20 }}>
        <CtaButton href={managerUrl} label={t.cta} />
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
