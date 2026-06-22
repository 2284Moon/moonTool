"use client";

import dynamic from "next/dynamic";

const SystemInfoInner = dynamic(() => import("./index").then((m) => m.SystemInfo), { ssr: false });

export function SystemInfoWrapper() {
  return <SystemInfoInner />;
}
