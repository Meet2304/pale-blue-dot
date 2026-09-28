"use client";

import { useEffect, useRef } from "react";

import { mulberry32, rampColor, sampleShape, type ShapeId } from "../../engine";
import { fit, livePalette } from "../live-palette";

/**
 * Gravity: the cursor is a point mass, and everything behind it is lensed.
 *
 * Each source at distance r from the lens forms two images, at
 *   θ± = (r ± √(r² + 4θE²)) / 2
 * along the same line, the second on the far side and fainter, each
 * magnified by |1 / (1 − (θE/θ)⁴)|. That is the whole trick, and it is
 * the real one: sources near alignment smear into arcs, and a source dead
 * behind the lens becomes an Einstein ring.
 *
 * Three things are lensed: a background of stars, the form (a galaxy by
 * default), and a spacetime grid whose intersections carry glyphs. Near the
 * lens the glyphs turn into strokes along the shear, so the texture itself
 * shows the stretching.
 */

const STARS = 2400;
const FORM = 5200;
const GRID = 46;
const SAMPLE = 9;

export function GravityCanvas({
  shape,
  palette,
  className,
}: {
  shape: ShapeId;
  palette: string[];
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const shapeRef = useRef(shape);
  const paletteRef = useRef(palette);
  const retargetRef = useRef<((id: ShapeId) => void) | null>(null);

  useEffect(() => {
    shapeRef.current = shape;
    retargetRef.current?.(shape);
  }, [shape]);

  useEffect(() => {
    paletteRef.current = palette;
  }, [palette]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rnd = mulberry32(21);
    const pal = livePalette(paletteRef);

    let w = 0;
    let h = 0;
    let dpr = 1;
    let unit = 1;
    let fcx = 0;
    let fcy = 0;

    /* Stars: fixed in screen space, drifting very slowly. */
    const stX = new Float32Array(STARS);
    const stY = new Float32Array(STARS);
    const stB = new Float32Array(STARS);
    const stP = new Float32Array(STARS);

    /* The form, in units, morphing like the rest of the lab. */
    const fx = new Float32Array(FORM);
    const fy = new Float32Array(FORM);
    const ox = new Float32Array(FORM);
    const oy = new Float32Array(FORM);
    const tx = new Float32Array(FORM);
    const ty = new Float32Array(FORM);
    const hue = new Float32Array(FORM);
    const hueT = new Float32Array(FORM);
    const delay = new Float32Array(FORM);
    for (let i = 0; i < FORM; i++) {
      fx[i] = ox[i] = (rnd() - 0.5) * 5;
      fy[i] = oy[i] = (rnd() - 0.5) * 3;
      delay[i] = rnd() * 900;
    }
    let start = performance.now();
    let current: ShapeId = shapeRef.current;

    const retarget = (id: ShapeId) => {
      current = id;
      const font =
        getComputedStyle(canvas).getPropertyValue("--font-display").trim() ||
        "sans-serif";
      const s = sampleShape(id, FORM, {
        halfW: (w * 0.5) / unit || 1.6,
        seed: 9,
        text: "Meet Bhatt",
        font,
        weight: 300,
      });
      const now = performance.now();
      for (let i = 0; i < FORM; i++) {
        /* Start from wherever the particle is now. */
        const k =
          1 -
          Math.pow(1 - Math.max(0, Math.min(1, (now - start - delay[i]) / 2200)), 3);
        ox[i] = ox[i] + (tx[i] - ox[i]) * k;
        oy[i] = oy[i] + (ty[i] - oy[i]) * k;
        tx[i] = s.xy[i * 2];
        ty[i] = s.xy[i * 2 + 1];
        hueT[i] = s.hue[i];
      }
      start = now;
    };
    retargetRef.current = retarget;

    const resize = () => {
      ({ w, h, dpr } = fit(canvas, 2));
      unit = (Math.min(w, h) / 2) * 0.72;
      fcx = w * (w < 760 ? 0.5 : 0.62);
      fcy = h * (w < 760 ? 0.35 : 0.5);
      for (let i = 0; i < STARS; i++) {
        stX[i] = rnd() * w;
        stY[i] = rnd() * h;
        stB[i] = 0.25 + Math.pow(rnd(), 2.5) * 0.75;
        stP[i] = rnd() * Math.PI * 2;
      }
      retarget(current);
      start -= 5000;
    };

    /* The lens: follows the cursor, wanders when there is none. */
    const pointer = { x: 0, y: 0, in: false, down: false };
    let lx = 0;
    let ly = 0;
    let mass = 1;
    let presence = 0;

    let raf = 0;
    let visible = true;

    const binCount = 24;
    let bins: string[] = [];
    const rebuild = () => {
      const live = pal.get();
      bins = Array.from({ length: binCount }, (_, b) => {
        const c = rampColor(live, 0.15 + (b / (binCount - 1)) * 0.85);
        return pal.css(c as [number, number, number]);
      });
    };
    rebuild();

    /* Lensing, reused by everything. Writes up to two images into out. */
    const out = new Float32Array(6);
    let thetaE = 1;
    let shadow = 1;
    const lens = (sx: number, sy: number) => {
      const bx = sx - lx;
      const by = sy - ly;
      const r = Math.hypot(bx, by) || 0.001;
      const ux = bx / r;
      const uy = by / r;
      const root = Math.sqrt(r * r + 4 * thetaE * thetaE);
      const tp = (r + root) / 2;
      const tm = (root - r) / 2;
      const mp = Math.abs(1 / (1 - Math.pow(thetaE / tp, 4)));
      const mm = Math.abs(1 / (1 - Math.pow(thetaE / tm, 4)));
      out[0] = lx + ux * tp;
      out[1] = ly + uy * tp;
      out[2] = Math.min(mp, 4);
      out[3] = lx - ux * tm;
      out[4] = ly - uy * tm;
      out[5] = tm > shadow ? Math.min(mm, 3) : 0;
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      const t = now / 1000;
      if (pal.tick()) rebuild();

      /* Where the lens is, and how heavy. */
      const idleX = fcx + Math.sin(t * 0.13) * w * 0.28;
      const idleY = fcy + Math.sin(t * 0.21 + 1) * h * 0.2;
      presence += ((pointer.in ? 1 : 0) - presence) * 0.05;
      const targetX = idleX + (pointer.x - idleX) * presence;
      const targetY = idleY + (pointer.y - idleY) * presence;
      lx += (targetX - lx) * (calm ? 1 : 0.12);
      ly += (targetY - ly) * (calm ? 1 : 0.12);
      mass += ((pointer.down ? 2.4 : 1) - mass) * 0.05;
      thetaE = Math.min(w, h) * 0.085 * Math.sqrt(mass);
      shadow = thetaE * 0.36;
      const live = pal.get();

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);

      /* 1. Spacetime grid: primary images only, tinted near the lens. */
      ctx.lineWidth = 1;
      const tint = pal.css(live[2], 0.5);
      const plain = "rgba(120,130,150,0.16)";
      const drawLine = (x0: number, y0: number, x1: number, y1: number) => {
        const len = Math.hypot(x1 - x0, y1 - y0);
        const n = Math.ceil(len / SAMPLE);
        ctx.beginPath();
        let near = false;
        for (let k = 0; k <= n; k++) {
          const px = x0 + ((x1 - x0) * k) / n;
          const py = y0 + ((y1 - y0) * k) / n;
          lens(px, py);
          if (Math.hypot(out[0] - lx, out[1] - ly) < thetaE * 2.2) near = true;
          if (k === 0) ctx.moveTo(out[0], out[1]);
          else ctx.lineTo(out[0], out[1]);
        }
        ctx.strokeStyle = near ? tint : plain;
        ctx.stroke();
      };
      for (let x = (w % GRID) / 2; x < w; x += GRID) drawLine(x, 0, x, h);
      for (let y = (h % GRID) / 2; y < h; y += GRID) drawLine(0, y, w, y);

      /* Grid glyphs: a quiet + at every crossing; along the shear near the
         lens they become strokes laid tangent to it. */
      ctx.font = "7px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const strokes = ["-", "\\", "|", "/"];
      for (let x = (w % GRID) / 2; x < w; x += GRID) {
        for (let y = (h % GRID) / 2; y < h; y += GRID) {
          lens(x, y);
          const dx = out[0] - lx;
          const dy = out[1] - ly;
          const d = Math.hypot(dx, dy);
          const shear = Math.min(1, (thetaE * 1.8) / Math.max(d, 1)) ** 2;
          let ch = "+";
          if (shear > 0.25) {
            const a =
              (((Math.atan2(dy, dx) + Math.PI / 2) % Math.PI) + Math.PI) % Math.PI;
            ch = strokes[Math.round(a / (Math.PI / 4)) % 4];
          }
          ctx.fillStyle =
            shear > 0.25
              ? pal.css(live[3], 0.35 + shear * 0.5)
              : "rgba(150,160,180,0.3)";
          ctx.fillText(ch, out[0], out[1]);
        }
      }

      /* 2. Stars: both images, magnified. */
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < STARS; i++) {
        const sx = (stX[i] + t * 1.5) % w;
        const tw = calm ? 0.8 : 0.6 + 0.4 * Math.sin(t * 1.3 + stP[i]);
        lens(sx, stY[i]);
        const b = stB[i] * tw;
        ctx.fillStyle = "#e8edf8";
        ctx.globalAlpha = Math.min(1, b * out[2] * 0.7);
        const s1 = Math.min(3, 1 + (out[2] - 1) * 0.35);
        ctx.fillRect(out[0], out[1], s1, s1);
        if (out[5] > 0.05) {
          ctx.globalAlpha = Math.min(1, b * out[5] * 0.6);
          ctx.fillRect(out[3], out[4], 1.2, 1.2);
        }
      }

      /* 3. The form: flowing, then lensed. */
      const rot = calm ? 0 : t * 0.04;
      const cr = Math.cos(rot);
      const sr = Math.sin(rot);
      for (let i = 0; i < FORM; i++) {
        let p = (now - start - delay[i]) / 2200;
        p = p < 0 ? 0 : p > 1 ? 1 : p;
        const e = 1 - Math.pow(1 - p, 3);
        let px = ox[i] + (tx[i] - ox[i]) * e;
        let py = oy[i] + (ty[i] - oy[i]) * e;
        hue[i] += (hueT[i] - hue[i]) * 0.05;
        if (current === "spiral" || current === "ring") {
          const rx = px * cr - py * sr;
          py = px * sr + py * cr;
          px = rx;
        }
        if (!calm) {
          const a =
            Math.sin(tx[i] * 1.7 + t * 0.23) * 1.8 +
            Math.cos(ty[i] * 2.1 - t * 0.17) * 1.8 +
            t * 0.6;
          px += Math.cos(a) * 0.012;
          py += Math.sin(a) * 0.01;
        }
        lens(fcx + px * unit, fcy + py * unit);
        const b = Math.min(binCount - 1, Math.floor(hue[i] * binCount));
        ctx.fillStyle = bins[b];
        ctx.globalAlpha = Math.min(1, 0.55 * out[2]);
        const s1 = Math.min(2.6, 1.1 + (out[2] - 1) * 0.3);
        ctx.fillRect(out[0], out[1], s1, s1);
        if (out[5] > 0.05) {
          ctx.globalAlpha = Math.min(1, 0.5 * out[5]);
          ctx.fillRect(out[3], out[4], 1.2, 1.2);
        }
      }

      /* 4. The lens itself: a shadow and a thin photon ring. */
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      const g = ctx.createRadialGradient(lx, ly, shadow * 0.85, lx, ly, shadow * 1.6);
      g.addColorStop(0, "rgba(0,0,0,1)");
      g.addColorStop(0.35, pal.css(live[4], 0.55));
      g.addColorStop(0.5, pal.css(live[2], 0.25));
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(lx, ly, shadow * 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(lx, ly, shadow * 0.9, 0, Math.PI * 2);
      ctx.fill();
    };

    resize();
    lx = fcx;
    ly = fcy;
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
      pointer.down = false;
    };
    const onDown = () => {
      if (pointer.in) pointer.down = true;
    };
    const onUp = () => {
      pointer.down = false;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      retargetRef.current = null;
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={className} />;
}
