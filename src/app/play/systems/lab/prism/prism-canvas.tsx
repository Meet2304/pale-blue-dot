"use client";

import { useEffect, useRef } from "react";

import { ACCENTS, rampOf, type AccentKey } from "../../current/color";
import { hexToRgb, mulberry32 } from "../../engine";
import { fit, hash } from "../live-palette";

/**
 * Prism: one white beam, five kinds of work.
 *
 * Sorted by hue, the five category accents already form a spectrum: rose
 * (leadership, 15°), amber (experience, 80°), teal (research, 185°), blue
 * (home, 245°), violet (projects, 300°). So the prism does what a prism does:
 * white light goes in, and it fans out into the categories in true rainbow
 * order. The cursor turns the prism (up and down) and widens the spread (left
 * and right), and the whole spectrum sweeps with it.
 *
 * Particles run along three legs: the white beam, a short path through the
 * glass, and then their band, where turbulence grows with distance so the
 * rays loosen into rivers. Glyphs label where each band leaves the frame.
 */

const COUNT = 7200;
const BANDS = [...ACCENTS].sort((a, b) => a.h - b.h);

export function PrismCanvas({
  accentKey,
  className,
}: {
  accentKey: AccentKey;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const keyRef = useRef(accentKey);

  useEffect(() => {
    keyRef.current = accentKey;
  }, [accentKey]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rnd = mulberry32(33);

    const band = new Uint8Array(COUNT);
    const s = new Float32Array(COUNT);
    const speed = new Float32Array(COUNT);
    const lane = new Float32Array(COUNT);
    const seed = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      band[i] = Math.floor(rnd() * BANDS.length);
      s[i] = rnd();
      speed[i] = 0.16 + rnd() * 0.07;
      lane[i] = (rnd() - 0.5) * 2;
      seed[i] = rnd() * 100;
    }

    const colors = BANDS.map((a) => hexToRgb(rampOf(a).accent));
    const softs = BANDS.map((a) => hexToRgb(rampOf(a).soft));
    /* How lit each band is: all of them for home, one for a category. */
    const weight = new Float32Array(BANDS.length).fill(1);

    let w = 0;
    let h = 0;
    let dpr = 1;
    let px = 0;
    let py = 0;
    let size = 100;
    let rot = 0;
    let spread = 0.1;
    let last = performance.now();
    let raf = 0;
    let visible = true;
    const pointer = { x: 0, y: 0, in: false };

    const resize = () => {
      ({ w, h, dpr } = fit(canvas, 2));
      const narrow = w < 760;
      px = w * (narrow ? 0.3 : 0.4);
      py = h * (narrow ? 0.32 : 0.46);
      size = Math.min(w, h) * (narrow ? 0.2 : 0.2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);
    };

    /* The prism's three corners, rotated. */
    const corner = (k: number) => {
      const a = rot + (k * Math.PI * 2) / 3 - Math.PI / 2;
      return [px + Math.cos(a) * size * 0.62, py + Math.sin(a) * size * 0.62];
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;

      /* Cursor: up and down turns the prism, left and right widens the fan.
         Idle, it rocks gently on its own. */
      const idleRot = Math.sin(t * 0.35) * 0.18;
      const tRot = pointer.in
        ? (Math.max(0.15, Math.min(0.85, pointer.y / h)) - 0.5) * 0.7
        : idleRot;
      const tSpread = pointer.in
        ? 0.05 + (pointer.x / w) * 0.16
        : 0.11 + Math.sin(t * 0.23) * 0.02;
      rot += (tRot - rot) * (calm ? 1 : 0.06);
      spread += (tSpread - spread) * (calm ? 1 : 0.06);

      const key = keyRef.current;
      for (let b = 0; b < BANDS.length; b++) {
        const target = key === "home" || BANDS[b].key === key ? 1 : 0.14;
        weight[b] += (target - weight[b]) * 0.06;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.fillStyle = `rgba(0,0,0,${calm ? 1 : 0.22})`;
      ctx.fillRect(0, 0, w, h);

      /* Entry and exit points on the prism's faces. */
      const [ax, ay] = corner(0);
      const [bx, by] = corner(1);
      const [cx, cy] = corner(2);
      const inX = (ax + cx) / 2;
      const inY = (ay + cy) / 2;
      const outX = (ax + bx) / 2;
      const outY = (ay + by) / 2;
      /* Leaving the glass, the fan is centred on a direction that turns with
         the prism, bent down as a real prism bends light toward its base. */
      const base = rot * 1.6 + 0.08;

      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < COUNT; i++) {
        if (!calm) s[i] += speed[i] * dt;
        if (s[i] > 1) {
          s[i] -= 1;
          band[i] = Math.floor(hash(i, seed[i] + t) * BANDS.length);
        }
        const b = band[i];
        const si = s[i];
        let x: number;
        let y: number;
        let white = 1;
        if (si < 0.34) {
          /* The beam: white, tight, arriving from the left. */
          const k = si / 0.34;
          x = -30 + (inX + 30) * k;
          y = inY + lane[i] * 1.6;
        } else if (si < 0.42) {
          /* Through the glass. */
          const k = (si - 0.34) / 0.08;
          x = inX + (outX - inX) * k;
          y = inY + (outY - inY) * k + lane[i] * (1.6 + k * 3);
          white = 1 - k * 0.6;
        } else {
          /* The band: dispersed, loosening with distance. */
          const k = (si - 0.42) / 0.58;
          const ang =
            base + (b - (BANDS.length - 1) / 2) * spread + lane[i] * spread * 0.32;
          const dist = k * (w * 1.05);
          const turb = k * k * 26;
          x = outX + Math.cos(ang) * dist;
          y =
            outY +
            Math.sin(ang) * dist +
            Math.sin(dist * 0.012 + seed[i] + t * 0.8) * turb +
            k * k * 40;
          white = Math.max(0, 0.4 - k * 3);
        }
        const c = colors[b];
        const sc = softs[b];
        const r = c[0] + (255 - c[0]) * white;
        const g = c[1] + (255 - c[1]) * white;
        const bl = c[2] + (255 - c[2]) * white;
        const lit = si < 0.42 ? 1 : weight[b];
        ctx.globalAlpha = (si < 0.34 ? 0.5 : 0.62) * lit;
        ctx.fillStyle =
          si > 0.42 && lane[i] > 0.85
            ? `rgb(${sc[0]},${sc[1]},${sc[2]})`
            : `rgb(${r | 0},${g | 0},${bl | 0})`;
        const sz = si < 0.34 ? 1.2 : 1.4;
        ctx.fillRect(x, y, sz, sz);
      }

      /* The glass: a faint fill, glyph-dotted edges, a hot line where the
         beam enters. */
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.lineTo(cx, cy);
      ctx.closePath();
      const glass = ctx.createLinearGradient(inX, inY, outX, outY);
      glass.addColorStop(0, "rgba(255,255,255,0.08)");
      glass.addColorStop(1, "rgba(180,200,255,0.03)");
      ctx.fillStyle = glass;
      ctx.fill();
      ctx.strokeStyle = "rgba(230,236,248,0.55)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = "8px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(230,236,248,0.45)";
      const edges: [number, number, number, number][] = [
        [ax, ay, bx, by],
        [bx, by, cx, cy],
        [cx, cy, ax, ay],
      ];
      for (const [x0, y0, x1, y1] of edges) {
        for (let k = 1; k < 12; k++) {
          const f = k / 12;
          const flick = hash(k * 7 + x0, Math.floor(t * 3)) > 0.5 ? "·" : ":";
          ctx.fillText(flick, x0 + (x1 - x0) * f, y0 + (y1 - y0) * f);
        }
      }

      /* Where each band leaves the frame, its category is written in. */
      ctx.font = "12px ui-monospace, monospace";
      ctx.textAlign = "right";
      for (let b = 0; b < BANDS.length; b++) {
        const ang = base + (b - (BANDS.length - 1) / 2) * spread;
        const dx = w - 36 - outX;
        const dist = dx / Math.cos(ang);
        const k = Math.min(1, dist / (w * 1.05));
        const y = outY + Math.sin(ang) * dist + k * k * 40;
        if (y < 70 || y > h - 20) continue;
        const c = colors[b];
        ctx.globalAlpha = 0.35 + weight[b] * 0.65;
        ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
        const a = BANDS[b];
        ctx.fillText(
          `${a.mark} ${a.key === "home" ? "Home" : a.label}`,
          w - 36,
          y - 12,
        );
      }
      ctx.globalAlpha = 1;
    };

    resize();
    raf = requestAnimationFrame(frame);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    io.observe(canvas);
    const onMove = (e: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      pointer.x = e.clientX - box.left;
      pointer.y = e.clientY - box.top;
      pointer.in = pointer.y >= 0 && pointer.y <= box.height;
    };
    const onLeave = () => {
      pointer.in = false;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={className} />;
}
