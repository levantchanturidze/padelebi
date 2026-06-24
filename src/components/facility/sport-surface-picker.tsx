"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Label, Select } from "@/components/ui/input";
import { surfacesForSport } from "@/lib/sports";

export type PickerSport = {
  id: string;
  slug: string;
  name: string;
};

/**
 * Renders the Sport + Surface dropdowns as a connected pair. Changing the
 * sport narrows the Surface options to the categories that actually apply
 * to that sport (per src/lib/sports/surfaces.ts).
 *
 * Both selects emit their values as plain form fields (`sportId` and
 * `surfaceCategory`) so the server action sees them exactly as if they
 * were plain server-rendered <Select>s.
 */
export function SportSurfacePicker({
  sports,
  defaultSportId,
  defaultSurface,
  sportLabel,
  surfaceLabel,
  anyLabel,
  surfaceLabels,
}: {
  sports: PickerSport[];
  defaultSportId: string;
  defaultSurface: string;
  sportLabel: string;
  surfaceLabel: string;
  anyLabel: string;
  surfaceLabels: Record<string, string>;
}) {
  const [sportId, setSportId] = useState(defaultSportId);
  const [surface, setSurface] = useState(defaultSurface);

  const currentSlug = useMemo(
    () => sports.find((s) => s.id === sportId)?.slug,
    [sports, sportId],
  );

  const allowed = useMemo(() => surfacesForSport(currentSlug), [currentSlug]);

  // If the previously-saved surface isn't valid for the new sport, drop it.
  const surfaceValue = useMemo(() => {
    if (!surface) return "";
    return (allowed as readonly string[]).includes(surface) ? surface : "";
  }, [surface, allowed]);

  return (
    <>
      <div>
        <Label>{sportLabel}</Label>
        <Select
          name="sportId"
          value={sportId}
          onChange={(e) => setSportId(e.target.value)}
        >
          {sports.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label>{surfaceLabel}</Label>
        <Select
          name="surfaceCategory"
          value={surfaceValue}
          onChange={(e) => setSurface(e.target.value)}
        >
          <option value="">{anyLabel}</option>
          {allowed.map((s) => (
            <option key={s} value={s}>{surfaceLabels[s] ?? s}</option>
          ))}
        </Select>
      </div>
    </>
  );
}
