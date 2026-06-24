import type { z } from "zod";
import type { Amenity } from "@/lib/enums";

export type BookingModel = "TIME_SLOT" | "CLASS" | "DROP_IN";

export type SportAdapter<TAttributes = Record<string, unknown>> = {
  slug: string;

  /** Translation keys for the bookable resource noun (court, pitch, lane, …). */
  facilityNounKey: {
    singular: string;
    plural: string;
  };

  defaults: {
    slotMinutes: 60 | 90 | 120;
    pricePerHourGEL: number;
    bookingModel: BookingModel;
    capacity: number;
    attributes: TAttributes;
  };

  allowedAmenities: readonly Amenity[];

  attributesSchema: z.ZodType<TAttributes>;

  /**
   * Summary chips for facility detail pages — returns translation keys so the
   * consumer surface can render them in either language.
   */
  summary(attributes: TAttributes): { labelKey: string; valueKey: string }[];

  /** Per-sport manager form fields, with translation keys for all labels. */
  formFields: ReadonlyArray<AttributeField>;
};

export type AttributeField =
  | { kind: "select"; name: string; labelKey: string; options: { value: string; labelKey: string }[] }
  | { kind: "boolean"; name: string; labelKey: string }
  | { kind: "number"; name: string; labelKey: string; min?: number; max?: number; step?: number; suffix?: string }
  | { kind: "text"; name: string; labelKey: string; placeholderKey?: string };

export type AnySportAdapter = SportAdapter<Record<string, unknown>>;
