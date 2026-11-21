"use client";

import { useState } from "react";
import { LoaderCircle, LocateFixed } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { NEGROS_BBOX } from "@/lib/db";
import type { LatLng } from "@/lib/geo";
import { cn } from "@/lib/utils";

const MARGIN = 0.3; // degrees around the island that still count as "on Negros"

function onNegros({ lat, lng }: LatLng) {
  return (
    lat >= NEGROS_BBOX.minLat - MARGIN &&
    lat <= NEGROS_BBOX.maxLat + MARGIN &&
    lng >= NEGROS_BBOX.minLng - MARGIN &&
    lng <= NEGROS_BBOX.maxLng + MARGIN
  );
}

export function NearMeButton({
  active,
  onLocate,
  className,
}: {
  active: boolean;
  onLocate: (location: LatLng) => void;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);

  function locate() {
    if (!("geolocation" in navigator)) {
      toast.error("Your browser can't share your location.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (!onNegros(loc)) {
          toast("You seem to be outside Negros", {
            description: "Shops are sorted by distance from the map center instead.",
          });
          return;
        }
        onLocate(loc);
      },
      (err) => {
        setBusy(false);
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? "Location permission is off. Allow it in your browser to find shops near you."
            : "Couldn't get your location. Try again in a moment.",
        );
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  return (
    <Button
      variant="glass"
      size="icon"
      onClick={locate}
      disabled={busy}
      aria-label="Show coffee shops near me"
      aria-pressed={active}
      className={cn(active && "text-sky-600 dark:text-sky-400", className)}
    >
      {busy ? <LoaderCircle className="animate-spin" /> : <LocateFixed />}
    </Button>
  );
}
