"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Info, MapPinOff, Plus, X } from "lucide-react";
import { useReducedMotion } from "motion/react";
import type { MapRef } from "react-map-gl/maplibre";

import { Logo } from "@/components/brand/logo";
import { BottomSheet, type SheetSnap } from "@/components/explore/bottom-sheet";
import { FilterChips } from "@/components/explore/filter-chips";
import { MapPlaceholder } from "@/components/explore/map-placeholder";
import { ResultsEmpty, ResultsSkeleton } from "@/components/explore/results-list";
import { SearchBar } from "@/components/explore/search-bar";
import { ShopCard } from "@/components/explore/shop-card";
import type { MapViewport } from "@/components/map/map-view";
import { NearMeButton } from "@/components/map/near-me-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useExploreState } from "@/hooks/use-explore-state";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useNow } from "@/hooks/use-now";
import { useShopBySlug, useShops } from "@/hooks/use-shops";
import type { ShopCard as Shop } from "@/lib/db";
import { hasSupabaseEnv } from "@/lib/env";
import { EMPTY_FILTERS, hasActiveFilters } from "@/lib/filters";
import { distanceM, type LatLng } from "@/lib/geo";
import { isOpenAt } from "@/lib/hours";

const MapView = dynamic(() => import("@/components/map/map-view"), {
  ssr: false,
  loading: () => <MapPlaceholder />,
});

const hasMapKey = Boolean(process.env.NEXT_PUBLIC_MAPTILER_KEY);
const MOBILE_TOP = 120; // floating search + chips
const MOBILE_PEEK = 160; // visible bottom sheet at "peek" (+ a little air)

/**
 * Map-first layout.
 * Mobile: full-screen map, floating glass search + chips, draggable bottom sheet.
 * Desktop (lg): 400px left panel with search, filters and list; map fills the rest.
 * All filters and the selected shop live in the URL.
 */
export function ExploreShell() {
  const [state, update] = useExploreState();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const reduceMotion = useReducedMotion();
  const now = useNow();
  const mapRef = useRef<MapRef>(null);

  const [snap, setSnap] = useState<SheetSnap>("peek");
  const [viewport, setViewport] = useState<MapViewport | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);

  // Debounce what drives fetching; the inputs themselves update instantly.
  const fetchView = useDebouncedValue(viewport, 250);
  const q = useDebouncedValue(state.q, 250);
  const shopsQuery = useShops(fetchView?.bbox ?? null, {
    q,
    types: state.types,
    tiers: state.tiers,
    city: state.city,
  });
  const islandWide = q.trim() !== "" || !!state.city;
  const fetched = shopsQuery.data;

  // Pins: everything fetched that passes the client-side open-now filter.
  const pins = useMemo(
    () => (fetched ?? []).filter((s) => !state.openNow || isOpenAt(s.hours, now)),
    [fetched, state.openNow, now],
  );

  // List: shops in the visible map area (or every match when searching), nearest first.
  const origin = userLocation ?? viewport?.center ?? null;
  const list = useMemo(() => {
    const b = viewport?.bbox;
    const inView =
      islandWide || !b
        ? pins
        : pins.filter(
            (s) => s.lng >= b.minLng && s.lng <= b.maxLng && s.lat >= b.minLat && s.lat <= b.maxLat,
          );
    const withDistance = inView.map((shop) => ({ shop, d: origin ? distanceM(origin, shop) : 0 }));
    return withDistance.sort((a, b) => a.d - b.d || a.shop.name.localeCompare(b.shop.name));
  }, [pins, viewport, islandWide, origin]);

  const selected = useShopBySlug(state.shop, fetched);

  // --- camera -------------------------------------------------------------------------------
  const flyTo = useCallback(
    (point: LatLng, minZoom = 15) => {
      const map = mapRef.current;
      if (!map) return;
      const zoom = Math.max(map.getZoom(), minZoom);
      if (reduceMotion) map.jumpTo({ center: [point.lng, point.lat], zoom });
      else map.flyTo({ center: [point.lng, point.lat], zoom, duration: 900, essential: true });
    },
    [reduceMotion],
  );

  // Deep link (?shop=…): fly to the shop once it has loaded.
  const initialSlug = useRef(state.shop);
  useEffect(() => {
    if (selected && selected.slug === initialSlug.current && viewport) {
      initialSlug.current = null;
      flyTo(selected);
    }
  }, [selected, viewport, flyTo]);

  const mapReady = viewport !== null;
  // New search: fit the map to the matches once they arrive.
  const fittedFor = useRef("");
  useEffect(() => {
    const key = islandWide ? `${q}|${state.city ?? ""}|${state.types}|${state.tiers}` : "";
    if (!key || shopsQuery.isPlaceholderData || !fetched || fittedFor.current === key) return;
    const map = mapRef.current;
    if (!map || !mapReady) return; // retry once the map has loaded
    fittedFor.current = key;
    if (fetched.length === 0) return;
    if (fetched.length === 1) return flyTo(fetched[0]);
    const lngs = fetched.map((s) => s.lng);
    const lats = fetched.map((s) => s.lat);
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 48, maxZoom: 15, duration: reduceMotion ? 0 : 700 },
    );
  }, [
    islandWide,
    q,
    state.city,
    state.types,
    state.tiers,
    fetched,
    shopsQuery.isPlaceholderData,
    mapReady,
    flyTo,
    reduceMotion,
  ]);

  // --- selection ----------------------------------------------------------------------------
  const selectFromMap = useCallback(
    (shop: Shop) => {
      if (state.shop === shop.slug) return update({ shop: null });
      update({ shop: shop.slug }, { history: "push" });
      setSnap("peek");
    },
    [state.shop, update],
  );

  const selectFromList = useCallback(
    (shop: Shop) => {
      update({ shop: shop.slug }, { history: "push" });
      setSnap("peek");
      flyTo(shop);
    },
    [update, flyTo],
  );

  const deselect = useCallback(() => {
    if (state.shop) update({ shop: null });
  }, [state.shop, update]);

  // Keep the selected card in view in the list.
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!state.shop) return;
    const el = listRef.current?.querySelector(`[data-shop-slug="${state.shop}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
  }, [state.shop, reduceMotion, isDesktop]);

  const locate = useCallback(
    (loc: LatLng) => {
      setUserLocation(loc);
      flyTo(loc, 14);
    },
    [flyTo],
  );

  // --- render -------------------------------------------------------------------------------
  const filtersActive = hasActiveFilters(state);
  const clearAll = () => update({ ...EMPTY_FILTERS });

  const countLabel = !fetched
    ? "Coffee on Negros"
    : islandWide
      ? `${list.length} ${list.length === 1 ? "match" : "matches"}`
      : `${list.length} ${list.length === 1 ? "shop" : "shops"} in view`;

  const results = (() => {
    if (!hasSupabaseEnv()) {
      return (
        <ResultsEmpty
          title="Not connected yet"
          body="Add your Supabase URL and anon key to .env.local to load coffee shops."
        />
      );
    }
    if (shopsQuery.isError && !fetched) {
      return (
        <ResultsEmpty
          title="Couldn't load shops"
          body="Check your connection and try again."
          action={
            <div className="flex flex-col items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => shopsQuery.refetch()}>
                Try again
              </Button>
              {shopsQuery.error?.message && (
                <p className="max-w-xs font-mono text-[11px] break-words text-muted-foreground">
                  Details: {shopsQuery.error.message}
                </p>
              )}
            </div>
          }
        />
      );
    }
    if (!fetched) return <ResultsSkeleton />;
    if (list.length === 0) {
      return filtersActive ? (
        <ResultsEmpty
          title="No shops match"
          body="Try removing a filter, or zoom out to see more of Negros."
          action={
            <Button variant="outline" size="sm" onClick={clearAll}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <ResultsEmpty
          title="No shops here yet"
          body="Move the map or zoom out. Know a great spot around here?"
          action={
            <Button asChild variant="crema" size="sm">
              <Link href="/suggest">
                <Plus /> Suggest a shop
              </Link>
            </Button>
          }
        />
      );
    }
    return (
      <ul className="flex flex-col gap-2.5" aria-label="Coffee shops">
        {list.map(({ shop, d }) => (
          <li key={shop.id}>
            <ShopCard
              shop={shop}
              now={now}
              selected={shop.slug === state.shop}
              highlighted={shop.id === hoveredId}
              distanceM={userLocation ? d : undefined}
              onSelect={selectFromList}
              onHover={setHoveredId}
            />
          </li>
        ))}
      </ul>
    );
  })();

  const chips = { tiers: state.tiers, types: state.types, openNow: state.openNow };
  const padding = isDesktop
    ? { top: 24, bottom: 24, left: 24, right: 24 }
    : { top: MOBILE_TOP, bottom: MOBILE_PEEK, left: 16, right: 16 };

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <h1 className="sr-only">Kape Negros: coffee shops on Negros Island</h1>

      {/* Map layer */}
      <main
        className="kape-map absolute inset-0 lg:left-[400px]"
        aria-label="Map of coffee shops on Negros Island"
      >
        {hasMapKey ? (
          <MapView
            mapRef={mapRef}
            shops={pins}
            selected={selected}
            highlightedId={hoveredId}
            userLocation={userLocation}
            padding={padding}
            attributionPosition={isDesktop ? "bottom-left" : "top-left"}
            onSelect={selectFromMap}
            onHover={setHoveredId}
            onViewportChange={setViewport}
            onBackgroundClick={deselect}
          />
        ) : (
          <>
            <MapPlaceholder />
            <p className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full glass px-4 py-2 text-[13px] text-muted-foreground shadow-float max-lg:top-[38%]">
              <MapPinOff className="size-4" aria-hidden="true" />
              Map needs NEXT_PUBLIC_MAPTILER_KEY
            </p>
          </>
        )}
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
          <SearchBar
            value={state.q}
            onChange={(value) => update({ q: value })}
            className="border bg-surface shadow-soft"
          />
          <FilterChips filters={chips} onChange={update} wrap />
        </div>
        <div className="flex items-baseline justify-between border-t px-5 pt-3 pb-1">
          <h2 className="text-[13px] font-medium text-muted-foreground" aria-live="polite">
            {countLabel}
          </h2>
          {filtersActive && (
            <button
              type="button"
              className="text-[13px] font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              onClick={clearAll}
            >
              Clear all
            </button>
          )}
        </div>
        {isDesktop && (
          <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-5 pt-2 pb-5">
            {results}
          </div>
        )}
      </aside>

      {/* Mobile floating top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col gap-2.5 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] lg:hidden">
        <div className="pointer-events-auto flex items-center gap-2">
          <SearchBar
            value={state.q}
            onChange={(value) => update({ q: value })}
            className="flex-1 glass shadow-float"
          />
          <ThemeToggle />
        </div>
        <div className="pointer-events-auto">
          <FilterChips filters={chips} onChange={update} />
        </div>
      </div>

      {/* Map controls */}
      <div className="absolute right-4 bottom-[176px] z-10 flex flex-col gap-2 lg:right-6 lg:bottom-6">
        <NearMeButton active={!!userLocation} onLocate={locate} />
      </div>

      {/* Mobile bottom sheet */}
      {!isDesktop && (
        <BottomSheet
          snap={snap}
          onSnapChange={setSnap}
          header={
            selected && snap === "peek" ? (
              <div className="flex items-start gap-1 pt-1 pb-3">
                <div className="min-w-0 flex-1">
                  <ShopCard
                    shop={selected}
                    now={now}
                    compact
                    selected
                    distanceM={userLocation ? distanceM(userLocation, selected) : undefined}
                    onSelect={() => flyTo(selected)}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Close shop preview"
                  onClick={deselect}
                >
                  <X />
                </Button>
              </div>
            ) : (
              <div className="flex items-baseline justify-between pt-1 pb-3">
                <h2 className="text-lg font-semibold" aria-live="polite">
                  {countLabel}
                </h2>
                {filtersActive ? (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-[13px] font-medium text-muted-foreground hover:text-foreground"
                  >
                    Clear all
                  </button>
                ) : (
                  <Link
                    href="/about"
                    className="text-[13px] font-medium text-muted-foreground hover:text-foreground"
                  >
                    About
                  </Link>
                )}
              </div>
            )
          }
        >
          <div ref={listRef}>{results}</div>
        </BottomSheet>
      )}
    </div>
  );
}
