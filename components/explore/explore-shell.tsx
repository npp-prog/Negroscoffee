"use client";

import { useState } from "react";
import Link from "next/link";
import { Info, LocateFixed, Plus } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { BottomSheet, type SheetSnap } from "@/components/explore/bottom-sheet";
import { EMPTY_FILTERS, FilterChips, type ExploreFilters } from "@/components/explore/filter-chips";
import { MapPlaceholder } from "@/components/explore/map-placeholder";
import { ResultsEmpty } from "@/components/explore/results-list";
import { SearchBar } from "@/components/explore/search-bar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

/**
 * Map-first layout.
 * Mobile: full-screen map, floating glass search + chips, draggable bottom sheet.
 * Desktop (lg): 400px left panel with search, filters and list; map fills the rest.
 */
export function ExploreShell() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<ExploreFilters>(EMPTY_FILTERS);
  const [snap, setSnap] = useState<SheetSnap>("peek");
  const hasFilters =
    query !== "" || filters.openNow || filters.tiers.length > 0 || filters.types.length > 0;

  const results = (
    <ResultsEmpty
      title="Shops are still brewing"
      body="The map of Negros coffee shops is on its way. Know a great spot?"
      action={
        <Button asChild variant="crema" size="sm">
          <Link href="/suggest">
            <Plus /> Suggest a shop
          </Link>
        </Button>
      }
    />
  );

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      {/* Map layer */}
      <main
        className="absolute inset-0 lg:left-[400px]"
        aria-label="Map of coffee shops on Negros Island"
      >
        <MapPlaceholder />
      </main>

      {/* Desktop side panel */}
      <aside className="absolute inset-y-0 left-0 z-10 hidden w-[400px] flex-col border-r bg-background lg:flex">
        <header className="flex items-center justify-between gap-2 px-5 pt-5 pb-3">
          <Link href="/" aria-label="Kape Negros home" className="rounded-lg">
            <Logo />
          </Link>
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="icon" aria-label="About Kape Negros">
              <Link href="/about">
                <Info />
              </Link>
            </Button>
            <ThemeToggle variant="ghost" />
          </div>
        </header>
        <div className="flex flex-col gap-3 px-5 pb-4">
          <SearchBar value={query} onChange={setQuery} className="border bg-surface shadow-soft" />
          <FilterChips filters={filters} onChange={setFilters} wrap />
          {hasFilters && (
            <button
              type="button"
              className="self-start text-[13px] font-medium text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => {
                setQuery("");
                setFilters(EMPTY_FILTERS);
              }}
            >
              Clear all
            </button>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto border-t px-5 py-4">{results}</div>
      </aside>

      {/* Mobile floating top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col gap-2.5 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] lg:hidden">
        <div className="pointer-events-auto flex items-center gap-2">
          <SearchBar value={query} onChange={setQuery} className="flex-1 glass shadow-float" />
          <ThemeToggle />
        </div>
        <div className="pointer-events-auto">
          <FilterChips filters={filters} onChange={setFilters} />
        </div>
      </div>

      {/* Map controls */}
      <div className="absolute right-4 bottom-[172px] z-10 flex flex-col gap-2 lg:right-6 lg:bottom-6">
        <Button variant="glass" size="icon" aria-label="Show coffee shops near me">
          <LocateFixed />
        </Button>
      </div>

      {/* Mobile bottom sheet */}
      <BottomSheet
        snap={snap}
        onSnapChange={setSnap}
        header={
          <div className="flex items-baseline justify-between pt-1 pb-3">
            <h2 className="text-lg font-semibold">Coffee on Negros</h2>
            <Link
              href="/about"
              className="text-[13px] font-medium text-muted-foreground hover:text-foreground"
            >
              About
            </Link>
          </div>
        }
      >
        {results}
      </BottomSheet>
    </div>
  );
}
