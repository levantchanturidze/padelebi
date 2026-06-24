import { z } from "zod";
import type { SportAdapter } from "./types";

const PADEL_SURFACES = ["ARTIFICIAL_GRASS", "CONCRETE", "PANORAMIC"] as const;

const attributesSchema = z.object({
  surface: z.enum(PADEL_SURFACES).default("ARTIFICIAL_GRASS"),
  isPanoramic: z.boolean().default(false),
});

type PadelAttributes = z.infer<typeof attributesSchema>;

export const padelAdapter: SportAdapter<PadelAttributes> = {
  slug: "padel",
  facilityNounKey: { singular: "facilityNoun.court", plural: "facilityNoun.courts" },
  defaults: {
    slotMinutes: 90,
    pricePerHourGEL: 60,
    bookingModel: "TIME_SLOT",
    capacity: 1,
    attributes: { surface: "ARTIFICIAL_GRASS", isPanoramic: false },
  },
  allowedAmenities: [
    "PARKING", "SHOWERS", "LOCKER_ROOM", "PRO_SHOP", "CAFE",
    "BALL_RENTAL", "EQUIPMENT_RENTAL", "LIGHTING", "WHEELCHAIR_ACCESS", "WIFI",
  ],
  attributesSchema,
  summary(a) {
    return [
      { labelKey: "sportAttrs.padel.surface", valueKey: `sportAttrs.padel.surfaceOpts.${a.surface}` },
      ...(a.isPanoramic ? [{ labelKey: "sportAttrs.padel.panoramic", valueKey: "sportAttrs.yes" }] : []),
    ];
  },
  formFields: [
    {
      kind: "select",
      name: "surface",
      labelKey: "sportAttrs.padel.surface",
      options: PADEL_SURFACES.map((s) => ({ value: s, labelKey: `sportAttrs.padel.surfaceOpts.${s}` })),
    },
    { kind: "boolean", name: "isPanoramic", labelKey: "sportAttrs.padel.isPanoramic" },
  ],
};
