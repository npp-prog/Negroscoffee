/** Stand-in for the MapLibre map until milestone 3. Warm, quiet, and full-bleed. */
export function MapPlaceholder() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 bg-[#ECE4D8] dark:bg-[#1C1611]"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, color-mix(in oklab, var(--foreground) 12%, transparent) 1px, transparent 0)",
        backgroundSize: "22px 22px",
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_45%,transparent_30%,var(--background)_100%)] opacity-70" />
    </div>
  );
}
