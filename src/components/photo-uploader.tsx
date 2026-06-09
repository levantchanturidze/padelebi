"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { updateClubPhotosAction, updateCourtPhotosAction } from "@/app/actions/club";

type Props =
  | { kind: "club"; entityId: string; initial: string[] }
  | { kind: "court"; entityId: string; initial: string[] };

export function PhotoUploader({ kind, entityId, initial }: Props) {
  const t = useTranslations("photos");
  const [photos, setPhotos] = useState<string[]>(initial);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? t("uploadError")); setUploading(false); return; }
      uploaded.push(json.url);
    }
    const next = [...photos, ...uploaded];
    setPhotos(next);
    save(next);
    setUploading(false);
  }

  function remove(url: string) {
    const next = photos.filter((p) => p !== url);
    setPhotos(next);
    save(next);
  }

  function save(list: string[]) {
    const fd = new FormData();
    fd.append(kind === "club" ? "clubId" : "courtId", entityId);
    fd.append("photos", JSON.stringify(list));
    startSave(() => {
      if (kind === "club") updateClubPhotosAction(fd);
      else updateCourtPhotosAction(fd);
    });
  }

  return (
    <div className="space-y-3">
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {photos.map((url) => (
            <div key={url} className="group relative h-24 w-24 overflow-hidden rounded-[var(--radius-md)] border border-border">
              <Image src={url} alt="" fill className="object-cover" sizes="96px" />
              <button
                type="button"
                onClick={() => remove(url)}
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 text-white text-xs font-medium"
              >
                {t("remove")}
              </button>
            </div>
          ))}
        </div>
      )}

      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || saving}
          className="rounded-[var(--radius-md)] border border-dashed border-border bg-background px-4 py-3 text-sm text-muted hover:border-brand-400 hover:text-foreground transition-colors disabled:opacity-50"
        >
          {uploading ? t("uploading") : t("addPhotos")}
        </button>
        {saving && !uploading && <span className="ml-3 text-xs text-muted">{t("saving")}</span>}
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    </div>
  );
}
