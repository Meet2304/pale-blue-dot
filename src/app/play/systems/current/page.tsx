import type { Metadata } from "next";
import {
  Fragment_Mono,
  Geist,
  Geist_Mono,
  Hanken_Grotesk,
  IBM_Plex_Mono,
  Instrument_Sans,
} from "next/font/google";

import { CurrentSystem, type Pairing } from "./current-system";

/* Three quiet pairings to compare. Each is a plain sans with a mono beside it:
   the sans speaks, the mono carries labels and every glyph in the field. */
const geist = Geist({ subsets: ["latin"], variable: "--cr-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--cr-geist-mono" });
const instrument = Instrument_Sans({ subsets: ["latin"], variable: "--cr-instrument" });
const fragment = Fragment_Mono({
  subsets: ["latin"],
  weight: "400",
  variable: "--cr-fragment",
});
const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--cr-hanken" });
const plex = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--cr-plex",
});

const PAIRINGS: Pairing[] = [
  {
    key: "geist",
    label: "Geist + Geist Mono",
    sans: "--cr-geist",
    mono: "--cr-geist-mono",
  },
  {
    key: "instrument",
    label: "Instrument Sans + Fragment Mono",
    sans: "--cr-instrument",
    mono: "--cr-fragment",
  },
  {
    key: "hanken",
    label: "Hanken Grotesk + IBM Plex Mono",
    sans: "--cr-hanken",
    mono: "--cr-plex",
  },
];

export const metadata: Metadata = { title: "Current", robots: { index: false } };

export default function CurrentPage() {
  const fonts = [geist, geistMono, instrument, fragment, hanken, plex]
    .map((f) => f.variable)
    .join(" ");
  return (
    <div className={fonts}>
      <CurrentSystem pairings={PAIRINGS} />
    </div>
  );
}
