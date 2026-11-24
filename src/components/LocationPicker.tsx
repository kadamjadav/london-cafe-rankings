"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";

const LONDON_BOUNDS = L.latLngBounds([51.28, -0.51], [51.7, 0.33]);

const pin = L.divIcon({
  className: "",
  html: `<div class="cafe-pin cafe-pin--community cafe-pin--active">☕</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (LONDON_BOUNDS.contains(e.latlng)) onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** Tap the map to drop the café's pin. Only spots inside Greater London are accepted. */
export default function LocationPicker({
  value,
  onChange,
}: {
  value: { lat: number; lng: number } | null;
  onChange: (v: { lat: number; lng: number }) => void;
}) {
  return (
    <MapContainer
      center={[51.5074, -0.1278]}
      zoom={12}
      minZoom={10}
      maxBounds={LONDON_BOUNDS}
      maxBoundsViscosity={1}
      style={{ height: 340, width: "100%" }}
      className="z-0 cursor-crosshair rounded-md border border-rule"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickToPlace onPick={(lat, lng) => onChange({ lat, lng })} />
      {value && (
        <Marker
          position={[value.lat, value.lng]}
          icon={pin}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const p = (e.target as L.Marker).getLatLng();
              if (LONDON_BOUNDS.contains(p)) onChange({ lat: p.lat, lng: p.lng });
            },
          }}
        />
      )}
    </MapContainer>
  );
}
