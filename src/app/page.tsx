import type { Metadata } from "next";

import { Universe } from "@/components/universe/universe";

import { plexVariables } from "./fonts";

export const metadata: Metadata = {
  title: {
    absolute:
      "Meet Bhatt — I am an Engineer. This pale blue dot is where I build things.",
  },
  description:
    "Meet Bhatt, AI engineer and product builder. Everything he has worked on, drawn as one universe around the pale blue dot.",
};

/**
 * The universe: Earth up close, then the whole map around the pale blue dot,
 * then each year in turn, newest first. The spec is
 * `plans/celestial-portfolio-handoff.md` on the `play` branch.
 */
export default function Home() {
  return (
    <div className={plexVariables}>
      <Universe />
    </div>
  );
}
