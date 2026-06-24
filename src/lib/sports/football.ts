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

export const footballAdapter: SportAdapter<FootballAttributes> = {
  slug: "football",
  facilityNounKey: { singular: "facilityNoun.pitch", plural: "facilityNoun.pitches" },
  defaults: {
    slotMinutes: 60,
    pricePerHourGEL: 80,
    bookingModel: "TIME_SLOT",
    capacity: 1,
    attributes: { pitchSize: "FIVE", grassType: "ARTIFICIAL", lighting: false },
  },
  allowedAmenities: [
    "PARKING", "SHOWERS", "LOCKER_ROOM", "CAFE",
    "EQUIPMENT_RENTAL", "LIGHTING", "WHEELCHAIR_ACCESS", "WIFI", "WATER_FOUNTAIN",
  ],
  attributesSchema,
  summary(a) {
    return [
      { labelKey: "sportAttrs.football.format", valueKey: `sportAttrs.football.pitchSizeOpts.${a.pitchSize}` },
      { labelKey: "sportAttrs.football.grassType", valueKey: `sportAttrs.football.grassTypeOpts.${a.grassType}` },
      ...(a.lighting ? [{ labelKey: "sportAttrs.football.floodlit", valueKey: "sportAttrs.yes" }] : []),
    ];
  },
  formFields: [
    {
      kind: "select",
      name: "pitchSize",
      labelKey: "sportAttrs.football.pitchSize",
      options: PITCH_SIZES.map((s) => ({ value: s, labelKey: `sportAttrs.football.pitchSizeOpts.${s}` })),
    },
    {
      kind: "select",
      name: "grassType",
      labelKey: "sportAttrs.football.grassType",
      options: GRASS_TYPES.map((s) => ({ value: s, labelKey: `sportAttrs.football.grassTypeOpts.${s}` })),
    },
    { kind: "boolean", name: "lighting", labelKey: "sportAttrs.football.lighting" },
  ],
};
