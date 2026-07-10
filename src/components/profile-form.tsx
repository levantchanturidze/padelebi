"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Navigation, Loader2, MapPinOff, MapPin } from "lucide-react";
import { updateProfileAction, type ProfileState } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { SKILL_LABELS, SKILL_LEVELS } from "@/lib/enums";

/**
 * Profile form. The "Home base" section captures a free-text address plus an
 * optional (lat, lng) pair. The coords are set by the browser's geolocation
 * API when the user taps "Use current location"; they aren't derived from
 * the address string (we don't run server-side geocoding).
 */
export function ProfileForm({
  defaults,
}: {
  defaults: {
    name: string;
    phone: string;
    skillLevel: string;
    homeAddress: string;
    homeLat: string;
    homeLng: string;
  };
}) {
  const t = useTranslations("profile");
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfileAction, undefined);

  // Live coord state — the form serialises whatever's in these two hidden
  // inputs when the user hits Save.
  const [lat, setLat] = useState(defaults.homeLat);
  const [lng, setLng] = useState(defaults.homeLng);
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "denied">("idle");

  function captureLocation() {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setGeoStatus("denied");
      return;
    }
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setGeoStatus("idle");
      },
      () => setGeoStatus("denied"),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  }

  function clearLocation() {
    setLat("");
    setLng("");
  }

  const hasCoords = lat && lng;

  return (
    <form action={action} className="max-w-md space-y-4">
      {state?.error && (
        <p className="rounded-[var(--radius-md)] bg-red-50 px-3 py-2 text-sm text-danger">{state.error}</p>
      )}
      {state?.success && (
        <p className="rounded-[var(--radius-md)] bg-brand-50 px-3 py-2 text-sm text-foreground">{state.success}</p>
      )}

      <div>
        <Label htmlFor="name">{t("fullName")}</Label>
        <Input id="name" name="name" defaultValue={defaults.name} required />
      </div>
      <div>
        <Label htmlFor="phone">{t("phone")}</Label>
        <Input id="phone" name="phone" defaultValue={defaults.phone} placeholder="+995 …" />
      </div>
      <div>
        <Label htmlFor="skillLevel">{t("skillLevel")}</Label>
        <Select id="skillLevel" name="skillLevel" defaultValue={defaults.skillLevel}>
          <option value="">{t("preferNotToSay")}</option>
          {SKILL_LEVELS.map((s) => (
            <option key={s} value={s}>{SKILL_LABELS[s]}</option>
          ))}
        </Select>
      </div>

      {/* Home base */}
      <div className="rounded-[var(--radius-md)] border border-border bg-background p-4 space-y-3">
        <div>
          <Label htmlFor="homeAddress">{t("homeBase")}</Label>
          <p className="mt-0.5 text-xs text-muted">{t("homeBaseDesc")}</p>
        </div>
        <Input
          id="homeAddress"
          name="homeAddress"
          defaultValue={defaults.homeAddress}
          placeholder={t("homeAddressPlaceholder")}
        />

        <input type="hidden" name="homeLat" value={lat} />
        <input type="hidden" name="homeLng" value={lng} />

        <div className="flex flex-wrap items-center gap-2">
          {geoStatus === "loading" ? (
            <span className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-surface px-3 text-sm font-semibold text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t("locating")}
            </span>
          ) : hasCoords ? (
            <>
              <span className="inline-flex h-9 items-center gap-2 rounded-full border border-brand-500 bg-brand-50 px-3 text-sm font-semibold text-foreground">
                <MapPin className="h-3.5 w-3.5 text-brand-700" />
                {Number(lat).toFixed(3)}, {Number(lng).toFixed(3)}
              </span>
              <button
                type="button"
                onClick={clearLocation}
                className="text-xs text-muted hover:text-foreground underline"
              >
                {t("clearLocation")}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={captureLocation}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-cobalt-200 bg-cobalt-50 px-3.5 text-sm font-semibold text-cobalt-700 transition-colors hover:bg-cobalt-100"
            >
              <Navigation className="h-3.5 w-3.5" />
              {t("useCurrentLocation")}
            </button>
          )}

          {geoStatus === "denied" && (
            <span className="inline-flex items-center gap-1 text-xs text-danger">
              <MapPinOff className="h-3 w-3" />
              {t("locationDenied")}
            </span>
          )}
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? t("saving") : t("saveChanges")}
      </Button>
    </form>
  );
}
