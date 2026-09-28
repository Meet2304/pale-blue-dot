"use client";

import { useEffect, useRef, type CSSProperties } from "react";

import {
  densityGrid,
  hexToRgb,
  mulberry32,
  rampColor,
  sampleShape,
  type ShapeId,
} from "../engine";

/**
 * Current: Murmuration's flow with Glyph's texture, on two layers and two
 * clocks.
 *
 * - The stipple layer runs at display rate. Particles flow along currents to
 *   each form and never fully settle: every one keeps circulating around its
 *   place, and one in eleven wanders wide, drawing wisps with its trail.
 * - The glyph layer ticks at ~20 fps on its own canvas. It only writes in the
 *   haze and at the edges, where the stipple is thin, so glyphs add grain to
 *   the form instead of drawing it. Each cell changes on its own staggered
 *   clock, which is what keeps the texture alive without saturating.
 *
 * The palette is live: changing it cross-fades every particle and glyph to the
 * new accent without restarting the field.
 */

/** Three tiers of light marks. No letters, and none of the heavy glyphs
    (@ # % &) that turn texture into noise. */
export const GLYPH_TIERS = [
  [".", "·", "'", ",", "`", "°", "¨"],
  [":", ";", "-", "~", "¦", "/", "\\", "|", "¬"],
  ["+", "×", "=", "÷", "*", "^", "<", ">"],
];

/** Strokes for the cursor's field lines, by angle: 0°, 45°, 90°, 135°
    (screen y points down). */
const FIELD_STROKES = ["-", "\\", "|", "/"];

const COUNT = 8000;
const TRAIL = 0.17;
const FLOW = 0.028;
const WANDER_EVERY = 11;
/* The glyph grid is close to the particle scale, so marks read as grain in
   the same material rather than as a second layer on top of it. */
const GLYPH_CELL = 6.5;
/** The cell size the glyph tuning (gain, chances) was set at. */
const TUNED_CELL = 9;
const GLYPH_MS = 50;
const BINS = 24;

const hash = (i: number, e: number) => {
  const s = Math.sin(i * 12.9898 + e * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

export function CurrentField({
  shape,
  palette,
  name = "Meet Bhatt",
  nameFontVar,
  monoFontVar,
  focusX = 0.5,
  interactive = true,
  count = COUNT,
  glyphSize = GLYPH_CELL,
  glyphDensity = 3,
  className,
  style,
}: {
  shape: ShapeId;
  /** Five stops, deep to white. Changing it cross-fades the whole field. */
  palette: string[];
  name?: string;
  nameFontVar?: string;
  monoFontVar?: string;
  focusX?: number;
  interactive?: boolean;
  count?: number;
  /** Glyph cell in CSS px. Live: changing it re-grids without a restart. */
  glyphSize?: number;
  /** Multiplier on how many cells carry a glyph. Live. */
  glyphDensity?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const baseRef = useRef<HTMLCanvasElement>(null);
  const glyphRef = useRef<HTMLCanvasElement>(null);
  const shapeRef = useRef(shape);
  const paletteRef = useRef(palette);
  const glyphSizeRef = useRef(glyphSize);
  const glyphDensityRef = useRef(glyphDensity);
  const retargetRef = useRef<((id: ShapeId) => void) | null>(null);

  useEffect(() => {
    shapeRef.current = shape;
    retargetRef.current?.(shape);
  }, [shape]);

  useEffect(() => {
    paletteRef.current = palette;
  }, [palette]);

  useEffect(() => {
    glyphSizeRef.current = glyphSize;
  }, [glyphSize]);

  useEffect(() => {
    glyphDensityRef.current = glyphDensity;
  }, [glyphDensity]);

  useEffect(() => {
    const base = baseRef.current;
    const glyph = glyphRef.current;
    const ctx = base?.getContext("2d");
    const gtx = glyph?.getContext("2d");
    if (!base || !glyph || !ctx || !gtx) return;

    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const n = count;
    const rnd = mulberry32(5);

    const x = new Float32Array(n);
    const y = new Float32Array(n);
    const fx = new Float32Array(n);
    const fy = new Float32Array(n);
    const tx = new Float32Array(n);
    const ty = new Float32Array(n);
    const hueF = new Float32Array(n);
    const hueT = new Float32Array(n);
    const hue = new Float32Array(n);
    const delay = new Float32Array(n);
    const phase = new Float32Array(n);
    const size = new Float32Array(n);
    const turn = new Float32Array(n);
    const sx = new Float32Array(n);
    const sy = new Float32Array(n);
    const moving = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      x[i] = fx[i] = (rnd() - 0.5) * 5;
      y[i] = fy[i] = (rnd() - 0.5) * 3.4;
      phase[i] = rnd() * Math.PI * 2;
      size[i] = 0.45 + Math.pow(rnd(), 3) * 1.6;
      turn[i] = rnd() < 0.5 ? -1 : 1;
    }

    let w = 0;
    let h = 0;
    let dpr = 1;
    let unit = 1;
    let cx = 0;
    let cy = 0;
    let start = performance.now();
    let dur = 3600;
    let raf = 0;
    let visible = true;
    let lastGlyph = 0;
    let needsDraw = true;
    let current: ShapeId = shapeRef.current;
    const pointer = { x: 1e9, y: 1e9 };
    /* The wake: each particle carries a small offset with its own velocity,
       stirred by the cursor's motion and eased home by a soft spring. */
    const ox = new Float32Array(n);
    const oy = new Float32Array(n);
    const vx = new Float32Array(n);
    const vy = new Float32Array(n);
    let lastStep = performance.now();
    let lastPx = 1e9;
    let lastPy = 1e9;
    let pvx = 0;
    let pvy = 0;
    let cursorSpeed = 0;
    /* Where the glyphs think the cursor is: it trails the real one, and its
       strength fades in and out as the cursor enters and leaves. */
    let lensX = 0;
    let lensY = 0;
    let lens = 0;

    let gcell = glyphSizeRef.current;
    let gw = 0;
    let gh = 0;
    let grid = new Float32Array(0);
    let motion = new Float32Array(0);
    let tmp = new Float32Array(0);

    /* The live palette: current colours ease toward the target each frame. */
    let live = paletteRef.current.map(hexToRgb);
    let bins: string[] = [];
    let tiers: string[] = [];
    const rebuild = () => {
      bins = Array.from({ length: BINS }, (_, b) => {
        const c = rampColor(live, 0.12 + (b / (BINS - 1)) * 0.88);
        return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
      });
      const css = (c: number[]) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
      tiers = [css(live[1]), css(live[2]), css(live[3]), css(live[4])];
    };
    rebuild();
    const binCount = new Int32Array(BINS);
    const binIdx = new Int32Array(BINS * n);

    const fontOf = (v?: string, fallback = "sans-serif") =>
      (v && getComputedStyle(base).getPropertyValue(v).trim()) || fallback;

    const shapeFor = (id: ShapeId) => {
      const s = sampleShape(id, n, {
        halfW: w / 2 / unit || 1.6,
        seed: 3,
        text: name,
        font: fontOf(nameFontVar),
        weight: 300,
      });
      if (id === "name") {
        const shiftX = (w / 2 - cx) / unit;
        const lift = w < 760 ? 0 : -0.45;
        for (let i = 0; i < n; i++) {
          s.xy[i * 2] += shiftX;
          s.xy[i * 2 + 1] += lift;
        }
      }
      return s;
    };

    const retarget = (id: ShapeId, animate = true) => {
      current = id;
      const s = shapeFor(id);
      for (let i = 0; i < n; i++) {
        fx[i] = x[i];
        fy[i] = y[i];
        tx[i] = s.xy[i * 2];
        ty[i] = s.xy[i * 2 + 1];
        hueF[i] = hue[i];
        hueT[i] = s.hue[i];
        delay[i] = rnd() * 1100;
        if (!animate || calm) {
          x[i] = fx[i] = tx[i];
          y[i] = fy[i] = ty[i];
          hue[i] = hueF[i] = hueT[i];
        }
      }
      start = performance.now();
      if (animate) dur = 2600;
      needsDraw = true;
    };
    retargetRef.current = (id) => retarget(id, true);

    const resize = () => {
      const box = base.getBoundingClientRect();
      w = Math.max(1, box.width);
      h = Math.max(1, box.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      for (const c of [base, glyph]) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
      const narrow = w < 760;
      const wide = w / h > 2.2;
      unit = wide ? (h / 2) * 0.9 : (Math.min(w, h) / 2) * (narrow ? 0.78 : 0.9);
      cx = w * (narrow || wide ? 0.5 : focusX);
      cy = narrow && !wide ? h * 0.3 : h / 2;
      regrid();
      const s = shapeFor(current);
      for (let i = 0; i < n; i++) {
        tx[i] = s.xy[i * 2];
        ty[i] = s.xy[i * 2 + 1];
        hueT[i] = s.hue[i];
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);
      needsDraw = true;
    };

    /* The glyph grid follows the live size. Smaller cells hold fewer
       particles, so the gain is rescaled by area to keep each cell's tier
       honest. The chance a cell carries a glyph is not rescaled: smaller
       cells means more of them, so finer glyphs come out denser, the way a
       finer grain reads as more texture rather than less. */
    function regrid() {
      gcell = glyphSizeRef.current;
      gw = Math.ceil(w / gcell);
      gh = Math.ceil(h / gcell);
      grid = new Float32Array(gw * gh);
      motion = new Float32Array(gw * gh);
      tmp = new Float32Array(gw * gh);
    }

    const ease = (t: number) => 1 - Math.pow(1 - t, 3.2);

    const step = (now: number) => {
      const t = now / 1000;
      /* Frame-rate independent: 1 = one 60 Hz frame. */
      const dt = Math.min(3, Math.max(0.25, (now - lastStep) / 16.67));
      lastStep = now;
      const inside = pointer.x < 1e8 && lastPx < 1e8;
      const rawX = inside ? (pointer.x - lastPx) / dt : 0;
      const rawY = inside ? (pointer.y - lastPy) / dt : 0;
      lastPx = pointer.x;
      lastPy = pointer.y;
      pvx += (rawX - pvx) * 0.25;
      pvy += (rawY - pvy) * 0.25;
      cursorSpeed = Math.hypot(pvx, pvy);
      const reach = 0.3 * unit;
      const stirring = interactive && !calm && cursorSpeed > 0.2;
      const damp = Math.pow(0.9, dt);
      let any = false;
      for (let i = 0; i < n; i++) {
        let p = (now - start - delay[i]) / dur;
        p = p < 0 ? 0 : p > 1 ? 1 : p;
        moving[i] = p > 0 && p < 1 ? 1 : 0;
        if (p < 1) any = true;
        const e = ease(p);
        const dx = tx[i] - fx[i];
        const dy = ty[i] - fy[i];
        let px = fx[i] + dx * e;
        let py = fy[i] + dy * e;
        /* The journey: carried sideways by the current, strongest mid-flight. */
        const arc = Math.sin(Math.PI * e);
        const a =
          Math.sin(px * 2.3 + t * 0.4) * 2.2 + Math.cos(py * 1.9 - t * 0.3) * 2.2;
        px += Math.cos(a) * arc * 0.34;
        py += Math.sin(a) * arc * 0.34;
        /* The rest: never quite still. Each particle circles its place on a
           slowly turning current; a few wander wide and draw wisps. */
        if (!calm) {
          const wander = i % WANDER_EVERY === 0 ? 7 : 1;
          const amp = FLOW * wander * (0.5 + size[i] * 0.4) * (0.35 + 0.65 * e);
          const b =
            Math.sin(tx[i] * 1.7 + t * 0.23) * 1.8 +
            Math.cos(ty[i] * 2.1 - t * 0.17) * 1.8 +
            t * (0.5 + size[i] * 0.2) * turn[i] +
            phase[i];
          px += Math.cos(b) * amp;
          py += Math.sin(b) * amp * 0.8;
        }
        x[i] = px;
        y[i] = py;
        hue[i] = hueF[i] + (hueT[i] - hueF[i]) * e;
        let X = cx + px * unit;
        let Y = cy + py * unit;
        /* A hand through water, not a magnet. Only a moving cursor does
           anything: nearby particles are drawn along its path, and curl into
           two counter-rotating eddies either side of it, then drift home on
           a slightly under-damped spring, so they settle rather than snap. */
        if (interactive && !calm) {
          if (stirring) {
            const ddx = X + ox[i] - pointer.x;
            const ddy = Y + oy[i] - pointer.y;
            const d2 = ddx * ddx + ddy * ddy;
            if (d2 < reach * reach) {
              const d = Math.sqrt(d2) || 1;
              const k = 1 - d / reach;
              const wgt = k * k * (3 - 2 * k);
              vx[i] += pvx * wgt * 0.06 * dt;
              vy[i] += pvy * wgt * 0.06 * dt;
              const side = pvx * ddy - pvy * ddx > 0 ? 1 : -1;
              const swirl = cursorSpeed * wgt * 0.035 * dt * side;
              vx[i] += (-ddy / d) * swirl;
              vy[i] += (ddx / d) * swirl;
            }
          }
          vx[i] = (vx[i] - ox[i] * 0.012 * dt) * damp;
          vy[i] = (vy[i] - oy[i] * 0.012 * dt) * damp;
          ox[i] += vx[i] * dt;
          oy[i] += vy[i] * dt;
          X += ox[i];
          Y += oy[i];
        }
        sx[i] = X;
        sy[i] = Y;
      }
      return any;
    };

    const drawStipple = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = `rgba(0,0,0,${calm ? 1 : TRAIL})`;
      ctx.fillRect(0, 0, w, h);
      binCount.fill(0);
      for (let i = 0; i < n; i++) {
        const b = Math.min(BINS - 1, Math.floor(hue[i] * BINS));
        binIdx[b * n + binCount[b]++] = i;
      }
      for (let b = 0; b < BINS; b++) {
        ctx.fillStyle = bins[b];
        for (let k = 0; k < binCount[b]; k++) {
          const i = binIdx[b * n + k];
          const s = size[i] > 1.4 ? 2 : 1.1;
          ctx.fillRect(sx[i], sy[i], s, s);
        }
      }
    };

    /* Cell lists per tier, reused every tick. */
    const cellsX: number[][] = [[], [], [], []];
    const cellsY: number[][] = [[], [], [], []];
    const cellsC: string[][] = [[], [], [], []];

    const drawGlyphs = (now: number) => {
      if (gcell !== glyphSizeRef.current) regrid();
      const area = (gcell * gcell) / (TUNED_CELL * TUNED_CELL);
      densityGrid(sx, sy, n, gcell, gw, gh, grid, 1, tmp);
      densityGrid(sx, sy, n, gcell, gw, gh, motion, 0, tmp, moving);
      for (let k = 0; k < 4; k++) {
        cellsX[k].length = 0;
        cellsY[k].length = 0;
        cellsC[k].length = 0;
      }
      /* The cursor reveals the current. Around it, glyphs turn into strokes
         (- \ | /) laid along a slow swirl, like filings along field lines.
         It answers position rather than movement, so it is there at rest; a
         twist travels outward through the strokes so it is never static; and
         its rim is frayed by per-cell noise, so it never reads as a disc. */
      const inside = interactive && !calm && pointer.x < 1e8;
      if (inside) {
        if (lens < 0.01) {
          lensX = pointer.x;
          lensY = pointer.y;
        }
        lensX += (pointer.x - lensX) * 0.35;
        lensY += (pointer.y - lensY) * 0.35;
      }
      lens += ((inside ? 1 : 0) - lens) * 0.18;
      const reach = 0.42 * unit;
      const twist = now * 0.0021;
      for (let gy = 0; gy < gh; gy++) {
        for (let gx = 0; gx < gw; gx++) {
          const i = gy * gw + gx;
          const v = 1 - Math.exp((-grid[i] * 0.6) / area);
          const X = (gx + 0.5) * gcell;
          const Y = (gy + 0.5) * gcell;

          let f = 0;
          let ang = 0;
          if (lens > 0.01) {
            const dx = X - lensX;
            const dy = Y - lensY;
            const d = Math.hypot(dx, dy);
            if (d < reach) {
              const k = 1 - d / reach;
              f = k * k * (3 - 2 * k) * lens * (0.6 + 0.4 * hash(i, 3));
              /* Tangent to the cursor, bent by a twist that travels outward. */
              ang =
                Math.atan2(dy, dx) + Math.PI / 2 + 0.55 * Math.sin(d * 0.045 - twist);
            }
          }
          if (v < 0.035 && f < 0.08) continue;

          /* Each cell keeps its own clock; cells in transit re-decide fast. */
          const inTransit = motion[i] > grid[i] * 0.4;
          const clock = inTransit ? now / 90 : now / 1500 + hash(i, 1) * 3;
          const epoch = calm ? 0 : Math.floor(clock);

          if (f > 0.08) {
            /* In empty space the field shows only as a sparse scatter; over
               the form it is denser. Either way it thins toward the rim. */
            const show = (v < 0.035 ? 0.32 : 0.85) * f;
            if (hash(i + 13, Math.floor(now / 700 + hash(i, 5) * 2)) < show) {
              const a = ((ang % Math.PI) + Math.PI) % Math.PI;
              const stroke = FIELD_STROKES[Math.round(a / (Math.PI / 4)) % 4];
              /* One step brighter than the grain around it, so it reads. */
              const t = f > 0.45 ? 3 : 2;
              cellsX[t].push(X);
              cellsY[t].push(Y);
              cellsC[t].push(stroke);
              continue;
            }
            /* Near the cursor the ordinary grain thins out, so the field
               lines have room to be seen. */
            if (hash(i + 29, epoch) < f * 0.9) continue;
          }

          const tier = v < 0.2 ? 0 : v < 0.48 ? 1 : v < 0.8 ? 2 : 3;
          const chance = Math.min(
            0.95,
            (tier === 0 ? 0.26 : tier === 1 ? 0.2 : tier === 2 ? 0.14 : 0.03) *
              glyphDensityRef.current,
          );
          if (hash(i, epoch) > chance) continue;
          /* The dense core only gets the faintest sparks: the stipple owns it. */
          const set = GLYPH_TIERS[tier === 3 ? 0 : tier];
          cellsX[tier].push(X);
          cellsY[tier].push(Y);
          cellsC[tier].push(set[Math.floor(hash(i + 7, epoch) * set.length)]);
        }
      }
      gtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      gtx.clearRect(0, 0, w, h);
      gtx.font = `${gcell * 0.95}px ${fontOf(monoFontVar, "monospace")}`;
      gtx.textAlign = "center";
      gtx.textBaseline = "middle";
      const alpha = [0.42, 0.58, 0.66, 0.8];
      for (let k = 0; k < 4; k++) {
        gtx.fillStyle = tiers[k];
        gtx.globalAlpha = alpha[k];
        for (let j = 0; j < cellsX[k].length; j++) {
          gtx.fillText(cellsC[k][j], cellsX[k][j], cellsY[k][j]);
        }
      }
      gtx.globalAlpha = 1;
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible) return;

      /* Ease the live palette toward the target. */
      const target = paletteRef.current.map(hexToRgb);
      let delta = 0;
      live = live.map((c, s) =>
        c.map((v, k) => {
          const nv = v + (target[s][k] - v) * 0.06;
          delta += Math.abs(target[s][k] - nv);
          return nv;
        }),
      ) as typeof live;
      if (delta > 1) {
        rebuild();
        needsDraw = true;
      }

      const moved = step(now);
      if (calm && !moved && !needsDraw) return;
      drawStipple();
      if (now - lastGlyph >= GLYPH_MS || needsDraw) {
        lastGlyph = now;
        drawGlyphs(now);
      }
      needsDraw = false;
    };

    resize();
    retarget(current, true);
    dur = 3600;
    if (calm) retarget(current, false);
    raf = requestAnimationFrame(loop);

    document.fonts?.ready.then(() => {
      if (current === "name") retarget("name", true);
      needsDraw = true;
    });

    const ro = new ResizeObserver(resize);
    ro.observe(base);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(base);

    const onMove = (e: PointerEvent) => {
      const box = base.getBoundingClientRect();
      pointer.x = e.clientX - box.left;
      pointer.y = e.clientY - box.top;
    };
    const onLeave = () => {
      pointer.x = pointer.y = 1e9;
    };
    if (interactive && !calm) {
      window.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("pointerleave", onLeave);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      retargetRef.current = null;
    };
  }, [name, nameFontVar, monoFontVar, focusX, interactive, count]);

  return (
    /* The wrapper must be positioned by its className; the canvases fill it. */
    <div className={className} style={style} aria-hidden>
      {/* Fading trails by 17% a frame stalls at 2 or 3 of 255, because 8-bit
          rounding keeps giving the same value back, which leaves ghost arcs.
          A contrast of 1.035 maps everything under ~4/255 to true black on the
          GPU, for nothing. */}
      <canvas
        ref={baseRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          filter: "contrast(1.035)",
        }}
      />
      <canvas
        ref={glyphRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
    </div>
  );
}
