import type { Metadata } from "next";
import { Jost, Newsreader } from "next/font/google";

import { Voyager } from "./voyager";

/** Geometric, 1977: the lettering of the era the probe left in. */
const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--vy-display",
});
/** A reading serif for the log itself. */
const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--vy-text",
});

export const metadata: Metadata = { title: "Voyager", robots: { index: false } };

export default function VoyagerPage() {
  return (
    <div className={`${jost.variable} ${newsreader.variable}`}>
      <Voyager />
    </div>
  );
}
