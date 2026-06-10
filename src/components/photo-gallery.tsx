"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export function PhotoGallery({ photos }: { photos: string[] }) {
  const [lightbox, setLightbox] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);

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

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return; // too short — treat as tap → close
    if (dx < 0) next(); else prev();
  }

  if (photos.length === 0) {
    return <div className="h-56 bg-brand-100 sm:h-72" />;
  }

  return (
    <>
      <div>
        {/* Main hero */}
        <div
          className="h-56 cursor-pointer bg-brand-100 bg-cover bg-center sm:h-72"
          style={{ backgroundImage: `url(${photos[0]})` }}
          onClick={() => setLightbox(0)}
        />

        {/* Thumbnail strip — horizontal scroll, visible on all screen sizes */}
        {photos.length > 1 && (
          <div className="flex gap-2 overflow-x-auto bg-surface px-3 py-2 scrollbar-none">
            {photos.map((url, i) => (
              <button
                key={url}
                type="button"
                onClick={() => setLightbox(i)}
                className={[
                  "h-16 w-16 shrink-0 overflow-hidden rounded border-2 transition-opacity",
                  i === 0 ? "border-brand-500" : "border-transparent hover:border-brand-300",
                ].join(" ")}
              >
                <Image src={url} alt="" width={64} height={64} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={close}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* Close */}
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/70"
            onClick={close}
          >
            <X className="h-6 w-6" />
          </button>

          {/* Prev / Next — hidden on mobile, use swipe instead */}
          {photos.length > 1 && (
            <>
              <button
                type="button"
                className="absolute left-3 hidden rounded-full bg-black/40 p-2 text-white hover:bg-black/70 md:block"
                onClick={(e) => { e.stopPropagation(); prev(); }}
              >
                <ChevronLeft className="h-7 w-7" />
              </button>
              <button
                type="button"
                className="absolute right-3 hidden rounded-full bg-black/40 p-2 text-white hover:bg-black/70 md:block"
                onClick={(e) => { e.stopPropagation(); next(); }}
              >
                <ChevronRight className="h-7 w-7" />
              </button>
            </>
          )}

          {/* Image */}
          <div
            className="relative h-[80vh] w-full max-w-4xl px-4 md:mx-16 md:px-0"
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
