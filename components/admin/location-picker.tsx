"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ClipboardPaste } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { parseLocationInput } from "@/lib/validation";

const LocationMap = dynamic(() => import("@/components/admin/location-map"), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-muted" />,
});

const hasMap = Boolean(process.env.NEXT_PUBLIC_MAPTILER_KEY);

export function LocationPicker({
  initial,
  errors,
}: {
  initial: { lat: number; lng: number };
  errors?: { lat?: string; lng?: string };
}) {
  const [point, setPoint] = useState(initial);
  const [paste, setPaste] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const round = (n: number) => Math.round(n * 1e6) / 1e6;
  const set = (p: { lat: number; lng: number }) =>
    setPoint({ lat: round(p.lat), lng: round(p.lng) });

  return (
    <div className="flex flex-col gap-3">
      {hasMap ? (
        <div className="h-72 overflow-hidden rounded-2xl border">
          <LocationMap lat={point.lat} lng={point.lng} onChange={set} />
        </div>
      ) : (
        <p className="rounded-xl border border-dashed p-3 text-[13px] text-muted-foreground">
          Add NEXT_PUBLIC_MAPTILER_KEY to drop the pin on a map. Coordinates work meanwhile.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Latitude
          <Input
            name="lat"
            inputMode="decimal"
            value={point.lat}
            onChange={(e) => setPoint((p) => ({ ...p, lat: Number(e.target.value) }))}
            aria-invalid={errors?.lat ? true : undefined}
            className="tabular"
          />
          {errors?.lat && <span className="text-[13px] text-destructive">{errors.lat}</span>}
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Longitude
          <Input
            name="lng"
            inputMode="decimal"
            value={point.lng}
            onChange={(e) => setPoint((p) => ({ ...p, lng: Number(e.target.value) }))}
            aria-invalid={errors?.lng ? true : undefined}
            className="tabular"
          />
          {errors?.lng && <span className="text-[13px] text-destructive">{errors.lng}</span>}
        </label>
      </div>
      <div className="flex gap-2">
        <Input
          aria-label="Paste a Google Maps link or coordinates"
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder="Paste a Google Maps link or “lat, lng”"
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          className="h-12"
          onClick={() => {
            const p = parseLocationInput(paste);
            if (p) {
              set(p);
              setPaste("");
              setPasteError(null);
            } else setPasteError("No coordinates on Negros found in that text.");
          }}
        >
          <ClipboardPaste /> Use
        </Button>
      </div>
      {pasteError && <p className="text-[13px] text-destructive">{pasteError}</p>}
    </div>
  );
}
