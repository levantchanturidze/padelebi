import { z } from "zod";
import type { SportAdapter } from "./types";

const PITCH_SIZES = ["FIVE", "SEVEN", "ELEVEN"] as const;
const GRASS_TYPES = ["NATURAL", "ARTIFICIAL", "HYBRID"] as const;

const attributesSchema = z.object({
  pitchSize: z.enum(PITCH_SIZES).default("FIVE"),
  grassType: z.enum(GRASS_TYPES).default("ARTIFICIAL"),
  lighting: z.boolean().default(false),
});

type FootballAttributes = z.infer<typeof attributesSchema>;

const PITCH_LABELS: Record<(typeof PITCH_SIZES)[number], string> = {
  FIVE: "5-a-side",
  SEVEN: "7-a-side",
  ELEVEN: "11-a-side",
};

const GRASS_LABELS: Record<(typeof GRASS_TYPES)[number], string> = {
  NATURAL: "Natural grass",
  ARTIFICIAL: "Artificial turf",
  HYBRID: "Hybrid",
};

export const footballAdapter: SportAdapter<FootballAttributes> = {
  slug: "football",
  facilityNoun: { singular: "pitch", plural: "pitches" },
  defaults: {
    slotMinutes: 60,
    pricePerHourGEL: 80,
    bookingModel: "TIME_SLOT",
    capacity: 1,
    attributes: { pitchSize: "FIVE", grassType: "ARTIFICIAL", lighting: false },
  },
  allowedAmenities: [
    "PARKING",
    "SHOWERS",
    "LOCKER_ROOM",
    "CAFE",
    "EQUIPMENT_RENTAL",
    "LIGHTING",
    "WHEELCHAIR_ACCESS",
    "WIFI",
    "WATER_FOUNTAIN",
  ],
  attributesSchema,
  summary(a) {
    return [
      { label: "Format", value: PITCH_LABELS[a.pitchSize] },
      { label: "Surface", value: GRASS_LABELS[a.grassType] },
      ...(a.lighting ? [{ label: "Floodlit", value: "Yes" }] : []),
    ];
  },
  formFields: [
    {
      kind: "select",
      name: "pitchSize",
      label: "Pitch format",
      options: PITCH_SIZES.map((s) => ({ value: s, label: PITCH_LABELS[s] })),
    },
    {
      kind: "select",
      name: "grassType",
      label: "Grass type",
      options: GRASS_TYPES.map((s) => ({ value: s, label: GRASS_LABELS[s] })),
    },
    { kind: "boolean", name: "lighting", label: "Has floodlights" },
  ],
};
