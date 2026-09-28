import type { Metadata } from "next";

import { plexVariables } from "../plex";

import { Universe } from "./universe";

export const metadata: Metadata = { title: "Universe", robots: { index: false } };

export default function UniversePage() {
  return (
    <div className={plexVariables}>
      <Universe />
    </div>
  );
}
