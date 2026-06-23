import { z } from "zod";
import type { SportAdapter } from "./types";

const attributesSchema = z.object({
  areaSqm: z.number().int().min(0).max(100000).default(0),
  hasFreeWeights: z.boolean().default(true),
  hasMachines: z.boolean().default(true),
  hasCardio: z.boolean().default(true),
  hasPersonalTrainer: z.boolean().default(false),
});

type GymAttributes = z.infer<typeof attributesSchema>;

export const gymAdapter: SportAdapter<GymAttributes> = {
  slug: "gym",
  facilityNoun: { singular: "studio", plural: "studios" },
  defaults: {
    slotMinutes: 60,
    pricePerHourGEL: 20,
    bookingModel: "DROP_IN",
    capacity: 100,
    attributes: {
      areaSqm: 0,
      hasFreeWeights: true,
      hasMachines: true,
      hasCardio: true,
      hasPersonalTrainer: false,
    },
  },
  allowedAmenities: [
    "PARKING",
    "SHOWERS",
    "LOCKER_ROOM",
    "CAFE",
    "EQUIPMENT_RENTAL",
    "WHEELCHAIR_ACCESS",
    "WIFI",
    "SAUNA",
    "WATER_FOUNTAIN",
  ],
  attributesSchema,
  summary(a) {
    const equipment = [
      a.hasFreeWeights ? "Free weights" : null,
      a.hasMachines ? "Machines" : null,
      a.hasCardio ? "Cardio" : null,
      a.hasPersonalTrainer ? "Personal trainer" : null,
    ].filter(Boolean) as string[];
    return [
      ...(a.areaSqm > 0 ? [{ label: "Area", value: `${a.areaSqm} m²` }] : []),
      ...(equipment.length ? [{ label: "Equipment", value: equipment.join(" · ") }] : []),
    ];
  },
  formFields: [
    { kind: "number", name: "areaSqm", label: "Floor area", min: 0, max: 100000, suffix: "m²" },
    { kind: "boolean", name: "hasFreeWeights", label: "Free weights" },
    { kind: "boolean", name: "hasMachines", label: "Resistance machines" },
    { kind: "boolean", name: "hasCardio", label: "Cardio equipment" },
    { kind: "boolean", name: "hasPersonalTrainer", label: "Personal trainer available" },
  ],
};
