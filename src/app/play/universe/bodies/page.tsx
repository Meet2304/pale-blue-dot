import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

import { BodySpecimen } from "./specimen";

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--uv-sans",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--uv-mono",
});

export const metadata: Metadata = { title: "Bodies", robots: { index: false } };

export default function BodiesPage() {
  return (
    <div className={`${sans.variable} ${mono.variable}`}>
      <BodySpecimen />
    </div>
  );
}
