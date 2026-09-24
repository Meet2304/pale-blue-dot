import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif } from "next/font/google";

import { Constellations } from "./constellations";

/** The serif names the figures, as star atlases always have; the sans carries
    everything you actually read. */
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--cn-serif",
});
const sans = Instrument_Sans({ subsets: ["latin"], variable: "--cn-sans" });

export const metadata: Metadata = { title: "Constellations", robots: { index: false } };

export default function ConstellationsPage() {
  return (
    <div className={`${serif.variable} ${sans.variable}`}>
      <Constellations />
    </div>
  );
}
