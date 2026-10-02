"use client";

import { useEffect, useRef } from "react";

/* Brightest a star is ever drawn. */
const ALPHA_CEIL = 0.75;
/* One star per this many CSS pixels of viewport (~296 at 1920 × 1080). */
const AREA_PER_STAR = 7_000;
const MIN_STARS = 60;
const MAX_STARS = 260;
/* Twinkle rates, rad/s: one twinkle every 3.7s to 14.3s. */
const SPEED_MIN = 0.22;
const SPEED_SPAN = 0.62;
/* At twinkles that slow, 30fps reads the same as 60 at half the cost. */
const FRAME_MS = 1000 / 30;
/* Under reduced motion, every star holds at this brightness. */
const STILL = 0.72;
/* How long the sky takes to come up, in ms. */
const REVEAL_MS = 1800;

type Star = {
  /* Normalised 0..1, so a resize (a phone's toolbar showing or hiding)
     stretches the sky rather than reshuffling it. */
  x: number;
  y: number;
  r: number;
  phase: number;
  speed: number;
  /* How hard it twinkles, 0..1. Most barely do. */
  amp: number;
  cold: boolean;
};

const star = (): Star => ({
  x: Math.random(),
  y: Math.random(),
  /* A few points among the specks, or the field flattens into a dusting. */
  r: Math.random() < 0.06 ? 1.2 + Math.random() * 0.8 : 0.42 + Math.random() * 0.6,
  phase: Math.random() * Math.PI * 2,
  speed: SPEED_MIN + Math.random() * SPEED_SPAN,
  amp: 0.1 + Math.pow(Math.random(), 2.4) * 0.45,
  cold: Math.random() < 0.14,
});

/**
 * A quiet, slowly twinkling sky, fixed behind the page (the story and
 * contact pages). It lifts out of black as it arrives, sleeps while the tab
 * is hidden, and under reduced motion is drawn once and holds still.
 */
export function StarField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lowPower =
      window.innerWidth < 760 || (navigator.hardwareConcurrency ?? 8) <= 4;
    let stars: Star[] = [];
    let w = 0;
    let h = 0;
    let raf = 0;
    let lastAt = -Infinity;
    const shownAt = performance.now();

    const draw = (now: number) => {
      ctx.clearRect(0, 0, w, h);
      const t = now / 1000;
      const k = reduce ? 1 : Math.min(1, (now - shownAt) / REVEAL_MS);
      const lift = 1 - (1 - k) ** 3;
      for (const s of stars) {
        const tw = reduce
          ? STILL
          : 1 - s.amp + s.amp * Math.abs(Math.sin(t * s.speed + s.phase)) ** 1.7;
        ctx.globalAlpha = tw * ALPHA_CEIL * lift;
        ctx.fillStyle = s.cold ? "#c6cdff" : "#ffffff";
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const resize = () => {
      w = Math.max(1, window.innerWidth);
      h = Math.max(1, window.innerHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(
        MIN_STARS,
        Math.min(MAX_STARS, Math.round((w * h) / AREA_PER_STAR)),
      );
      if (count !== stars.length) stars = Array.from({ length: count }, star);
      if (reduce) draw(performance.now());
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (now - lastAt < FRAME_MS) return;
      lastAt = now;
      draw(now);
    };

    const sync = () => {
      if (reduce) return;
      cancelAnimationFrame(raf);
      raf = document.hidden ? 0 : requestAnimationFrame(frame);
    };

    resize();
    sync();
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", sync);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return (
    <div
      aria-hidden
      style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}
    >
      <canvas ref={ref} style={{ display: "block" }} />
    </div>
  );
}
