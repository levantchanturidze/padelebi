import { Section, Text } from "@react-email/components";
import { EmailLayout, CtaButton, EMAIL_STYLES } from "./_layout";
import type { Locale } from "@/lib/email";

const STRINGS = {
  en: {
    preview: "A booking was cancelled.",
    heading: "Booking cancelled.",
    body: "A player has cancelled their reservation — the slot is free again.",
    playerLabel: "Player",
    facilityLabel: "Facility",
    whenLabel: "When",
    cta: "Open bookings dashboard",
  },
  ka: {
    preview: "ჯავშანი გაუქმდა.",
    heading: "ჯავშანი გაუქმდა.",
    body: "მოთამაშემ გააუქმა ჯავშანი — დრო კვლავ თავისუფალია.",
    playerLabel: "მოთამაშე",
    facilityLabel: "ფასილიტი",
    whenLabel: "როდის",
    cta: "ჯავშნების პანელი",
  },
};

export function ManagerBookingCancelledEmail({
  locale = "ka",
  playerName,
  facilityName,
  whenLabel,
  managerUrl,
}: {
  locale?: Locale;
  playerName: string;
  facilityName: string;
  whenLabel: string;
  managerUrl: string;
}) {
  const t = STRINGS[locale];

  return (
    <EmailLayout preview={t.preview}>
      <Text style={EMAIL_STYLES.h1}>{t.heading}</Text>
      <Text style={EMAIL_STYLES.body}>{t.body}</Text>

      <Section style={detailBoxStyle}>
        <Row label={t.playerLabel} value={playerName} />
        <Row label={t.facilityLabel} value={facilityName} />
        <Row label={t.whenLabel} value={whenLabel} />
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
