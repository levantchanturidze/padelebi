"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export function PhotoGallery({ photos }: { photos: string[] }) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  const close = useCallback(() => setLightbox(null), []);
  const prev = useCallback(() => setLightbox((i) => (i! > 0 ? i! - 1 : photos.length - 1)), [photos.length]);
  const next = useCallback(() => setLightbox((i) => (i! < photos.length - 1 ? i! + 1 : 0)), [photos.length]);

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, close, prev, next]);

  if (photos.length === 0) {
    return <div className="h-56 bg-brand-100 sm:h-72" />;
  }

  const thumbnails = photos.slice(1, 5);
  const extra = photos.length > 5 ? photos.length - 5 : 0;

  return (
    <>
      <div className="relative">
        {/* Main hero */}
        <div
          className="h-56 cursor-pointer bg-brand-100 bg-cover bg-center sm:h-72"
          style={{ backgroundImage: `url(${photos[0]})` }}
          onClick={() => setLightbox(0)}
        />

        {/* Thumbnail strip — bottom-right of hero */}
        {thumbnails.length > 0 && (
          <div className="absolute bottom-3 right-3 flex gap-1.5">
            {thumbnails.map((url, i) => (
              <button
                key={url}
                type="button"
                onClick={() => setLightbox(i + 1)}
                className="h-14 w-14 shrink-0 overflow-hidden rounded border-2 border-white/80 shadow"
              >
                <Image src={url} alt="" width={56} height={56} className="h-full w-full object-cover" />
              </button>
            ))}
            {extra > 0 && (
              <button
                type="button"
                onClick={() => setLightbox(5)}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded border-2 border-white/80 bg-black/60 text-sm font-semibold text-white shadow"
              >
                +{extra}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={close}
        >
          {/* Close */}
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/70"
            onClick={close}
          >
            <X className="h-6 w-6" />
          </button>

          {/* Prev / Next */}
          {photos.length > 1 && (
            <>
              <button
                type="button"
                className="absolute left-3 rounded-full bg-black/40 p-2 text-white hover:bg-black/70"
                onClick={(e) => { e.stopPropagation(); prev(); }}
              >
                <ChevronLeft className="h-7 w-7" />
              </button>
              <button
                type="button"
                className="absolute right-3 rounded-full bg-black/40 p-2 text-white hover:bg-black/70"
                onClick={(e) => { e.stopPropagation(); next(); }}
              >
                <ChevronRight className="h-7 w-7" />
              </button>
            </>
          )}

          {/* Image */}
          <div
            className="relative mx-16 h-[80vh] w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={photos[lightbox]}
              alt=""
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 80vw"
            />
          </div>

          {/* Counter */}
          <span className="absolute bottom-4 text-sm text-white/70">
            {lightbox + 1} / {photos.length}
          </span>
        </div>
      )}
    </>
  );
}
