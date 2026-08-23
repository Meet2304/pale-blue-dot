import type { Metadata } from "next";
import { Mrs_Saint_Delafield } from "next/font/google";

import { TheNote } from "@/components/site/the-note";
import { ThePhotograph } from "@/components/site/the-photograph";

/**
 * A signature, not a face of the system. Loaded only on this route, so it
 * does not ride along with the four fonts every other page already pays for.
 */
const signature = Mrs_Saint_Delafield({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Story",
  description:
    "A short note about the pale blue dot, and about adding something to it.",
};

/**
 * The one page that explains itself.
 *
 * Everywhere else on this site the idea is meant to be felt rather than
 * stated. This is the deliberate exception: first the photograph, then the
 * words it left behind, then a name.
 */
export default function StoryPage() {
  return (
    <main id="content" className="hz-page-enter" style={{ background: "transparent" }}>
      <h1 className="hz-note-sr">The Pale Blue Dot</h1>
      <ThePhotograph />
      <TheNote signatureClassName={signature.className} />
    </main>
  );
}
