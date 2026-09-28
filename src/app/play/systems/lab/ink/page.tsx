import type { Metadata } from "next";
import { Figtree, JetBrains_Mono } from "next/font/google";

import { InkSystem } from "./ink-system";

const sans = Figtree({ subsets: ["latin"], variable: "--ni-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--ni-mono" });

export const metadata: Metadata = { title: "Nebula Ink", robots: { index: false } };

export default function InkPage() {
  return (
    <div className={`${sans.variable} ${mono.variable}`}>
      <InkSystem />
    </div>
  );
}
