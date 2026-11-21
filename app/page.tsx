import { Suspense } from "react";

import { ExploreShell } from "@/components/explore/explore-shell";
import { MapPlaceholder } from "@/components/explore/map-placeholder";

export default function HomePage() {
  return (
    // ExploreShell reads filters from the URL (useSearchParams), so it renders on the client.
    <Suspense
      fallback={
        <div className="relative h-dvh w-full">
          <h1 className="sr-only">Kape Negros: coffee shops on Negros Island</h1>
          <MapPlaceholder />
        </div>
      }
    >
      <ExploreShell />
    </Suspense>
  );
}
