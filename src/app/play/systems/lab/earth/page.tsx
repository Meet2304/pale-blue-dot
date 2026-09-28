import type { Metadata } from "next";

import { plexVariables } from "../../../plex";

import { EarthSystem } from "./earth-system";

export const metadata: Metadata = { title: "Terminal Earth", robots: { index: false } };

export default function EarthPage() {
  return (
    <div className={plexVariables}>
      <EarthSystem />
    </div>
  );
}
