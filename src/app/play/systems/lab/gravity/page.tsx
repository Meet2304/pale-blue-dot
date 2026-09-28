import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { GravitySystem } from "./gravity-system";

const sans = Geist({ subsets: ["latin"], variable: "--gv-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--gv-mono" });

export const metadata: Metadata = { title: "Gravity", robots: { index: false } };

export default function GravityPage() {
  return (
    <div className={`${sans.variable} ${mono.variable}`}>
      <GravitySystem />
    </div>
  );
}
