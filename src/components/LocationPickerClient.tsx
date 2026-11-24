"use client";

import dynamic from "next/dynamic";

const LocationPickerClient = dynamic(() => import("./LocationPicker"), {
  ssr: false,
  loading: () => <div className="h-[340px] w-full animate-pulse rounded-2xl border border-stone-200 bg-stone-100" />,
});

export default LocationPickerClient;
