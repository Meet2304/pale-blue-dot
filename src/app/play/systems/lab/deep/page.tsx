import type { Metadata } from "next";
import { Red_Hat_Mono, Sora } from "next/font/google";

import { DeepSystem } from "./deep-system";

const sans = Sora({ subsets: ["latin"], variable: "--df-sans" });
const mono = Red_Hat_Mono({ subsets: ["latin"], variable: "--df-mono" });

export const metadata: Metadata = { title: "Deep Field", robots: { index: false } };

export default function DeepPage() {
  return (
    <div className={`${sans.variable} ${mono.variable}`}>
      <DeepSystem />
    </div>
  );
}
