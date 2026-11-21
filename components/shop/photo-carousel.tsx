"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type CarouselPhoto = { id: string; src: string; alt: string };

/** Swipeable photo strip (CSS scroll-snap) with arrow buttons on larger screens. */
export function PhotoCarousel({
  photos,
  className,
}: {
  photos: CarouselPhoto[];
  className?: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const go = (to: number) => {
    const el = track.current;
    if (!el) return;
    const next = Math.max(0, Math.min(photos.length - 1, to));
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div
      className={cn("group relative", className)}
      aria-roledescription="carousel"
      aria-label="Shop photos"
    >
      <div
        ref={track}
        className="no-scrollbar flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto overscroll-x-contain rounded-[20px] motion-reduce:scroll-auto"
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
      >
        {photos.map((p, i) => (
          <figure
            key={p.id}
            className="aspect-[4/3] w-full shrink-0 snap-center sm:aspect-[16/9]"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${photos.length}`}
          >
            {/* Supabase image transforms do the resizing. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.src}
              alt={p.alt}
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : "auto"}
              className="size-full bg-muted object-cover"
            />
          </figure>
        ))}
      </div>
      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label="Previous photo"
            className="absolute top-1/2 left-3 hidden size-11 -translate-y-1/2 place-items-center rounded-full glass shadow-float transition-opacity disabled:opacity-0 sm:grid"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            disabled={index === photos.length - 1}
            aria-label="Next photo"
            className="absolute top-1/2 right-3 hidden size-11 -translate-y-1/2 place-items-center rounded-full glass shadow-float transition-opacity disabled:opacity-0 sm:grid"
          >
            <ChevronRight className="size-5" />
          </button>
          <div
            className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5"
            aria-hidden="true"
          >
            {photos.map((p, i) => (
              <span
                key={p.id}
                className={cn(
                  "h-1.5 rounded-full bg-white/90 shadow transition-all",
                  i === index ? "w-5" : "w-1.5 opacity-60",
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
