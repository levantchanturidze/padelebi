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
  facilityNounKey: { singular: "facilityNoun.studio", plural: "facilityNoun.studios" },
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
    "PARKING", "SHOWERS", "LOCKER_ROOM", "CAFE",
    "EQUIPMENT_RENTAL", "WHEELCHAIR_ACCESS", "WIFI", "SAUNA", "WATER_FOUNTAIN",
  ],
  attributesSchema,
  summary(a) {
    const equipment: string[] = [];
    if (a.hasFreeWeights) equipment.push("sportAttrs.gym.freeWeightsShort");
    if (a.hasMachines) equipment.push("sportAttrs.gym.machinesShort");
    if (a.hasCardio) equipment.push("sportAttrs.gym.cardioShort");
    if (a.hasPersonalTrainer) equipment.push("sportAttrs.gym.personalTrainerShort");
    // For equipment we render translated values joined with · in the consumer.
    // We encode the joined-keys path as a comma-separated list of keys for the renderer.
    const out: { labelKey: string; valueKey: string }[] = [];
    if (a.areaSqm > 0) {
      // valueKey here is a literal number string; renderer treats keys with leading "@" as literals.
      out.push({ labelKey: "sportAttrs.gym.area", valueKey: `@${a.areaSqm} m²` });
    }
    if (equipment.length) {
      out.push({ labelKey: "sportAttrs.gym.equipment", valueKey: `#${equipment.join(",")}` });
    }
    return out;
  },
  formFields: [
    { kind: "number", name: "areaSqm", labelKey: "sportAttrs.gym.areaSqm", min: 0, max: 100000, suffix: "m²" },
    { kind: "boolean", name: "hasFreeWeights", labelKey: "sportAttrs.gym.hasFreeWeights" },
    { kind: "boolean", name: "hasMachines", labelKey: "sportAttrs.gym.hasMachines" },
    { kind: "boolean", name: "hasCardio", labelKey: "sportAttrs.gym.hasCardio" },
    { kind: "boolean", name: "hasPersonalTrainer", labelKey: "sportAttrs.gym.hasPersonalTrainer" },
  ],
};
