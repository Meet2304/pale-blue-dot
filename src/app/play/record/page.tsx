import type { Metadata } from "next";
import { Bodoni_Moda, Familjen_Grotesk } from "next/font/google";

import { GoldenRecord } from "./golden-record";

/** The display face is engraved-looking and high-contrast, like lettering cut
    into metal; the grotesk is for liner notes. */
const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--gr-display",
});
const grotesk = Familjen_Grotesk({ subsets: ["latin"], variable: "--gr-text" });

export const metadata: Metadata = { title: "Golden Record", robots: { index: false } };

export default function RecordPage() {
  return (
    <div className={`${bodoni.variable} ${grotesk.variable}`}>
      <GoldenRecord />
    </div>
  );
}
