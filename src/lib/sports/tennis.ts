import { z } from "zod";
import type { SportAdapter } from "./types";

const TENNIS_SURFACES = ["CLAY", "HARD", "GRASS", "CARPET"] as const;

const attributesSchema = z.object({
  surface: z.enum(TENNIS_SURFACES).default("HARD"),
  lighting: z.boolean().default(false),
});

type TennisAttributes = z.infer<typeof attributesSchema>;

export const tennisAdapter: SportAdapter<TennisAttributes> = {
  slug: "tennis",
  facilityNounKey: { singular: "facilityNoun.court", plural: "facilityNoun.courts" },
  defaults: {
    slotMinutes: 60,
    pricePerHourGEL: 40,
    bookingModel: "TIME_SLOT",
    capacity: 1,
    attributes: { surface: "HARD", lighting: false },
  },
  allowedAmenities: [
    "PARKING", "SHOWERS", "LOCKER_ROOM", "PRO_SHOP", "CAFE",
    "BALL_RENTAL", "EQUIPMENT_RENTAL", "LIGHTING", "WHEELCHAIR_ACCESS", "WIFI", "WATER_FOUNTAIN",
  ],
  attributesSchema,
  summary(a) {
    return [
      { labelKey: "sportAttrs.tennis.surface", valueKey: `sportAttrs.tennis.surfaceOpts.${a.surface}` },
      ...(a.lighting ? [{ labelKey: "sportAttrs.tennis.floodlit", valueKey: "sportAttrs.yes" }] : []),
    ];
  },
  formFields: [
    {
      kind: "select",
      name: "surface",
      labelKey: "sportAttrs.tennis.surface",
      options: TENNIS_SURFACES.map((s) => ({ value: s, labelKey: `sportAttrs.tennis.surfaceOpts.${s}` })),
    },
    { kind: "boolean", name: "lighting", labelKey: "sportAttrs.tennis.lighting" },
  ],
};
