import { z } from "zod";
import { AMENITIES } from "@/lib/enums";
import type { SportAdapter } from "./types";

const attributesSchema = z
  .object({
    notes: z.string().max(200).optional(),
  })
  .passthrough();

type DefaultAttributes = z.infer<typeof attributesSchema>;

export const defaultAdapter: SportAdapter<DefaultAttributes> = {
  slug: "default",
  facilityNounKey: { singular: "facilityNoun.facility", plural: "facilityNoun.facilities" },
  defaults: {
    slotMinutes: 60,
    pricePerHourGEL: 30,
    bookingModel: "TIME_SLOT",
    capacity: 1,
    attributes: {},
  },
  allowedAmenities: AMENITIES,
  attributesSchema,
  summary(a) {
    return a.notes ? [{ labelKey: "sportAttrs.default.notes", valueKey: `@${a.notes}` }] : [];
  },
  formFields: [
    {
      kind: "text",
      name: "notes",
      labelKey: "sportAttrs.default.notes",
      placeholderKey: "sportAttrs.default.notesPlaceholder",
    },
  ],
};
