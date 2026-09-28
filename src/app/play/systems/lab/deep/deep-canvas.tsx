"use client";

import { useEffect, useRef } from "react";

import { mulberry32, rampColor, sampleShape, type ShapeId } from "../../engine";
import { fit, hash, livePalette } from "../live-palette";

/**
 * Deep Field: the galaxy as a real 3D volume.
 *
 * Seven thousand points in three dimensions, projected through a camera that
 * orbits with the cursor. Depth of field does the rest: points at the focal
 * distance are sharp, everything nearer or farther swells into soft bokeh, so
 * the eye reads depth without being told. A far layer of glyphs sits behind
 * everything and turns with the camera, for parallax.
 *
 * The hero is pinned while you scroll, and scrolling flies the camera
 * straight through the galaxy. The faster you scroll, the more the stars
 * streak past.
 */

const COUNT = 5600;
const DUST = 260;
const BINS = 8;

type Vec = { x: Float32Array; y: Float32Array; z: Float32Array; hue: Float32Array };

function gauss(r: () => number) {
  let u = 0;
  while (u === 0) u = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
}

/** 3D versions of the lab's forms. */
function form3(id: ShapeId, halfW: number): Vec {
  const r = mulberry32(id.length * 31 + 7);
  const x = new Float32Array(COUNT);
  const y = new Float32Array(COUNT);
  const z = new Float32Array(COUNT);
  const hue = new Float32Array(COUNT);
  if (id === "name") {
    const s = sampleShape("name", COUNT, {
      halfW,
      seed: 4,
      text: "Meet Bhatt",
      font: "sans-serif",
      weight: 300,
    });
    for (let i = 0; i < COUNT; i++) {
      x[i] = s.xy[i * 2];
      y[i] = -s.xy[i * 2 + 1];
      z[i] = gauss(r) * 0.06;
      hue[i] = s.hue[i];
    }
    return { x, y, z, hue };
  }
  for (let i = 0; i < COUNT; i++) {
    if (id === "nebula") {
      const blobs = [
        [-0.4, 0.1, 0.1, 0.38],
        [0.3, -0.1, -0.2, 0.32],
        [0.05, 0.25, 0.3, 0.22],
        [0, 0, 0, 0.12],
      ];
      const b = blobs[Math.floor(r() * blobs.length)];
      x[i] = b[0] + gauss(r) * b[3];
      y[i] = b[1] + gauss(r) * b[3] * 0.7;
      z[i] = b[2] + gauss(r) * b[3];
      hue[i] = Math.min(1, Math.hypot(x[i], y[i], z[i]) * 0.9);
    } else if (id === "ring") {
      const a = r() * Math.PI * 2;
      const tube = gauss(r) * 0.07;
      const rad = 0.75 + tube;
      x[i] = Math.cos(a) * rad;
      z[i] = Math.sin(a) * rad;
      y[i] = gauss(r) * 0.06;
      hue[i] = 0.5 + 0.5 * Math.sin(a * 2);
      if (r() < 0.1) {
        x[i] = gauss(r) * 0.08;
        y[i] = gauss(r) * 0.08;
        z[i] = gauss(r) * 0.08;
        hue[i] = 1;
      }
    } else {
      /* Galaxy: a thin disc with two arms and a bulge. */
      if (r() < 0.15) {
        x[i] = gauss(r) * 0.14;
        y[i] = gauss(r) * 0.09;
        z[i] = gauss(r) * 0.14;
        hue[i] = 1;
      } else {
        const arm = r() < 0.5 ? 0 : Math.PI;
        const t = Math.pow(r(), 0.7);
        const rad = 0.1 + t * 1.05;
        const th = arm + t * 5.2 + gauss(r) * 0.22;
        x[i] = Math.cos(th) * rad;
        z[i] = Math.sin(th) * rad;
        y[i] = gauss(r) * 0.035 * (1.2 - t);
        hue[i] = 1 - t;
      }
    }
  }
  return { x, y, z, hue };
}

export function DeepCanvas({
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
    const pal = livePalette(paletteRef);
    const section = canvas.closest("[data-scroll-hero]") as HTMLElement | null;
    const main = canvas.closest("main") as HTMLElement | null;
    let lastCopy = "";
    const rnd = mulberry32(99);

    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;
    let visible = true;

    /* Current and target positions, for morphing between forms. */
    const cx = new Float32Array(COUNT);
    const cy = new Float32Array(COUNT);
    const cz = new Float32Array(COUNT);
    const hue = new Float32Array(COUNT);
    const size = new Float32Array(COUNT);
    const prevX = new Float32Array(COUNT);
    const prevY = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      cx[i] = (rnd() - 0.5) * 8;
      cy[i] = (rnd() - 0.5) * 8;
      cz[i] = (rnd() - 0.5) * 8;
      size[i] = 0.6 + Math.pow(rnd(), 4) * 2.4;
    }
    let target = form3(shapeRef.current, 1.4);
    retargetRef.current = (id) => {
      target = form3(id, 1.4);
    };

    /* A far layer of glyphs, turning with the camera. */
    const dust = Array.from({ length: DUST }, () => {
      const a = rnd() * Math.PI * 2;
      const e = (rnd() - 0.5) * 1.6;
      return {
        a,
        e,
        ch: ["·", "+", "×", "'", ":"][Math.floor(rnd() * 5)],
        b: 0.2 + rnd() * 0.5,
      };
    });

    /* Soft sprites, one per colour bin, rebuilt when the palette moves. */
    let sprites: HTMLCanvasElement[] = [];
    let cores: string[] = [];
    const rebuild = () => {
      const live = pal.get();
      cores = Array.from({ length: BINS }, (_, b) => {
        const c = rampColor(live, 0.2 + (b / (BINS - 1)) * 0.8);
        return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
      });
      sprites = Array.from({ length: BINS }, (_, b) => {
        const c = rampColor(live, 0.2 + (b / (BINS - 1)) * 0.8);
        const s = document.createElement("canvas");
        s.width = s.height = 24;
        const g = s.getContext("2d")!;
        const grad = g.createRadialGradient(12, 12, 0, 12, 12, 12);
        grad.addColorStop(0, `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},1)`);
        grad.addColorStop(0.18, `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},0.55)`);
        grad.addColorStop(0.55, `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},0.12)`);
        grad.addColorStop(1, `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},0)`);
        g.fillStyle = grad;
        g.fillRect(0, 0, 24, 24);
        return s;
      });
    };
    rebuild();

    const pointer = { x: 0.5, y: 0.5, in: false };
    let yaw = 0;
    let pitch = 0.42;
    let lastDist = 3.4;
    let last = performance.now();

    let mono = "monospace";
    let display = "sans-serif";
    const resize = () => {
      ({ w, h, dpr } = fit(canvas, 2));
      const cs = getComputedStyle(canvas);
      mono = cs.getPropertyValue("--font-mono").trim() || "monospace";
      display = cs.getPropertyValue("--font-display").trim() || "sans-serif";
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      const t = now / 1000;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (pal.tick()) rebuild();

      let p = 0;
      if (section) {
        const box = section.getBoundingClientRect();
        const run = box.height - window.innerHeight;
        p = run > 0 ? Math.min(1, Math.max(0, -box.top / run)) : 0;
      }
      /* Only touch the style when it changes: a write here followed by a
         style read below would force a full-page style recalc every frame. */
      const copy = Math.max(0, 1 - p * 3.5).toFixed(3);
      if (main && copy !== lastCopy) {
        main.style.setProperty("--copy-opacity", copy);
        lastCopy = copy;
      }

      /* Camera: orbits with the cursor, turns slowly on its own, and flies
         forward with the scroll. */
      const tYaw = (pointer.in ? (pointer.x - 0.5) * 1.3 : 0) + (calm ? 0 : t * 0.05);
      const tPitch = 0.42 + (pointer.in ? (pointer.y - 0.5) * 0.7 : 0);
      yaw += (tYaw - yaw) * (calm ? 1 : 0.05);
      pitch += (tPitch - pitch) * (calm ? 1 : 0.05);
      const ep = p * p * (3 - 2 * p);
      const dist = 3.4 - ep * 5.6;
      const speed = Math.abs(dist - lastDist) / Math.max(dt, 0.001);
      lastDist = dist;
      const focus = Math.max(0.6, dist);

      const narrow = w < 760;
      const ox = w * (narrow ? 0.5 : 0.6 - 0.1 * ep);
      const oy = h * (narrow ? 0.34 : 0.5);
      const f = Math.min(w, h) * (narrow ? 1.1 : 1.45);
      const cyaw = Math.cos(yaw);
      const syaw = Math.sin(yaw);
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.fillStyle = speed > 1.2 && !calm ? "rgba(0,0,0,0.55)" : "#000";
      ctx.fillRect(0, 0, w, h);

      /* The far glyph layer. */
      const live = pal.get();
      ctx.font = `9px ${mono}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = pal.css(live[3]);
      for (let k = 0; k < DUST; k++) {
        const d = dust[k];
        const a = d.a - yaw * 0.35;
        const x = ((((Math.sin(a) * 0.5 + 0.5) * w * 1.6) % w) + w) % w;
        const y = h * (0.5 + d.e * 0.55 - (pitch - 0.42) * 0.3);
        const tw = calm ? 1 : 0.6 + 0.4 * Math.sin(t * 0.8 + k);
        ctx.globalAlpha = d.b * tw * 0.6;
        ctx.fillText(hash(k, Math.floor(t / 3)) > 0.85 ? "+" : d.ch, x, y);
      }
      ctx.globalAlpha = 1;

      /* The volume, additive, with depth of field. */
      ctx.globalCompositeOperation = "lighter";
      const morph = calm ? 1 : 0.035;
      const spin = calm ? 0 : t * 0.08;
      const cs = Math.cos(spin);
      const ss = Math.sin(spin);
      const streak = speed > 0.9 && !calm;
      for (let i = 0; i < COUNT; i++) {
        cx[i] += (target.x[i] - cx[i]) * morph;
        cy[i] += (target.y[i] - cy[i]) * morph;
        cz[i] += (target.z[i] - cz[i]) * morph;
        hue[i] += (target.hue[i] - hue[i]) * morph;

        /* The form turns on its own axis, then the camera looks at it. */
        const x0 = cx[i] * cs - cz[i] * ss;
        const z0 = cx[i] * ss + cz[i] * cs;
        const x1 = x0 * cyaw - z0 * syaw;
        const z1 = x0 * syaw + z0 * cyaw;
        const y2 = cy[i] * cp - z1 * sp;
        const z2 = cy[i] * sp + z1 * cp;
        const zc = z2 + dist;
        if (zc < 0.08) {
          prevX[i] = NaN;
          continue;
        }
        const X = ox + (x1 / zc) * f;
        const Y = oy - (y2 / zc) * f;
        if (X < -60 || X > w + 60 || Y < -60 || Y > h + 60) {
          prevX[i] = NaN;
          continue;
        }
        const blur = Math.min(3.5, Math.abs(zc - focus) * 1.5);
        const s = Math.min(44, Math.max(3, (size[i] * 7) / zc) + blur * 5);
        const bin = Math.min(BINS - 1, Math.floor(hue[i] * BINS));
        ctx.globalAlpha = Math.min(
          1,
          (0.9 / (1 + blur * 1.1)) * Math.min(1, 2.4 / zc + 0.35),
        );
        if (streak && !Number.isNaN(prevX[i])) {
          const c = rampColor(live, 0.3 + hue[i] * 0.7);
          ctx.strokeStyle = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
          ctx.lineWidth = Math.min(3, 1.2 / zc + 0.4);
          ctx.beginPath();
          ctx.moveTo(prevX[i], prevY[i]);
          ctx.lineTo(X, Y);
          ctx.stroke();
        } else if (blur < 0.55) {
          /* In focus: a crisp point, which is also far cheaper to draw. */
          const c = Math.max(1.1, Math.min(3, s * 0.3));
          ctx.fillStyle = cores[bin];
          ctx.fillRect(X - c / 2, Y - c / 2, c, c);
        } else {
          /* Out of focus: soft bokeh. */
          ctx.drawImage(sprites[bin], X - s / 2, Y - s / 2, s, s);
        }
        prevX[i] = X;
        prevY[i] = Y;
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;

      /* On the far side. */
      const cap = Math.min(1, Math.max(0, (p - 0.82) / 0.12));
      if (cap > 0) {
        ctx.globalAlpha = cap;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#eef0f6";
        ctx.font = `300 ${narrow ? 22 : 30}px ${display}`;
        ctx.fillText("You just flew through everything I've made.", w / 2, h / 2);
        ctx.font = `12px ${mono}`;
        ctx.fillStyle = pal.css(live[3], 0.85);
        ctx.fillText(
          "Every light is a piece of work. Scroll on to read them.",
          w / 2,
          h / 2 + 40,
        );
        ctx.globalAlpha = 1;
      }
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
      pointer.x = (e.clientX - box.left) / box.width;
      pointer.y = (e.clientY - box.top) / box.height;
      pointer.in = pointer.y >= 0 && pointer.y <= 1;
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
      main?.style.removeProperty("--copy-opacity");
      retargetRef.current = null;
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={className} />;
}
