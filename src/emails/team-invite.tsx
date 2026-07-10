import { Section, Text } from "@react-email/components";
import { EmailLayout, CtaButton, EMAIL_STYLES } from "./_layout";
import type { Locale } from "@/lib/email";

const STRINGS = {
  en: {
    preview: (owner: string) => `${owner} invited you to a game.`,
    heading: (owner: string) => `${owner} invited you to a game.`,
    body: "Tap the button below to join the team. You can decline if you can't make it.",
    where: "Where",
    when: "When",
    cta: "View invite",
    signInHint: "You'll need a Playtora account to join.",
  },
  ka: {
    preview: (owner: string) => `${owner}-მა თამაშზე მოგიწვია.`,
    heading: (owner: string) => `${owner}-მა თამაშზე მოგიწვია.`,
    body: "დაადასტურე მოწვევა ქვემოთ ღილაკზე დაჭერით. ვერ ეთანხმები? უარიც შეგიძლია.",
    where: "სად",
    when: "როდის",
    cta: "მოწვევის ნახვა",
    signInHint: "მოწვევის მისაღებად Playtora-ს ანგარიში დაგჭირდება.",
  },
};

export function TeamInviteEmail({
  locale = "ka",
  inviteeName,
  ownerName,
  facilityName,
  whenLabel,
  joinUrl,
}: {
  locale?: Locale;
  /** Null when the invitee doesn't have an account yet. */
  inviteeName?: string | null;
  ownerName: string;
  /** Pre-formatted "Padel Arena · Court 3" */
  facilityName: string;
  /** Pre-formatted "Fri, 27 Jun · 19:30–21:00" */
  whenLabel: string;
  joinUrl: string;
}) {
  const t = STRINGS[locale];
  const greeting = inviteeName
    ? locale === "ka"
      ? `გამარჯობა, ${inviteeName}.`
      : `Hi ${inviteeName},`
    : locale === "ka"
      ? "გამარჯობა!"
      : "Hi there,";

  return (
    <EmailLayout preview={t.preview(ownerName)}>
      <Text style={EMAIL_STYLES.h1}>{t.heading(ownerName)}</Text>
      <Text style={EMAIL_STYLES.body}>
        {greeting} {t.body}
      </Text>

      <Section style={detailBoxStyle}>
        <Row label={t.where} value={facilityName} />
        <Row label={t.when} value={whenLabel} />
      </Section>

      <Section style={{ marginTop: 20 }}>
        <CtaButton href={joinUrl} label={t.cta} />
      </Section>
      <Text style={{ ...EMAIL_STYLES.meta, marginTop: 12 }}>{t.signInHint}</Text>
    </EmailLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <table cellPadding={0} cellSpacing={0} border={0} style={{ width: "100%" }}>
      <tr>
        <td style={{ ...EMAIL_STYLES.cell, width: 90, color: EMAIL_STYLES.MUTED, fontSize: 13 }}>
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
