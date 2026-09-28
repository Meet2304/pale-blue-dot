import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

import { TerminalSystem } from "./terminal-system";

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500"],
  variable: "--tm-sans",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--tm-mono",
});

export const metadata: Metadata = { title: "Terminal", robots: { index: false } };

export default function TerminalPage() {
  return (
    <div className={`${sans.variable} ${mono.variable}`}>
      <TerminalSystem />
    </div>
  );
}
