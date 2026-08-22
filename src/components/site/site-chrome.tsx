"use client";

import { useEffect, useState } from "react";

import { StarField } from "@/components/horizon/star-field";
import { SiteNav } from "@/components/site/site-nav";
import { useHeroGate } from "@/components/site/use-hero-gate";
import { ProgressiveBlur } from "@/components/ui/progressive-blur";

/**
 * Whether the footer is on screen.
 *
 * The bottom edge blur is the only thing that asks. A blurred strip lying over
 * the footer's links and the dot-matrix name is precisely the case where this
 * effect stops being texture and starts eating content, so the rule is simply
 * "when the footer arrives, get out of the way".
 */
function useFooterInView(): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const footer = document.querySelector("[data-site-footer]");
    if (!footer) return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0 },
    );

    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  return inView;
}

/**
 * Everything that sits outside the page and survives navigation: the sky, the
 * bar, and the skip link.
 *
 * It exists so the root layout can stay a server component while one client
 * boundary owns the hero gate — the star field and the nav ask the same
 * question ("are we past the warp?"), and asking it twice would mean two
 * IntersectionObservers watching the same 1px marker.
 */
/**
 * Whether we are on a small screen.
 *
 * Only the blur ramps ask, and only to spend fewer layers. Every layer is its
 * own backdrop snapshot, re-taken whenever the star field behind it repaints, so
 * the count is the cost — and it is a prop rather than something CSS can reach.
 * The alternative was a single frosted pane on phones, which put a hard-edged
 * rectangle under the bar: the exact seam the ramp exists to avoid.
 */
function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 760px)");
    const sync = () => setNarrow(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return narrow;
}

export function SiteChrome() {
  const past = useHeroGate();
  const footerInView = useFooterInView();
  const narrow = useNarrow();

  return (
    <>
      {/* First in the body, and outside the nav, so it is reachable on the hero
          where the bar is still hidden. */}
      <a href="#content" className="hz-skip">
        Skip to content
      </a>
      {/* While the hero is on screen this canvas is completely covered by the
          runway's opaque black — and the scene above it is drawing a full-frame
          gradient, a reflection stack and a noise volume. Not competing for that
          frame is the most useful thing the star field can do. */}
      <StarField paused={!past} />
      <SiteNav visible={past} />
      {/* The veils fade; the blurs do not, and that split is the fix.
          `backdrop-filter` samples what is behind an element up to the nearest
          backdrop root, and any ancestor at opacity below 1 creates one — so a
          host that fades in has nothing to blur for the whole length of its own
          fade, and browsers are unreliable about re-establishing the backdrop
          when the value lands back on 1. The blur layers are therefore mounted
          only while they should show and never animate; the fade lives on a
          plain gradient with no filter on it. At the moment they appear the
          frame behind them is black, so the un-faded arrival is invisible. */}
      <span
        className="hz-edge-veil hz-edge-veil--top"
        data-visible={past ? "true" : "false"}
        aria-hidden
      />
      {past && (
        <ProgressiveBlur
          className="hz-edge-blur hz-edge-blur--top"
          direction="top"
          layers={narrow ? 5 : 8}
          intensity={narrow ? 3 : 2.4}
        />
      )}

      <span
        className="hz-edge-veil hz-edge-veil--bottom"
        data-visible={past && !footerInView ? "true" : "false"}
        aria-hidden
      />
      {past && !footerInView && (
        <ProgressiveBlur
          className="hz-edge-blur hz-edge-blur--bottom"
          direction="bottom"
          layers={narrow ? 4 : 6}
          intensity={narrow ? 1.8 : 1.4}
        />
      )}
    </>
  );
}
