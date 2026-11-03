"use client";

import { useEffect, useState } from "react";

import type { Lightbox as LightboxComponent } from "./lightbox";

/**
 * The zoom view (lightbox.tsx), fetched once a picture is near, not with
 * the page, and held once it has arrived so a click renders it at once.
 *
 * Not `next/dynamic` (React.lazy): a lazy component reveals through
 * Suspense, which React throttles to every 300 ms or so, so the first
 * click on a picture waited a third of a second or more for the view to
 * open even with its code already fetched.
 */
type Lightbox = typeof LightboxComponent;

let held: Lightbox | null = null;
let pending: Promise<Lightbox> | null = null;

export const loadLightbox = () =>
  (pending ??= import("./lightbox").then((m) => (held = m.Lightbox)));

/** The zoom view, once `near` has asked for it and it has arrived. */
export function useLightbox(near: boolean): Lightbox | null {
  const [component, setComponent] = useState<Lightbox | null>(() => held);
  useEffect(() => {
    if (!near || component) return;
    let live = true;
    void loadLightbox().then((c) => {
      if (live) setComponent(() => c);
    });
    return () => {
      live = false;
    };
  }, [near, component]);
  return component;
}
