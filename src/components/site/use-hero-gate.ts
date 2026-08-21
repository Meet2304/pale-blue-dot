"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Whether the viewport has cleared the hero — which is the same question as
 * "should the chrome be showing".
 *
 * The signal is a 1px marker `HeroWarp` pins to the bottom of its scroll
 * runway. That edge is exactly where the sticky stage releases, and the warp's
 * own safety ramp guarantees the curtain is fully black by then, so the nav
 * fades in on the same frame the black hands off to the section below — no bar
 * floating over the flight, and no gap after it.
 *
 * A page with no marker (every route but `/`) is past the hero by definition
 * and gets `true` immediately, without an observer.
 *
 * Deliberately does **not** disconnect on the first crossing: scrolling back up
 * into the hero has to put the bar away again, or it sits on top of the warp on
 * the way back.
 */
/**
 * Routes that open on a hero and therefore start with the chrome hidden.
 *
 * Two questions get answered separately here, and they need different sources.
 * *Whether* a route has a hero has to be known during render — a route without
 * one must ship the bar in its HTML rather than fade it in a frame after
 * hydration, and no effect runs early enough for that. *Where in the hero you
 * are* can only come from the DOM, which is what the marker is for.
 *
 * So this list is the answer to the first question. Add a route here if it ever
 * grows a hero of its own; the marker keeps working without being told.
 */
const HERO_ROUTES = new Set(["/"]);

export function useHeroGate(): boolean {
  const pathname = usePathname();
  const hasHero = HERO_ROUTES.has(pathname);
  const [crossed, setCrossed] = useState(false);

  useEffect(() => {
    if (!hasHero) return;

    /* React commits the whole tree's DOM before any effect runs, and the App
       Router commits a client navigation in the same pass, so by now the marker
       either exists on this page or never will. */
    const marker = document.querySelector("[data-hero-end]");
    if (!marker) return;

    /* Fires once on observe — which is what supplies the initial state — and
       then only on boundary crossings. Never once per scroll frame.

       Two conditions, and both are needed. The runway is 240svh over a 100svh
       sticky stage, so at the end of the warp the runway's bottom edge sits
       exactly on the bottom edge of the viewport: the marker *enters* from
       below at the moment the flight finishes, which is `isIntersecting`.
       Keep scrolling and it leaves through the top, at which point it is no
       longer intersecting but we are further past the hero than ever — hence
       the second term. Testing only for `top <= 0` was the original bug: the
       bar then waited a full extra viewport before appearing, and never
       appeared at all if you stopped scrolling when the warp ended. */
    const observer = new IntersectionObserver(
      ([entry]) => setCrossed(entry.isIntersecting || entry.boundingClientRect.top < 0),
      { threshold: 0 },
    );

    observer.observe(marker);
    return () => observer.disconnect();
  }, [hasHero, pathname]);

  return !hasHero || crossed;
}
