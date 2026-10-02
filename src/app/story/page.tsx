import type { Metadata } from "next";
import { Mrs_Saint_Delafield } from "next/font/google";

import { plexVariables } from "@/app/fonts";
import { StarField } from "@/components/horizon/star-field";
import { BackLink } from "@/components/site/back-link";
import { PageTransition } from "@/components/site/page-transition";
import { TheNote } from "@/components/site/the-note";
import { ThePhotograph } from "@/components/site/the-photograph";
import { Footer } from "@/components/universe/footer";
import { PageNav } from "@/components/universe/page-nav";

import s from "./story.module.css";

/**
 * A signature, not a face of the system. Loaded only on this route, so it
 * does not ride along with the four fonts every other page already pays for.
 */
const signature = Mrs_Saint_Delafield({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  /* Not preloaded: a preload is put on every page's head, and only the
     note's signature uses it. */
  preload: false,
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
 * words it left behind, then a name. It is a page of the universe, in its
 * frame (the way back, the foot), under a quiet sky of its own.
 */
export default function StoryPage() {
  return (
    <PageTransition>
      <div className={plexVariables}>
        <PageNav />
        <main id="content" className={s.root}>
          <StarField />
          <header className={s.top}>
            <BackLink className={s.home}>
              <span aria-hidden>←</span> Back to the universe
            </BackLink>
          </header>
          <div className={s.content}>
            <h1 className="hz-note-sr">The Pale Blue Dot</h1>
            <ThePhotograph />
            <TheNote signatureClassName={signature.className} />
          </div>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
}
