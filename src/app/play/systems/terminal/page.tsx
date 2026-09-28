import type { Metadata } from "next";

import { plexVariables } from "../../plex";

import { TerminalSystem } from "./terminal-system";

export const metadata: Metadata = { title: "Terminal", robots: { index: false } };

export default function TerminalPage() {
  return (
    <div className={plexVariables}>
      <TerminalSystem />
    </div>
  );
}
