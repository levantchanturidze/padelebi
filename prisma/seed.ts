import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Default weekly schedule: 08:00–22:00, 90-minute slots, every day.
function fullWeekSchedule(slotMinutes = 90) {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    openMinutes: 8 * 60,
    closeMinutes: 22 * 60,
    slotMinutes,
  }));
}

async function main() {
  console.log("Seeding Padelebi…");

  // Clean slate (dev only)
  await prisma.booking.deleteMany();
  await prisma.blackout.deleteMany();
  await prisma.courtSchedule.deleteMany();
  await prisma.review.deleteMany();
  await prisma.court.deleteMany();
  await prisma.club.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  // One user per role
  const admin = await prisma.user.create({
    data: {
      name: "Platform Admin",
      email: "admin@padelebi.ge",
      passwordHash,
      role: "PLATFORM_ADMIN",
    },
  });

  const owner = await prisma.user.create({
    data: {
      name: "Nino Club Owner",
      email: "club@padelebi.ge",
      passwordHash,
      role: "CLUB_ADMIN",
      phone: "+995 555 10 20 30",
    },
  });

  const player = await prisma.user.create({
    data: {
      name: "Giorgi Player",
      email: "player@padelebi.ge",
      passwordHash,
      role: "PLAYER",
      phone: "+995 555 40 50 60",
      skillLevel: "INTERMEDIATE",
    },
  });

  const openingHours = JSON.stringify(
    Object.fromEntries(
      Array.from({ length: 7 }, (_, d) => [d, { open: "08:00", close: "22:00" }]),
    ),
  );

  // Club 1 — approved, Tbilisi
  const club1 = await prisma.club.create({
    data: {
      name: "Vake Padel Club",
      slug: "vake-padel-club",
      description:
        "Premium padel courts in the heart of Vake. Indoor and outdoor panoramic courts, pro shop and café on site.",
      address: "12 Chavchavadze Ave",
      city: "Tbilisi",
      lat: 41.709,
      lng: 44.766,
      photos: JSON.stringify([
        "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1200",
      ]),
      amenities: JSON.stringify(["PARKING", "SHOWERS", "CAFE", "RACKET_RENTAL", "LIGHTING"]),
      openingHours,
      status: "APPROVED",
      ownerId: owner.id,
    },
  });

  // Club 2 — approved, Batumi
  const club2 = await prisma.club.create({
    data: {
      name: "Black Sea Padel",
      slug: "black-sea-padel",
      description:
        "Seaside padel courts in Batumi with floodlights for evening play and racket rental.",
      address: "5 Seaside Blvd",
      city: "Batumi",
      lat: 41.65,
      lng: 41.636,
      photos: JSON.stringify([
        "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=1200",
      ]),
      amenities: JSON.stringify(["PARKING", "LOCKER_ROOM", "LIGHTING", "RACKET_RENTAL"]),
      openingHours,
      status: "APPROVED",
      ownerId: owner.id,
    },
  });

  // Club 3 — pending approval (for platform admin demo)
  await prisma.club.create({
    data: {
      name: "Saburtalo Smash Arena",
      slug: "saburtalo-smash-arena",
      description: "New indoor padel arena awaiting approval.",
      address: "44 Vazha-Pshavela Ave",
      city: "Tbilisi",
      photos: JSON.stringify([]),
      amenities: JSON.stringify(["PARKING", "SHOWERS"]),
      openingHours,
      status: "PENDING",
      ownerId: owner.id,
    },
  });

  // Courts + schedules
  const courtSpecs = [
    { club: club1, name: "Court 1 — Panoramic", surface: "PANORAMIC", indoor: false, price: 60 },
    { club: club1, name: "Court 2 — Indoor", surface: "ARTIFICIAL_GRASS", indoor: true, price: 70 },
    { club: club2, name: "Court A — Seaside", surface: "ARTIFICIAL_GRASS", indoor: false, price: 50 },
  ];

  const courts = [];
  for (const spec of courtSpecs) {
    const court = await prisma.court.create({
      data: {
        clubId: spec.club.id,
        name: spec.name,
        surface: spec.surface,
        isIndoor: spec.indoor,
        pricePerHourGEL: spec.price,
        schedules: { create: fullWeekSchedule() },
      },
    });
    courts.push(court);
  }

  // A sample booking for the player tomorrow at 18:00 on the first court (90 min).
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const start = new Date(
    tomorrow.getFullYear(),
    tomorrow.getMonth(),
    tomorrow.getDate(),
    18,
    0,
    0,
    0,
  );
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + 90);

  await prisma.booking.create({
    data: {
      courtId: courts[0].id,
      userId: player.id,
      startTime: start,
      endTime: end,
      priceGEL: Math.round((courts[0].pricePerHourGEL * 90) / 60),
      status: "CONFIRMED",
      paymentStatus: "UNPAID",
    },
  });

  console.log("Seed complete.");
  console.log("Logins (password: password123):");
  console.log("  Platform admin: admin@padelebi.ge");
  console.log("  Club admin:     club@padelebi.ge");
  console.log("  Player:         player@padelebi.ge");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
