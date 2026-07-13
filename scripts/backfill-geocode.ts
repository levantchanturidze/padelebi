/**
 * One-off backfill: geocode every venue that is missing coordinates.
 *
 * Venues created before address geocoding existed have lat/lng = null and so
 * never appear as map pins. This walks them, geocodes each address, and stores
 * the result. Throttled to ~1 request/second to stay within Nominatim's usage
 * policy. Safe to re-run — it only touches venues that still lack coordinates.
 *
 * Run with: npx tsx scripts/backfill-geocode.ts
 */
import { prisma } from "../src/lib/prisma";
import { geocodeVenue } from "../src/lib/geocode";

const THROTTLE_MS = 1_100;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const venues = await prisma.venue.findMany({
    where: { OR: [{ lat: null }, { lng: null }] },
    select: { id: true, name: true, address: true, city: true, district: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${venues.length} venue(s) without coordinates.\n`);

  let updated = 0;
  let missed = 0;
  for (const [i, v] of venues.entries()) {
    const coords = await geocodeVenue(v);
    if (coords) {
      await prisma.venue.update({
        where: { id: v.id },
        data: { lat: coords.lat, lng: coords.lng },
      });
      updated++;
      console.log(`  ✓ ${v.name} → ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
    } else {
      missed++;
      console.log(`  ✗ ${v.name} — no match for "${v.address}, ${v.city}"`);
    }
    if (i < venues.length - 1) await sleep(THROTTLE_MS);
  }

  console.log(`\nDone. ${updated} geocoded, ${missed} unresolved.`);
}

main()
  .catch((e) => {
    console.error("\n" + (e?.message ?? e));
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
