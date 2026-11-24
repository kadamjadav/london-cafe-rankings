"use client";

import dynamic from "next/dynamic";

// Leaflet touches `window`, so the map is only ever rendered in the browser.
const MapClient = dynamic(() => import("./CafeMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[460px] w-full animate-pulse rounded-md border border-rule bg-chalk-deep" />
  ),
});

export default MapClient;
