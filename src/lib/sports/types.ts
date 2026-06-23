import type { z } from "zod";
import type { Amenity } from "@/lib/enums";

/**
 * A SportAdapter is the single source of truth for everything that differs
 * between sports — what fields a facility exposes, which amenities make sense,
 * how the facility is described in copy, what the default booking duration is.
 *
 * UI code should never branch on `sport.slug` directly; it should ask the
 * adapter (`getAdapter(slug)`) for what to render.
 */
export type SportAdapter<TAttributes = Record<string, unknown>> = {
  /** Lower-case identifier matching Sport.slug in the DB. */
  slug: string;

  /** What this sport's bookable resource is called in the UI. */
  facilityNoun: {
    singular: string; // "court", "field", "lane", "studio"
    plural: string;
  };

  /** Defaults the manager form starts from when creating a new facility. */
  defaults: {
    slotMinutes: 60 | 90 | 120;
    pricePerHourGEL: number;
    attributes: TAttributes;
  };

  /** Which amenities are relevant to this sport — used to filter the form. */
  allowedAmenities: readonly Amenity[];

  /**
   * Zod schema for sport-specific attributes. Parsed on every write, so the
   * `attributes` JSON column is always well-formed for this sport.
   */
  attributesSchema: z.ZodType<TAttributes>;

  /**
   * Human-readable summary chips for a facility detail page. Returned as an
   * array of {label, value} pairs so the consumer surface can render them
   * uniformly (badges, lists, whatever).
   */
  summary(attributes: TAttributes): { label: string; value: string }[];

  /**
   * Server-rendered name/label dictionary for form fields. Components import
   * these to build the manager form per sport.
   */
  formFields: ReadonlyArray<AttributeField>;
};

/** A single editable attribute on the per-sport manager form. */
export type AttributeField =
  | { kind: "select"; name: string; label: string; options: { value: string; label: string }[] }
  | { kind: "boolean"; name: string; label: string }
  | { kind: "number"; name: string; label: string; min?: number; max?: number; step?: number; suffix?: string }
  | { kind: "text"; name: string; label: string; placeholder?: string };

/**
 * Loosely-typed adapter used at boundaries where TAttributes is opaque (e.g.
 * the registry, runtime lookups by slug).
 */
export type AnySportAdapter = SportAdapter<Record<string, unknown>>;
