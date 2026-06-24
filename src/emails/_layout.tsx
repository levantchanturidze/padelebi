import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";
import { SITE_URL } from "@/lib/seo";

/**
 * Shared layout for every Playtora transactional email.
 * - Obsidian header bar with Pin logo
 * - Bone background
 * - 600px card with Obsidian text
 * - Footer with address + manage-link
 *
 * Pure CSS via React Email's Tailwind component — no external resources;
 * compiles to inline styles that survive every mail client.
 */
export function EmailLayout({
  preview,
  children,
  footerLinkLabel,
  footerLinkUrl,
}: {
  preview: string;
  children: ReactNode;
  footerLinkLabel?: string;
  footerLinkUrl?: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body style={bodyStyle}>
          <Container style={outerStyle}>
            {/* Header */}
            <Section style={headerStyle}>
              <table cellPadding={0} cellSpacing={0} border={0}>
                <tr>
                  <td style={{ paddingRight: 10, verticalAlign: "middle" }}>
                    <PinSvg />
                  </td>
                  <td style={{ verticalAlign: "middle" }}>
                    <Text style={wordmarkStyle}>Playtora</Text>
                  </td>
                </tr>
              </table>
            </Section>

            {/* Body card */}
            <Section style={cardStyle}>{children}</Section>

            {/* Footer */}
            <Section style={footerStyle}>
              <Text style={footerTextStyle}>
                Playtora · Tbilisi, Georgia
              </Text>
              {footerLinkUrl && (
                <Text style={footerTextStyle}>
                  <Link href={footerLinkUrl} style={footerLinkStyle}>
                    {footerLinkLabel}
                  </Link>
                </Text>
              )}
              <Hr style={hrStyle} />
              <Text style={footerMutedStyle}>
                © {new Date().getFullYear()} Playtora ·{" "}
                <Link href={SITE_URL} style={footerLinkStyle}>
                  playtora.app
                </Link>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

/** Reusable Volt-fill CTA button for emails. */
export function CtaButton({ href, label }: { href: string; label: string }) {
  return (
    <table cellPadding={0} cellSpacing={0} border={0} role="presentation">
      <tr>
        <td style={ctaCellStyle}>
          <Link href={href} style={ctaLinkStyle}>
            {label}
          </Link>
        </td>
      </tr>
    </table>
  );
}

/** Inline Playtora Pin mark — same shape as the in-app logo. */
function PinSvg() {
  return (
    <table cellPadding={0} cellSpacing={0} border={0}>
      <tr>
        <td>
          <svg width="28" height="28" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <path d="M11 6 L11 26" stroke="#F7F6F2" strokeWidth="2.5" strokeLinecap="round" />
            <path
              d="M11 6 H17 C22.523 6 27 9.806 27 14.5 C27 19.194 22.523 23 17 23 H11"
              stroke="#F7F6F2"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <circle cx="19" cy="14.5" r="2.6" fill="#C4FF3D" />
          </svg>
        </td>
      </tr>
    </table>
  );
}

const OBSIDIAN = "#0B0E14";
const BONE = "#F7F6F2";
const VOLT = "#C4FF3D";
const MUTED = "#6B7280";

const bodyStyle: React.CSSProperties = {
  margin: 0,
  padding: 0,
  background: BONE,
  fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const outerStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 600,
  margin: "0 auto",
  padding: "32px 16px 48px",
};

const headerStyle: React.CSSProperties = {
  padding: "20px 24px",
  borderRadius: "16px 16px 0 0",
  background: OBSIDIAN,
};

const wordmarkStyle: React.CSSProperties = {
  color: BONE,
  fontSize: 18,
  fontWeight: 700,
  letterSpacing: -0.4,
  margin: 0,
  padding: 0,
};

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: "0 0 16px 16px",
  padding: "28px",
  borderLeft: "1px solid #E5E4DD",
  borderRight: "1px solid #E5E4DD",
  borderBottom: "1px solid #E5E4DD",
};

const footerStyle: React.CSSProperties = {
  padding: "20px 24px",
  textAlign: "center" as const,
};

const footerTextStyle: React.CSSProperties = {
  color: MUTED,
  fontSize: 12,
  margin: "4px 0",
};

const footerMutedStyle: React.CSSProperties = {
  color: MUTED,
  fontSize: 11,
  margin: 0,
};

const footerLinkStyle: React.CSSProperties = {
  color: MUTED,
  textDecoration: "underline",
};

const hrStyle: React.CSSProperties = {
  borderColor: "#E5E4DD",
  margin: "12px 0 8px",
};

const ctaCellStyle: React.CSSProperties = {
  background: VOLT,
  borderRadius: 10,
  padding: "12px 22px",
};

const ctaLinkStyle: React.CSSProperties = {
  color: OBSIDIAN,
  fontSize: 15,
  fontWeight: 700,
  textDecoration: "none",
};

export const EMAIL_STYLES = {
  OBSIDIAN,
  BONE,
  VOLT,
  MUTED,
  h1: { fontSize: 24, fontWeight: 800, color: OBSIDIAN, margin: "0 0 8px", letterSpacing: -0.4 } as React.CSSProperties,
  body: { fontSize: 15, lineHeight: 1.55, color: OBSIDIAN, margin: "0 0 16px" } as React.CSSProperties,
  meta: { fontSize: 14, color: MUTED, margin: "4px 0" } as React.CSSProperties,
  cell: { padding: "4px 0" } as React.CSSProperties,
} as const;
