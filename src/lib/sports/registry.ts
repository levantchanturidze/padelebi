import { padelAdapter } from "./padel";
import { tennisAdapter } from "./tennis";
import { footballAdapter } from "./football";
import { gymAdapter } from "./gym";
import { defaultAdapter } from "./default";
import type { AnySportAdapter } from "./types";

/**
 * Sports with bespoke adapters. Every other Sport row in the DB falls through
 * to `defaultAdapter`, so Playtora can onboard new sports without code changes.
 */
const ADAPTERS: Record<string, AnySportAdapter> = {
  padel: padelAdapter as AnySportAdapter,
  tennis: tennisAdapter as AnySportAdapter,
  football: footballAdapter as AnySportAdapter,
  gym: gymAdapter as AnySportAdapter,
};

/** Resolve a sport slug to its adapter, falling back to the default. */
export function getAdapter(slug: string | null | undefined): AnySportAdapter {
  if (!slug) return defaultAdapter;
  return ADAPTERS[slug] ?? defaultAdapter;
}

/** All sport slugs that currently ship with a bespoke adapter. */
export const ADAPTED_SPORT_SLUGS = Object.keys(ADAPTERS);

/**
 * Parse a facility's stored attributes JSON via its adapter, returning an
 * empty object on parse failure rather than throwing.
 */
export function parseAttributes(slug: string | null | undefined, raw: string): Record<string, unknown> {
  const adapter = getAdapter(slug);
  try {
    const parsed = JSON.parse(raw || "{}");
    const result = adapter.attributesSchema.safeParse(parsed);
    return result.success ? (result.data as Record<string, unknown>) : adapter.defaults.attributes;
  } catch {
    return adapter.defaults.attributes;
  }
}
