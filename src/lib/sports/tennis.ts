import { z } from "zod";
import type { SportAdapter } from "./types";

const TENNIS_SURFACES = ["CLAY", "HARD", "GRASS", "CARPET"] as const;

const attributesSchema = z.object({
  surface: z.enum(TENNIS_SURFACES).default("HARD"),
  lighting: z.boolean().default(false),
});

type TennisAttributes = z.infer<typeof attributesSchema>;

const SURFACE_LABELS: Record<(typeof TENNIS_SURFACES)[number], string> = {
  CLAY: "Clay",
  HARD: "Hard court",
  GRASS: "Grass",
  CARPET: "Carpet",
};

export const tennisAdapter: SportAdapter<TennisAttributes> = {
  slug: "tennis",
  facilityNoun: { singular: "court", plural: "courts" },
  defaults: {
    slotMinutes: 60,
    pricePerHourGEL: 40,
    bookingModel: "TIME_SLOT",
    capacity: 1,
    attributes: { surface: "HARD", lighting: false },
  },
  allowedAmenities: [
    "PARKING",
    "SHOWERS",
    "LOCKER_ROOM",
    "PRO_SHOP",
    "CAFE",
    "BALL_RENTAL",
    "EQUIPMENT_RENTAL",
    "LIGHTING",
    "WHEELCHAIR_ACCESS",
    "WIFI",
    "WATER_FOUNTAIN",
  ],
  attributesSchema,
  summary(a) {
    return [
      { label: "Surface", value: SURFACE_LABELS[a.surface] },
      ...(a.lighting ? [{ label: "Floodlit", value: "Yes" }] : []),
    ];
  },
  formFields: [
    {
      kind: "select",
      name: "surface",
      label: "Surface",
      options: TENNIS_SURFACES.map((s) => ({ value: s, label: SURFACE_LABELS[s] })),
    },
    { kind: "boolean", name: "lighting", label: "Has floodlights" },
  ],
};
