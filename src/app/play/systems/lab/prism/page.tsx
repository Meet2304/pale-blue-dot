import type { Metadata } from "next";
import { Fragment_Mono, Onest } from "next/font/google";

import { PrismSystem } from "./prism-system";

const sans = Onest({ subsets: ["latin"], variable: "--pr-sans" });
const mono = Fragment_Mono({
  subsets: ["latin"],
  weight: "400",
  variable: "--pr-mono",
});

export const metadata: Metadata = { title: "Prism", robots: { index: false } };

export default function PrismPage() {
  return (
    <div className={`${sans.variable} ${mono.variable}`}>
      <PrismSystem />
    </div>
  );
}
