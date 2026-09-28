import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

import { Universe } from "./universe";

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500"],
  variable: "--uv-sans",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--uv-mono",
});

export const metadata: Metadata = { title: "Universe", robots: { index: false } };

export default function UniversePage() {
  return (
    <div className={`${sans.variable} ${mono.variable}`}>
      <Universe />
    </div>
  );
}
