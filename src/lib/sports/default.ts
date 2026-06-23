import { z } from "zod";
import { AMENITIES } from "@/lib/enums";
import type { SportAdapter } from "./types";

const attributesSchema = z
  .object({
    notes: z.string().max(200).optional(),
  })
  .passthrough();

type DefaultAttributes = z.infer<typeof attributesSchema>;

/**
 * Used for any sport that doesn't have its own adapter yet. Keeps the platform
 * working end-to-end (add a new Sport row, get a working facility form) even
 * before we write a bespoke adapter for it.
 */
export const defaultAdapter: SportAdapter<DefaultAttributes> = {
  slug: "default",
  facilityNoun: { singular: "facility", plural: "facilities" },
  defaults: {
    slotMinutes: 60,
    pricePerHourGEL: 30,
    attributes: {},
  },
  allowedAmenities: AMENITIES,
  attributesSchema,
  summary(a) {
    return a.notes ? [{ label: "Notes", value: a.notes }] : [];
  },
  formFields: [
    { kind: "text", name: "notes", label: "Notes", placeholder: "Anything players should know" },
  ],
};
