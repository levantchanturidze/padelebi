/**
 * End-to-end check of the booking engine against the seeded dev DB.
 * Run with: npx tsx scripts/verify-booking.ts
 */
import { prisma } from "../src/lib/prisma";
import { getFacilityAvailability } from "../src/lib/availability";
import { createBooking, BookingError } from "../src/lib/booking";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error("ASSERT FAILED: " + msg);
  console.log("  ✓ " + msg);
}

async function main() {
  const facility = await prisma.facility.findFirstOrThrow({
    where: { venue: { status: "APPROVED" } },
  });
  const player = await prisma.user.findFirstOrThrow({ where: { role: "PLAYER" } });

  // Use a date 3 days out to avoid colliding with seeded bookings.
  const day = new Date();
  day.setDate(day.getDate() + 3);
  const dayOnly = new Date(day.getFullYear(), day.getMonth(), day.getDate());

  console.log("1) Availability generation");
  const slots = await getFacilityAvailability(facility.id, dayOnly);
  assert(slots.length > 0, `generated ${slots.length} slots from schedule`);
  const free = slots.find((s) => s.available);
  assert(!!free, "at least one free slot exists");

  console.log("2) Create a booking");
  const booking = await createBooking({
    facilityId: facility.id,
    userId: player.id,
    startTime: free!.start,
    endTime: free!.end,
  });
  assert(!!booking.id, "booking created");
  assert(booking.priceGEL > 0, `price computed = ${booking.priceGEL} GEL`);

  console.log("3) Double-booking is rejected");
  let rejected = false;
  try {
    await createBooking({
      facilityId: facility.id,
      userId: player.id,
      startTime: free!.start,
      endTime: free!.end,
    });
  } catch (e) {
    rejected = e instanceof BookingError;
  }
  assert(rejected, "overlapping booking throws BookingError");

  console.log("4) Slot now shows unavailable");
  const after = await getFacilityAvailability(facility.id, dayOnly);
  const sameSlot = after.find((s) => s.start.getTime() === free!.start.getTime());
  assert(sameSlot?.available === false, "previously-free slot is now taken");

  console.log("5) Cleanup");
  await prisma.booking.delete({ where: { id: booking.id } });
  assert(true, "test booking removed");

  console.log("\nAll booking-engine checks passed.");
}

main()
  .catch((e) => {
    console.error("\n" + (e?.message ?? e));
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
