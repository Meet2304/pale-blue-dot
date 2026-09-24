"use client";

import { useEffect, useRef } from "react";

/**
 * A plain, fixed star field shared by the concepts that want one. Deliberately
 * simpler than the site's StarField: no gate, no reveal, just points that
 * twinkle and optionally slide with scroll to sell motion through space.
 */
export function Sky({
  density = 9000,
  tint = "255,255,255",
  parallax = 0,
  className,
}: {
  /** CSS px² per star. Lower is denser. */
  density?: number;
  /** An "r,g,b" string. */
  tint?: string;
  /** How far, in px per px scrolled, the nearest stars slide. */
  parallax?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let stars: { x: number; y: number; r: number; z: number; p: number; s: number }[] =
      [];
    let w = 0;
    let h = 0;
    let raf = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round((w * h) / density);
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        z: Math.random(),
        r: Math.random() * 0.9 + 0.25,
        p: Math.random() * Math.PI * 2,
        s: 0.3 + Math.random() * 1.2,
      }));
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      const scroll = window.scrollY * parallax;
      for (const st of stars) {
        const twinkle = still
          ? 0.8
          : 0.55 + 0.45 * Math.abs(Math.sin(st.p + (t / 1000) * st.s));
        const y = (((st.y - scroll * st.z) % h) + h) % h;
        ctx.globalAlpha = twinkle * (0.35 + st.z * 0.65);
        ctx.fillStyle = `rgb(${tint})`;
        ctx.beginPath();
        ctx.arc(st.x, y, st.r * (0.6 + st.z * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
      if (!still) raf = requestAnimationFrame(draw);
    };

    resize();
    raf = requestAnimationFrame(draw);
    const onScroll = () => {
      if (still) draw(0);
    };
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
    };
  }, [density, tint, parallax]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={className}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
}
