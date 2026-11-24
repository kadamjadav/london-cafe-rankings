"use client";

import dynamic from "next/dynamic";

// Leaflet touches `window`, so the map is only ever rendered in the browser.
const MapClient = dynamic(() => import("./CafeMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[460px] w-full animate-pulse rounded-2xl border border-stone-200 bg-stone-100" />
  ),
});

export default MapClient;
