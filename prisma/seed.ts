import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SPORTS = [
  { id: "sport_padel",         slug: "padel",         name: "Padel",         icon: "Trophy",     category: "RACQUET",    sortOrder: 10 },
  { id: "sport_tennis",        slug: "tennis",        name: "Tennis",        icon: "Trophy",     category: "RACQUET",    sortOrder: 20 },
  { id: "sport_football",      slug: "football",      name: "Football",      icon: "Goal",       category: "TEAM",       sortOrder: 30 },
  { id: "sport_basketball",    slug: "basketball",    name: "Basketball",    icon: "Dribbble",   category: "TEAM",       sortOrder: 40 },
  { id: "sport_volleyball",    slug: "volleyball",    name: "Volleyball",    icon: "Volleyball", category: "TEAM",       sortOrder: 50 },
  { id: "sport_futsal",        slug: "futsal",        name: "Futsal",        icon: "Goal",       category: "TEAM",       sortOrder: 60 },
  { id: "sport_badminton",     slug: "badminton",     name: "Badminton",     icon: "Feather",    category: "RACQUET",    sortOrder: 70 },
  { id: "sport_table_tennis",  slug: "table-tennis",  name: "Table tennis",  icon: "CircleDot",  category: "RACQUET",    sortOrder: 80 },
  { id: "sport_squash",        slug: "squash",        name: "Squash",        icon: "CircleDot",  category: "RACQUET",    sortOrder: 90 },
  { id: "sport_swimming",      slug: "swimming",      name: "Swimming pool", icon: "Waves",      category: "WATER",      sortOrder: 100 },
  { id: "sport_gym",           slug: "gym",           name: "Gym",           icon: "Dumbbell",   category: "FITNESS",    sortOrder: 110 },
  { id: "sport_fitness_class", slug: "fitness-class", name: "Fitness class", icon: "HeartPulse", category: "FITNESS",    sortOrder: 120 },
  { id: "sport_martial_arts",  slug: "martial-arts",  name: "Martial arts",  icon: "Swords",     category: "FITNESS",    sortOrder: 130 },
] as const;

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

  // Clean slate (dev only). Order respects FK constraints; Sport is kept (catalog).
  await prisma.booking.deleteMany();
  await prisma.blackout.deleteMany();
  await prisma.facilitySchedule.deleteMany();
  await prisma.review.deleteMany();
  await prisma.facility.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.user.deleteMany();

  // Sport catalog — upsert so fresh dev DBs (no migration history) still work.
  for (const sport of SPORTS) {
    await prisma.sport.upsert({
      where: { id: sport.id },
      update: {
        slug: sport.slug,
        name: sport.name,
        icon: sport.icon,
        category: sport.category,
        sortOrder: sport.sortOrder,
      },
      create: { ...sport },
    });
  }

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
      name: "Nino Venue Owner",
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

  // Venue 1 — approved, Tbilisi
  const venue1 = await prisma.venue.create({
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

  // Venue 2 — approved, Batumi
  const venue2 = await prisma.venue.create({
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

  // Venue 3 — pending approval (for platform admin demo)
  await prisma.venue.create({
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

  // Facilities (padel courts) + schedules
  const facilitySpecs = [
    { venue: venue1, name: "Court 1 — Panoramic", surface: "PANORAMIC", indoor: false, price: 60 },
    { venue: venue1, name: "Court 2 — Indoor", surface: "ARTIFICIAL_GRASS", indoor: true, price: 70 },
    { venue: venue2, name: "Court A — Seaside", surface: "ARTIFICIAL_GRASS", indoor: false, price: 50 },
  ];

  const facilities = [];
  for (const spec of facilitySpecs) {
    const facility = await prisma.facility.create({
      data: {
        venueId: spec.venue.id,
        sportId: "sport_padel",
        name: spec.name,
        surface: spec.surface,
        isIndoor: spec.indoor,
        pricePerHourGEL: spec.price,
        schedules: { create: fullWeekSchedule() },
      },
    });
    facilities.push(facility);
  }

  // A sample booking for the player tomorrow at 18:00 on the first facility (90 min).
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
      facilityId: facilities[0].id,
      userId: player.id,
      startTime: start,
      endTime: end,
      priceGEL: Math.round((facilities[0].pricePerHourGEL * 90) / 60),
      status: "CONFIRMED",
      paymentStatus: "UNPAID",
    },
  });

  console.log("Seed complete.");
  console.log(`  ${SPORTS.length} sports, 3 venues, ${facilities.length} facilities`);
  console.log("Logins (password: password123):");
  console.log("  Platform admin: admin@padelebi.ge");
  console.log("  Venue manager:  club@padelebi.ge");
  console.log("  Player:         player@padelebi.ge");

  void admin; // referenced for clarity above
  void player;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
