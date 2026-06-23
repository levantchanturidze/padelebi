import { z } from "zod";
import type { SportAdapter } from "./types";

const PADEL_SURFACES = ["ARTIFICIAL_GRASS", "CONCRETE", "PANORAMIC"] as const;

const attributesSchema = z.object({
  surface: z.enum(PADEL_SURFACES).default("ARTIFICIAL_GRASS"),
  isPanoramic: z.boolean().default(false),
});

type PadelAttributes = z.infer<typeof attributesSchema>;

const SURFACE_LABELS: Record<(typeof PADEL_SURFACES)[number], string> = {
  ARTIFICIAL_GRASS: "Artificial grass",
  CONCRETE: "Concrete",
  PANORAMIC: "Panoramic glass",
};

export const padelAdapter: SportAdapter<PadelAttributes> = {
  slug: "padel",
  facilityNoun: { singular: "court", plural: "courts" },
  defaults: {
    slotMinutes: 90,
    pricePerHourGEL: 60,
    attributes: { surface: "ARTIFICIAL_GRASS", isPanoramic: false },
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
  ],
  attributesSchema,
  summary(a) {
    return [
      { label: "Surface", value: SURFACE_LABELS[a.surface] },
      ...(a.isPanoramic ? [{ label: "Panoramic", value: "Yes" }] : []),
    ];
  },
  formFields: [
    {
      kind: "select",
      name: "surface",
      label: "Surface",
      options: PADEL_SURFACES.map((s) => ({ value: s, label: SURFACE_LABELS[s] })),
    },
    { kind: "boolean", name: "isPanoramic", label: "Panoramic glass walls" },
  ],
};
