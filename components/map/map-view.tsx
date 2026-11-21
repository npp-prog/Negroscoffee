"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useCallback, useMemo, useState, type Ref } from "react";
import { useTheme } from "next-themes";
import Map, {
  AttributionControl,
  Marker,
  type MapRef,
  type ViewStateChangeEvent,
} from "react-map-gl/maplibre";
import { setWorkerUrl, type Map as MaplibreMap } from "maplibre-gl";
import Supercluster from "supercluster";

import { ClusterPin, ShopPin, UserLocationDot } from "@/components/map/shop-pin";
import type { ShopType } from "@/lib/categories";
import { NEGROS_BBOX, type Bbox, type ShopCard } from "@/lib/db";
import type { LatLng } from "@/lib/geo";

export type MapViewport = { bbox: Bbox; center: LatLng; zoom: number };

type PointProps = { shopId: string; type: ShopType };
type ClusterProps = { specialty: number; chain: number; kapihan: number };

/** Keep the camera roughly on Negros. */
const MAX_BOUNDS: [number, number, number, number] = [
  NEGROS_BBOX.minLng - 0.9,
  NEGROS_BBOX.minLat - 0.6,
  NEGROS_BBOX.maxLng + 0.9,
  NEGROS_BBOX.maxLat + 0.6,
];

// MapLibre locates its worker relative to its own module, which bundling breaks. Point it at
// the worker file emitted as a static asset instead.
setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);

const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;

function styleUrl(dark: boolean) {
  const style = dark ? "streets-v2-dark" : "streets-v2";
  return `https://api.maptiler.com/maps/${style}/style.json?key=${mapTilerKey}`;
}

function viewportOf(map: MaplibreMap): MapViewport {
  const b = map.getBounds();
  const c = map.getCenter();
  return {
    bbox: { minLng: b.getWest(), minLat: b.getSouth(), maxLng: b.getEast(), maxLat: b.getNorth() },
    center: { lat: c.lat, lng: c.lng },
    zoom: map.getZoom(),
  };
}

export default function MapView({
  mapRef,
  shops,
  selected,
  highlightedId,
  userLocation,
  padding,
  attributionPosition,
  onSelect,
  onHover,
  onViewportChange,
  onBackgroundClick,
}: {
  mapRef: Ref<MapRef>;
  shops: ShopCard[];
  selected: ShopCard | null;
  highlightedId: string | null;
  userLocation: LatLng | null;
  padding: { top: number; bottom: number; left: number; right: number };
  /** Kept clear of the floating UI so the OSM/MapTiler credit is always visible. */
  attributionPosition: "top-left" | "bottom-left";
  onSelect: (shop: ShopCard) => void;
  onHover: (id: string | null) => void;
  onViewportChange: (v: MapViewport) => void;
  onBackgroundClick: () => void;
}) {
  const { resolvedTheme } = useTheme();
  const [viewport, setViewport] = useState<MapViewport | null>(null);

  const byId = useMemo(() => new globalThis.Map(shops.map((s) => [s.id, s])), [shops]);

  const index = useMemo(() => {
    const sc = new Supercluster<PointProps, ClusterProps>({
      radius: 56,
      maxZoom: 15,
      map: (p) => ({
        specialty: p.type === "specialty" ? 1 : 0,
        chain: p.type === "chain" ? 1 : 0,
        kapihan: p.type === "kapihan" ? 1 : 0,
      }),
      reduce: (acc, p) => {
        acc.specialty += p.specialty;
        acc.chain += p.chain;
        acc.kapihan += p.kapihan;
      },
    });
    sc.load(
      shops.map((s) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [s.lng, s.lat] },
        properties: { shopId: s.id, type: s.type },
      })),
    );
    return sc;
  }, [shops]);

  const clusters = useMemo(() => {
    if (!viewport) return [];
    const { bbox, zoom } = viewport;
    return index.getClusters(
      [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat],
      Math.floor(zoom),
    );
  }, [index, viewport]);

  // The selected shop always shows as its own pin, even when clustered or outside the results.
  const selectedId = selected?.id ?? null;

  const handleMove = useCallback(
    (e: ViewStateChangeEvent | { target: MaplibreMap }) => {
      const v = viewportOf(e.target);
      setViewport(v);
      onViewportChange(v);
    },
    [onViewportChange],
  );

  const zoomInto = useCallback(
    (clusterId: number, lng: number, lat: number) => {
      const map = (mapRef as { current: MapRef | null }).current;
      if (!map) return;
      const zoom = Math.min(index.getClusterExpansionZoom(clusterId), 17);
      map.easeTo({ center: [lng, lat], zoom, duration: 400 });
    },
    [index, mapRef],
  );

  return (
    <Map
      ref={mapRef}
      mapStyle={styleUrl(resolvedTheme === "dark")}
      initialViewState={{
        bounds: [NEGROS_BBOX.minLng, NEGROS_BBOX.minLat, NEGROS_BBOX.maxLng, NEGROS_BBOX.maxLat],
        fitBoundsOptions: {
          padding: { ...padding, top: padding.top + 16, bottom: padding.bottom + 16 },
        },
      }}
      padding={padding}
      maxBounds={MAX_BOUNDS}
      minZoom={7}
      maxZoom={19}
      dragRotate={false}
      pitchWithRotate={false}
      touchPitch={false}
      attributionControl={false}
      onLoad={handleMove}
      onMoveEnd={handleMove}
      onClick={onBackgroundClick}
      style={{ position: "absolute", inset: 0 }}
      cooperativeGestures={false}
    >
      <AttributionControl key={attributionPosition} compact position={attributionPosition} />

      {clusters.map((f) => {
        const [lng, lat] = f.geometry.coordinates;
        const props = f.properties;
        if ("cluster" in props && props.cluster) {
          return (
            <Marker key={`c${props.cluster_id}`} longitude={lng} latitude={lat}>
              <ClusterPin
                count={props.point_count}
                byType={{ specialty: props.specialty, chain: props.chain, kapihan: props.kapihan }}
                onClick={() => zoomInto(props.cluster_id, lng, lat)}
              />
            </Marker>
          );
        }
        const shop = byId.get((props as PointProps).shopId);
        if (!shop || shop.id === selectedId) return null;
        return (
          <Marker key={shop.id} longitude={lng} latitude={lat}>
            <ShopPin
              shop={shop}
              selected={false}
              highlighted={shop.id === highlightedId}
              onSelect={onSelect}
              onHover={onHover}
            />
          </Marker>
        );
      })}

      {selected && (
        <Marker longitude={selected.lng} latitude={selected.lat} style={{ zIndex: 5 }}>
          <ShopPin
            shop={selected}
            selected
            highlighted={false}
            onSelect={onSelect}
            onHover={onHover}
          />
        </Marker>
      )}

      {userLocation && (
        <Marker longitude={userLocation.lng} latitude={userLocation.lat} style={{ zIndex: 4 }}>
          <UserLocationDot />
        </Marker>
      )}
    </Map>
  );
}
