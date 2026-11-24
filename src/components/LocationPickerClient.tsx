"use client";

import dynamic from "next/dynamic";

const LocationPickerClient = dynamic(() => import("./LocationPicker"), {
  ssr: false,
  loading: () => <div className="h-[340px] w-full animate-pulse rounded-md border border-rule bg-chalk-deep" />,
});

export default LocationPickerClient;
