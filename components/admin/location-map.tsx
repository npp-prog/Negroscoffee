"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useTheme } from "next-themes";
import { setWorkerUrl } from "maplibre-gl";
import Map, { Marker, NavigationControl } from "react-map-gl/maplibre";

setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);

/** Small map for placing a shop pin: click to move, or drag the pin. */
export default function LocationMap({
  lat,
  lng,
  onChange,
}: {
  lat: number;
  lng: number;
  onChange: (p: { lat: number; lng: number }) => void;
}) {
  const { resolvedTheme } = useTheme();
  const style = resolvedTheme === "dark" ? "streets-v2-dark" : "streets-v2";
  return (
    <Map
      initialViewState={{ latitude: lat, longitude: lng, zoom: 15 }}
      mapStyle={`https://api.maptiler.com/maps/${style}/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY}`}
      style={{ width: "100%", height: "100%" }}
      dragRotate={false}
      onClick={(e) => onChange({ lat: e.lngLat.lat, lng: e.lngLat.lng })}
    >
      <NavigationControl showCompass={false} position="top-right" />
      <Marker
        latitude={lat}
        longitude={lng}
        draggable
        onDragEnd={(e) => onChange({ lat: e.lngLat.lat, lng: e.lngLat.lng })}
      >
        <span
          className="block size-6 rounded-full border-[3px] border-white bg-crema shadow-float"
          aria-label="Shop location"
          role="img"
        />
      </Marker>
    </Map>
  );
}
