import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

import { EarthSystem } from "./earth-system";

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--te-sans",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--te-mono",
});

export const metadata: Metadata = { title: "Terminal Earth", robots: { index: false } };

export default function EarthPage() {
  return (
    <div className={`${sans.variable} ${mono.variable}`}>
      <EarthSystem />
    </div>
  );
}
