import type { Metadata } from "next";
import { Fraunces } from "next/font/google";

import { IntoTheDot } from "./into-the-dot";

/** Warm, soft and human, because this is the one concept that ends at a
    person rather than at the sky. One family, both styles. */
const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT"],
  variable: "--dt-face",
});

export const metadata: Metadata = { title: "Into the Dot", robots: { index: false } };

export default function DotPage() {
  return (
    <div className={fraunces.variable}>
      <IntoTheDot />
    </div>
  );
}
