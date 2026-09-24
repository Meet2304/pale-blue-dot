import type { Metadata } from "next";
import { EB_Garamond } from "next/font/google";

import { Orrery } from "./orrery";

/** One family, set the way astronomical plates were: roman for the text,
    italic for everything engraved onto the figure. */
const garamond = EB_Garamond({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--or-face",
});

export const metadata: Metadata = { title: "Orrery", robots: { index: false } };

export default function OrreryPage() {
  return (
    <div className={garamond.variable}>
      <Orrery />
    </div>
  );
}
