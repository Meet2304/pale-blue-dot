"use client";

import { useEffect, useRef } from "react";

/* Dither thresholds, 4 × 4: which cells light first as the light rises. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(
  (v) => (v + 0.5) / 16,
);
/* The glyphs, faintest to brightest: the terminal's own light. */
const RAMP = ["·", ":", "-", "~", "=", "+", "*"];

const hash = (a: number, b: number, c: number) => {
  const x = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * The air over the horizon, in characters: a band of the terminal's glyphs
 * behind the rim of the world on the contact page, densest where it rises
 * from the black edge and thinning out, dithered, into the sky. It lives: light runs slowly
 * along the rim like an aurora, each glyph re-decides itself now and then,
 * and the air brightens and stirs where the pointer passes. It follows the
 * planet (the element marked [data-planet] beside it) as it rises. Under
 * reduced motion it is drawn once and holds still.
 */
export function HorizonGlyphs({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const g = canvas?.getContext("2d");
    const planet = canvas?.parentElement?.querySelector<HTMLElement>("[data-planet]");
    if (!canvas || !g || !planet) return;
    const quiet = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let raf = 0;
    let last = 0;
    let visible = true;
    const pointer = { x: -1e4, y: -1e4, heat: 0 };
    const mono =
      getComputedStyle(canvas).getPropertyValue("--plex-mono").trim() || "monospace";

    const size = () => {
      const box = canvas.getBoundingClientRect();
      w = box.width;
      h = box.height;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now: number) => {
      const t = quiet ? 0 : now / 1000;
      const box = canvas.getBoundingClientRect();
      const pb = planet.getBoundingClientRect();
      const R = pb.width / 2;
      const cx = pb.left - box.left + R;
      const cy = pb.top - box.top + R;
      const narrow = w < 640;
      const cw = narrow ? 6 : 7;
      const ch = narrow ? 10 : 12;
      /* How far the air reaches above the rim. It lies behind the world, so
         below the rim (a row, for the rim's own edge) nothing shows. */
      const OUT = Math.min(300, Math.max(150, h * 0.3));
      const IN = ch;
      pointer.heat *= 0.92;

      g.clearRect(0, 0, w, h);
      g.font = `${ch * 0.9}px ${mono}`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      const cols = Math.ceil(w / cw);
      for (let gx = 0; gx < cols; gx++) {
        const X = (gx + 0.5) * cw;
        const dx = X - cx;
        if (Math.abs(dx) >= R) continue;
        const rim = cy - Math.sqrt(R * R - dx * dx);
        const gy0 = Math.max(0, Math.floor((rim - OUT) / ch));
        const gy1 = Math.min(Math.ceil(h / ch), Math.ceil((rim + IN) / ch));
        /* Light runs along the rim, slowly. */
        const aurora = quiet
          ? 1
          : 0.78 +
            0.22 * Math.sin(gx * 0.07 - t * 0.55) * Math.sin(gx * 0.023 + t * 0.21);
        for (let gy = gy0; gy < gy1; gy++) {
          const Y = (gy + 0.5) * ch;
          const s = Y - rim;
          let v =
            s < 0
              ? (1 - Math.min(1, -s / OUT)) ** 2.4
              : 0.62 * (1 - Math.min(1, s / IN)) ** 1.6;
          v *= aurora;
          /* The pointer warms the air near it. */
          const pd = Math.hypot(X - pointer.x, Y - pointer.y);
          const stir = pd < 130 ? (1 - pd / 130) * pointer.heat : 0;
          v += stir * 0.35;
          /* Each cell re-decides itself every second or two. */
          const epoch = quiet
            ? 0
            : Math.floor(
                (t * (1 + stir * 6)) / (1 + hash(gx, gy, 1) * 1.6) +
                  hash(gx, gy, 2) * 9,
              );
          const jitter = (hash(gx, gy, epoch) - 0.5) * 0.18;
          const thr = BAYER[(gy & 3) * 4 + (gx & 3)];
          if (v + jitter < thr * 0.92 || v < 0.04) continue;
          const k = Math.min(
            RAMP.length - 1,
            Math.floor((v + jitter * 0.5) * RAMP.length),
          );
          const near = Math.max(0, 1 - Math.abs(s) / (OUT * 0.35));
          g.globalAlpha = Math.min(1, 0.22 + 0.7 * v);
          g.fillStyle = near > 0.55 ? "#c9e2f8" : "#92cbfb";
          g.fillText(RAMP[Math.max(0, k)], X, Y);
        }
      }
      g.globalAlpha = 1;
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      /* Twenty times a second is plenty for characters. */
      if (now - last < 50) return;
      last = now;
      draw(now);
    };

    const move = (e: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      pointer.x = e.clientX - box.left;
      pointer.y = e.clientY - box.top;
      pointer.heat = 1;
    };

    const ro = new ResizeObserver(() => {
      size();
      draw(performance.now());
    });
    ro.observe(canvas);
    size();
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible && !quiet) raf = requestAnimationFrame(frame);
    });
    io.observe(canvas);
    if (quiet) {
      /* Once the planet has settled. */
      window.setTimeout(() => draw(0), 50);
    } else window.addEventListener("pointermove", move, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", move);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden />;
}
