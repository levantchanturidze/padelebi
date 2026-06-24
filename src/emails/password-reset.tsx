import { Section, Text } from "@react-email/components";
import { EmailLayout, CtaButton, EMAIL_STYLES } from "./_layout";
import type { Locale } from "@/lib/email";

const STRINGS = {
  en: {
    preview: "Reset your Playtora password.",
    heading: "Reset your password.",
    body: "Click the button below to choose a new password. The link expires in 1 hour.",
    cta: "Set new password",
    note: "If you didn't request this, ignore this email — nothing will change.",
  },
  ka: {
    preview: "Playtora-ს პაროლის აღდგენა.",
    heading: "პაროლის აღდგენა.",
    body: "დააჭირე ღილაკს ახალი პაროლის დასაყენებლად. ბმული აქტიურია 1 საათის განმავლობაში.",
    cta: "ახალი პაროლის დაყენება",
    note: "თუ ეს მოთხოვნა შენ არ გაგიგზავნია, უგულებელყავი ეს წერილი — არაფერი შეიცვლება.",
  },
};

export function PasswordResetEmail({
  locale = "ka",
  resetUrl,
}: {
  locale?: Locale;
  resetUrl: string;
}) {
  const t = STRINGS[locale];

  return (
    <EmailLayout preview={t.preview}>
      <Text style={EMAIL_STYLES.h1}>{t.heading}</Text>
      <Text style={EMAIL_STYLES.body}>{t.body}</Text>

      <Section style={{ marginTop: 12 }}>
        <CtaButton href={resetUrl} label={t.cta} />
      </Section>

      <Text style={{ ...EMAIL_STYLES.meta, marginTop: 24 }}>{t.note}</Text>
    </EmailLayout>
  );
}
