import type { Metadata } from "next";

import { plexVariables } from "../../plex";

import { BodySpecimen } from "./specimen";

export const metadata: Metadata = { title: "Bodies", robots: { index: false } };

export default function BodiesPage() {
  return (
    <div className={plexVariables}>
      <BodySpecimen />
    </div>
  );
}
