"use client";

import { useEffect, useRef } from "react";

/**
 * The sky on the other side of the warp.
 *
 * `night-horizon.tsx` already draws a star field, but it draws it as one layer
 * of a scene that also owns a horizon, a bloom, a sea, a warp and a noise
 * volume. None of that belongs on a page that has to sit under body copy, so
 * this is a separate component rather than a configuration of that one — it
 * borrows the twinkle maths and the DPR handling and leaves the rest behind.
 *
 * Everything here is tuned a step quieter than the hero, on purpose. The hero
 * is arrival; this is after arrival, when the engine is off.
 */

/**
 * Brightest a star is ever drawn.
 *
 * This started at 0.34 against the hero's 0.62, on the theory that a field
 * sitting under body copy should stay well out of its way. At sub-pixel radii
 * that theory produced a sky with nothing visible in it at all — the whole
 * layer may as well not have been there. Being quieter than the hero is still
 * the goal; being invisible was never the goal.
 */
const ALPHA_CEIL = 0.75;

/** One star per this many CSS pixels of viewport. ~296 stars at 1920x1080. */
const AREA_PER_STAR = 7_000;
const MIN_STARS = 60;
const MAX_STARS = 260;

/**
 * `abs(sin)` has period pi, so 0.22–0.84 rad/s is one twinkle every 3.7s to
 * 14.3s. The hero runs 0.5–2.4, i.e. 1.1s to 6.3s. Three to four times slower
 * is the difference between a sky that shimmers and a sky that has gone still.
 */
const SPEED_MIN = 0.22;
const SPEED_SPAN = 0.62;

/**
 * At a 3.7s floor on the twinkle period, 30fps is indistinguishable from 60 and
 * costs half as much — and unlike the hero, this canvas is alive for as long as
 * the tab is, on every route.
 */
const FRAME_MS = 1000 / 30;

/** Matches the hero's reduced-motion constant, so the two skies rest alike. */
const STILL = 0.72;

/**
 * How long the sky takes to come up once it is first uncovered, in ms.
 *
 * This is the "over time" half of the reveal — the field lifts out of black
 * rather than switching on.
 */
const REVEAL_MS = 1800;

/**
 * How far below the hero's trailing edge, in CSS px, a star reaches full
 * brightness. This is the "no seam" half, and it is the one that actually
 * matters.
 *
 * The hard line was never a timing problem, it was a geometric one. The hero's
 * runway is opaque and this canvas is fixed behind everything, so at any moment
 * mid-transition the runway covers the top of the viewport and the sky shows
 * through the bottom — and *any* difference in brightness across that boundary
 * draws a line, however slowly the brightness got there. A global ramp cannot
 * fix that: it changes the value on both sides equally.
 *
 * Fading each star by its own distance below the edge does fix it, because it
 * makes the two sides meet at the same value. Stars sitting at the boundary are
 * black; brightness climbs over the next EDGE_FEATHER px. There is nothing to
 * see at the seam because there is nothing at the seam.
 */
const EDGE_FEATHER = 340;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Same curve as --ease-out-soft: quick to establish, long to settle. */
const easeOutSoft = (t: number) => 1 - Math.pow(1 - t, 3);

type Star = {
  /** Normalised 0..1 — see the note in `resize`. */
  x: number;
  y: number;
  r: number;
  phase: number;
  /** Twinkle rate, rad/s. */
  speed: number;
  /** How hard this star twinkles, 0..1. Most barely do. */
  amp: number;
  cold: boolean;
};

type StarFieldProps = {
  /**
   * Stops the loop without unmounting. The hero paints an opaque black runway
   * over this canvas for its entire length, so drawing underneath it is pure
   * waste at exactly the moment the scene above needs the frame budget.
   */
  paused?: boolean;
};

export function StarField({ paused = false }: StarFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);

  /* The scene effect runs once and owns the loop; `paused` arrives later and
     from outside it. Handing the loop's start/stop out through a ref is what
     lets the prop reach it without the effect re-running and re-seeding the
     sky every time the hero gate flips. */
  const syncRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lowPower =
      window.innerWidth < 760 || (navigator.hardwareConcurrency ?? 8) <= 4;

    let stars: Star[] = [];
    let w = 0;
    let h = 0;
    let raf = 0;
    let lastAt = -Infinity;

    const build = (count: number) => {
      stars = new Array(count).fill(0).map(() => ({
        x: Math.random(),
        y: Math.random(),
        /* A few are allowed to be points rather than specks, or the whole
           field flattens into an even dusting. The floor matters more than it
           looks: below about 0.4 a circle covers so little of a pixel that it
           antialiases away to nothing however high the alpha goes. */
        r:
          Math.random() < 0.06 ? 1.2 + Math.random() * 0.8 : 0.42 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        speed: SPEED_MIN + Math.random() * SPEED_SPAN,
        amp: 0.1 + Math.pow(Math.random(), 2.4) * 0.45,
        cold: Math.random() < 0.14,
      }));
    };

    /* The marker at the bottom of the hero's runway, which is also what the
       chrome gates on. Absent on every route without a hero, and then the sky
       is simply already there. */
    const anchor = document.querySelector("[data-hero-end]");

    /** When the field was last uncovered, for the time-based lift. */
    let revealAt = 0;

    const draw = (t: number, now: number) => {
      ctx.clearRect(0, 0, w, h);

      /* Reduced motion gets the finished sky. It has no loop to follow either
         clock or scroll with, and it should not be watching things brighten
         anyway — the field is simply present. */
      const lift = reduce ? 1 : easeOutSoft(clamp01((now - revealAt) / REVEAL_MS));
      if (lift <= 0.001) return;

      /* The trailing edge of the hero, in viewport coordinates. Absent on every
         route without a hero, and then nothing is covering anything. */
      const edge = anchor && !reduce ? anchor.getBoundingClientRect().top : -Infinity;

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];

        /* Lifted from night-horizon.tsx, exponent included. The second
           scintillation harmonic is deliberately absent there — it was what
           made that sky look restless — and it would be worse here. */
        const base = Math.pow(Math.abs(Math.sin(t * s.speed + s.phase)), 1.7);
        const tw = reduce ? STILL : 1 - s.amp + s.amp * base;

        const sy = s.y * h;
        /* 0 at the hero's trailing edge, 1 once EDGE_FEATHER below it. */
        const clear = clamp01((sy - edge) / EDGE_FEATHER);
        if (clear <= 0.001) continue;

        ctx.globalAlpha = tw * ALPHA_CEIL * lift * clear;
        ctx.fillStyle = s.cold ? "rgba(198, 205, 255, 1)" : "#ffffff";
        ctx.beginPath();
        ctx.arc(s.x * w, sy, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    };

    const resize = () => {
      const nextW = Math.max(1, window.innerWidth);
      const nextH = Math.max(1, window.innerHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2);

      w = nextW;
      h = nextH;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      /* Star positions are normalised rather than absolute, which is the one
         real departure from the hero. That scene regenerates its field inside
         resize, which is harmless for a section nobody resizes; a full-viewport
         fixed canvas resizes every time a mobile toolbar shows or hides, and
         reshuffling the entire sky on a scroll gesture is unmissable. Here the
         count only changes when the area crosses a star's worth. */
      const target = Math.max(
        MIN_STARS,
        Math.min(MAX_STARS, Math.round((w * h) / AREA_PER_STAR)),
      );
      if (target !== stars.length) build(target);

      if (reduce) draw(0, performance.now());
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (now - lastAt < FRAME_MS) return;
      lastAt = now;
      draw(now / 1000, now);
    };

    const stop = () => {
      if (!raf) return;
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const sync = () => {
      /* Reduced motion never starts a loop at all — it gets one static frame
         from `resize` and nothing else. This is the JS half of the rule; the
         CSS half is that the host carries no animation to disable. */
      if (reduce) return;
      const shouldRun = !pausedRef.current && !document.hidden;
      if (shouldRun && !raf) {
        /* Restart the lift each time the field is uncovered, so coming back to
           it after scrolling into the hero reads the same way it did first. */
        revealAt = performance.now();
        raf = requestAnimationFrame(frame);
      } else if (!shouldRun) stop();
    };

    resize();
    sync();

    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", sync);

    /* The host is `position: fixed; inset: 0`, so an IntersectionObserver on it
       would report "visible" forever. Occlusion by the hero has to be told to
       us from outside, which is what `paused` is for. */
    syncRef.current = sync;

    return () => {
      stop();
      syncRef.current = null;
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  useEffect(() => {
    pausedRef.current = paused;
    syncRef.current?.();
  }, [paused]);

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
      }}
    >
      <canvas ref={canvasRef} style={{ display: "block" }} />
      {/* The grain the hero establishes, carried through the rest of the site.
          Be clear-eyed about it: soft-light over near-black is very nearly a
          no-op, so this catches on the stars and almost nowhere else. It costs
          one static background image and it is the right texture, but it will
          not read the way the hero's does — that one has light behind it. */}
      <div className="hz-noise" style={{ opacity: 0.03 }} />
    </div>
  );
}
