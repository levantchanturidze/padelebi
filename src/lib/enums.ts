// Enum-like constants. Stored as Strings in the DB for SQLite/Postgres portability,
// validated in app code.

export const ROLES = ["PLAYER", "CLUB_ADMIN", "PLATFORM_ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const SKILL_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "PRO"] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

export const CLUB_STATUSES = ["PENDING", "APPROVED", "SUSPENDED"] as const;
export type ClubStatus = (typeof CLUB_STATUSES)[number];

export const SURFACES = ["ARTIFICIAL_GRASS", "CONCRETE", "PANORAMIC"] as const;
export type Surface = (typeof SURFACES)[number];

export const BOOKING_STATUSES = ["PENDING", "CONFIRMED", "CANCELLED"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const PAYMENT_STATUSES = ["UNPAID", "PAID", "REFUNDED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const AMENITIES = [
  "PARKING",
  "SHOWERS",
  "LOCKER_ROOM",
  "PRO_SHOP",
  "CAFE",
  "RACKET_RENTAL",
  "LIGHTING",
  "WHEELCHAIR_ACCESS",
] as const;
export type Amenity = (typeof AMENITIES)[number];

export const SURFACE_LABELS: Record<Surface, string> = {
  ARTIFICIAL_GRASS: "Artificial grass",
  CONCRETE: "Concrete",
  PANORAMIC: "Panoramic glass",
};

export const SKILL_LABELS: Record<SkillLevel, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  PRO: "Pro",
};

export const AMENITY_LABELS: Record<Amenity, string> = {
  PARKING: "Parking",
  SHOWERS: "Showers",
  LOCKER_ROOM: "Locker room",
  PRO_SHOP: "Pro shop",
  CAFE: "Café",
  RACKET_RENTAL: "Racket rental",
  LIGHTING: "Floodlights",
  WHEELCHAIR_ACCESS: "Wheelchair access",
};

export const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
