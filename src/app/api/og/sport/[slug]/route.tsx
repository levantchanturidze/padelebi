import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

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
  const sport = await prisma.sport.findUnique({
    where: { slug },
    include: { _count: { select: { facilities: { where: { isActive: true } } } } },
  });
  if (!sport) {
    return new ImageResponse(
      (
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
          Sport not found
        </div>
      ),
      SIZE,
    );
  }

  const facilityCount = sport._count.facilities;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: `radial-gradient(ellipse 80% 50% at 95% 0%, rgba(196,255,61,0.18) 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(42,79,255,0.20) 0%, transparent 55%), linear-gradient(160deg, ${OBSIDIAN} 0%, #11151E 50%, ${OBSIDIAN} 100%)`,
          fontFamily: "sans-serif",
          padding: "64px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <PinMark />
          <span style={{ color: BONE, fontSize: 28, fontWeight: 700, letterSpacing: -0.5 }}>
            Playtora
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <span style={{ color: VOLT, fontSize: 28, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>
            {sport.category}
          </span>
          <h1 style={{ color: BONE, fontSize: 132, fontWeight: 800, letterSpacing: -3, margin: 0, lineHeight: 1.0 }}>
            {sport.name}
          </h1>
          <p style={{ color: MUTED, fontSize: 30, margin: 0 }}>
            {facilityCount === 0
              ? "Coming soon to Playtora"
              : `${facilityCount} ${facilityCount === 1 ? "venue" : "venues"} on Playtora`}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", width: 84, height: 4, background: VOLT, borderRadius: 999 }} />
          <span style={{ color: MUTED, fontSize: 20, fontWeight: 600, letterSpacing: 1 }}>
            FIND. BOOK. PLAY.
          </span>
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
