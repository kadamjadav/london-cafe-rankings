"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

export type MapCafe = {
  slug: string;
  name: string;
  area: string;
  lat: number;
  lng: number;
  /** Number shown on the pin (Het's ranking). Community cafés have none. */
  rank?: number;
  overall?: number;
  /** Page to link to; defaults to Het's café page. */
  href?: string;
  /** Extra line in the popup, e.g. "4.2★ from 3 reviews". */
  subtitle?: string;
};

// Greater London, roughly. Panning is limited to this box so the map stays "a map of London".
const LONDON_BOUNDS = L.latLngBounds([51.28, -0.51], [51.7, 0.33]);
const LONDON_CENTRE: [number, number] = [51.5074, -0.1278];

function rankIcon(rank: number | undefined, active: boolean) {
  const community = rank === undefined;
  return L.divIcon({
    className: "",
    html: `<div class="cafe-pin${community ? " cafe-pin--community" : ""}${active ? " cafe-pin--active" : ""}">${community ? "☕" : rank}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

function FlyToSelected({ cafe }: { cafe?: MapCafe }) {
  const map = useMap();
  useEffect(() => {
    if (cafe) map.flyTo([cafe.lat, cafe.lng], Math.max(map.getZoom(), 14), { duration: 0.6 });
  }, [cafe, map]);
  return null;
}

/** On first render, zoom so every pin is visible (keeps outer-zone cafés from falling off the edge). */
function FitToCafes({ cafes }: { cafes: MapCafe[] }) {
  const map = useMap();
  useEffect(() => {
    if (cafes.length < 2) return;
    map.fitBounds(L.latLngBounds(cafes.map((c) => [c.lat, c.lng] as [number, number])), {
      padding: [40, 40],
      maxZoom: 14,
    });
    // Only on mount — re-fitting on every filter change would fight the user's panning.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export default function CafeMap({
  cafes,
  selected,
  onSelect,
  height = 460,
  zoom = 12,
  center = LONDON_CENTRE,
}: {
  cafes: MapCafe[];
  selected?: string;
  onSelect?: (slug: string) => void;
  height?: number;
  zoom?: number;
  center?: [number, number];
}) {
  const selectedCafe = cafes.find((c) => c.slug === selected);
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      minZoom={10}
      maxBounds={LONDON_BOUNDS}
      maxBoundsViscosity={1}
      scrollWheelZoom={false}
      style={{ height, width: "100%" }}
      className="rounded-2xl border border-stone-200 z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {cafes.map((c) => (
        <Marker
          key={c.slug}
          position={[c.lat, c.lng]}
          icon={rankIcon(c.rank, c.slug === selected)}
          eventHandlers={{ click: () => onSelect?.(c.slug) }}
        >
          <Popup>
            <div className="text-sm">
              <div className="font-semibold">
                {c.rank !== undefined && `#${c.rank} `}
                {c.name}
              </div>
              <div className="text-stone-500">
                {c.area}
                {c.overall !== undefined && ` · ${c.overall.toFixed(1)}/10`}
                {c.subtitle && ` · ${c.subtitle}`}
              </div>
              <Link href={c.href ?? `/cafe/${c.slug}`} className="text-amber-800 underline">
                {c.rank !== undefined ? "Read review →" : "See reviews →"}
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
      <FitToCafes cafes={cafes} />
      <FlyToSelected cafe={selectedCafe} />
    </MapContainer>
  );
}
