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

  function setCover(url: string) {
    const next = [url, ...photos.filter((p) => p !== url)];
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
          {photos.map((url, i) => (
            <div key={url} className="group relative h-24 w-24 overflow-hidden rounded-[var(--radius-md)] border border-border">
              <Image src={url} alt="" fill className="object-cover" sizes="96px" />
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded bg-brand-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {t("cover")}
                </span>
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
                {i !== 0 && (
                  <button
                    type="button"
                    onClick={() => setCover(url)}
                    className="text-[11px] font-semibold text-white hover:underline"
                  >
                    {t("setCover")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(url)}
                  className="text-[11px] font-medium text-white/80 hover:underline"
                >
                  {t("remove")}
                </button>
              </div>
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
