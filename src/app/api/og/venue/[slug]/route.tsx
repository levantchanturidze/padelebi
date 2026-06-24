import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { parseJSON } from "@/lib/utils";

export const runtime = "nodejs";

const SIZE = { width: 1200, height: 630 };
const VOLT = "#C4FF3D";
const OBSIDIAN = "#0B0E14";
const BONE = "#F7F6F2";
const MUTED = "#A0A4AD";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const venue = await prisma.venue.findFirst({
    where: { slug, status: "APPROVED" },
    include: {
      facilities: {
        where: { isActive: true },
        include: { sport: true },
      },
    },
  });

  if (!venue) {
    return new ImageResponse(<DefaultCard title="Venue not found" />, SIZE);
  }

  const photos = parseJSON<string[]>(venue.photos, []);
  const heroPhoto = photos[0];
  const sports = Array.from(
    new Map(venue.facilities.map((f) => [f.sport.id, f.sport.name])).values(),
  ).slice(0, 3);
  const minPrice = venue.facilities.length
    ? Math.min(...venue.facilities.map((c) => c.pricePerHourGEL))
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: OBSIDIAN,
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Left: venue info */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "56px 56px 48px 56px",
          }}
        >
          {/* Wordmark */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <PinMark />
            <span style={{ color: BONE, fontSize: 28, fontWeight: 700, letterSpacing: -0.5 }}>
              Playtora
            </span>
          </div>

          {/* Main content */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {sports.map((s) => (
                <span
                  key={s}
                  style={{
                    background: "rgba(196,255,61,0.15)",
                    border: `1px solid ${VOLT}`,
                    color: VOLT,
                    padding: "4px 12px",
                    borderRadius: 999,
                    fontSize: 18,
                    fontWeight: 600,
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
            <h1 style={{ color: BONE, fontSize: 64, fontWeight: 800, letterSpacing: -1.2, margin: 0, lineHeight: 1.05 }}>
              {venue.name}
            </h1>
            <p style={{ color: MUTED, fontSize: 26, margin: 0 }}>
              {venue.city}
              {minPrice !== null && (
                <>
                  {"  ·  "}
                  <span style={{ color: BONE }}>from ₾{minPrice}</span>
                </>
              )}
            </p>
          </div>

          {/* Volt bottom bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", width: 84, height: 4, background: VOLT, borderRadius: 999 }} />
            <span style={{ color: MUTED, fontSize: 20, fontWeight: 600, letterSpacing: 1 }}>
              FIND. BOOK. PLAY.
            </span>
          </div>
        </div>

        {/* Right: photo or gradient */}
        <div
          style={{
            width: 460,
            display: "flex",
            backgroundImage: heroPhoto
              ? `url(${heroPhoto})`
              : `linear-gradient(160deg, ${OBSIDIAN} 0%, #11151E 50%, ${OBSIDIAN} 100%)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            position: "relative",
          }}
        >
          {/* Left fade for edge readability */}
          <div
            style={{
              display: "flex",
              position: "absolute",
              inset: 0,
              background: "linear-gradient(90deg, rgba(11,14,20,0.6) 0%, transparent 30%)",
            }}
          />
        </div>
      </div>
    ),
    {
      ...SIZE,
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}

function PinMark() {
  return (
    <svg width="40" height="40" viewBox="0 0 32 32">
      <path d="M11 6 L11 26" stroke={BONE} strokeWidth="3" strokeLinecap="round" />
      <path
        d="M11 6 H17 C22.5 6 27 9.8 27 14.5 C27 19.2 22.5 23 17 23 H11"
        stroke={BONE}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="19" cy="14.5" r="3" fill={VOLT} />
    </svg>
  );
}

function DefaultCard({ title }: { title: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: OBSIDIAN,
        color: BONE,
        fontFamily: "sans-serif",
        fontSize: 56,
        fontWeight: 700,
      }}
    >
      {title}
    </div>
  );
}
