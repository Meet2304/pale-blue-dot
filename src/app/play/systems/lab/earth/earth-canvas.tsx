"use client";

import { useEffect, useRef } from "react";

import { mulberry32 } from "../../engine";
import { fit, hash, livePalette, type RGB } from "../live-palette";
import { fbm3 } from "../noise";

/**
 * Terminal Earth: the planet, drawn in characters, then made small.
 *
 * Every frame the globe is ray-cast into a monospaced grid: each cell inside
 * the disc finds its point on the sphere, turns it back through the planet's
 * spin and tilt, and asks noise whether it is ocean, land or cloud. The sun
 * lights one side; on the night side, land carries city lights. Each
 * material has its own glyphs, so the texture tells you what you are looking
 * at before the colour does.
 *
 * The hero is pinned while you scroll, and scrolling shrinks the planet. The
 * grid runs out of cells to draw it with, the glyphs give way to light, and
 * it ends where the whole site begins: one pale blue dot.
 */

const OCEAN = ["·", "-", "~", "≈"];
const LAND = [".", ",", ":", ";", "+"];
const CLOUD = ["'", "`", "°", "o"];
const TILT = (23.4 * Math.PI) / 180;

type Bucket = { color: string; x: number[]; y: number[]; c: string[] };

export function EarthCanvas({
  palette,
  className,
}: {
  palette: string[];
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const paletteRef = useRef(palette);

  useEffect(() => {
    paletteRef.current = palette;
  }, [palette]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pal = livePalette(paletteRef);
    const rnd = mulberry32(8);
    const section = canvas.closest("[data-scroll-hero]") as HTMLElement | null;
    const main = canvas.closest("main") as HTMLElement | null;
    let lastCopy = "";

    let w = 0;
    let h = 0;
    let dpr = 1;
    let cw = 7;
    let ch = 12;
    let raf = 0;
    let visible = true;

    const stars = Array.from({ length: 700 }, () => ({
      x: rnd(),
      y: rnd(),
      b: 0.2 + Math.pow(rnd(), 3) * 0.8,
      p: rnd() * 6,
    }));

    /* Three orbits of particles, each a tilted ring. */
    const ORBITS = [
      { r: 1.3, inc: 0.35, node: 0.2, speed: 0.22, n: 420 },
      { r: 1.55, inc: -0.6, node: 1.2, speed: -0.14, n: 360 },
      { r: 1.85, inc: 0.9, node: 2.4, speed: 0.09, n: 300 },
    ].map((o) => ({ ...o, a: Array.from({ length: o.n }, () => rnd() * Math.PI * 2) }));

    /* Spin, with drag and inertia. */
    let yaw = 0;
    let yawVel = 0.12;
    let tilt = TILT;
    const pointer = { x: -1e4, y: -1e4, down: false, lastX: 0, lastY: 0, in: false };

    let mono = "monospace";
    let display = "sans-serif";
    const monoFont = () => mono;
    const displayFont = () => display;

    const resize = () => {
      ({ w, h, dpr } = fit(canvas, 2));
      const cs = getComputedStyle(canvas);
      mono = cs.getPropertyValue("--font-mono").trim() || "monospace";
      display = cs.getPropertyValue("--font-display").trim() || "sans-serif";
      cw = w < 760 ? 6 : 7;
      ch = w < 760 ? 10 : 12;
    };

    let last = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      pal.tick();
      const live = pal.get();

      /* Scroll progress through the pinned hero. */
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

      if (!pointer.down && !calm) {
        yawVel += (0.12 - yawVel) * 0.02;
      }
      yaw += calm ? 0 : yawVel * dt;

      const narrow = w < 760;
      const k = Math.min(1, Math.max(0, (p - 0.04) / 0.82));
      const ek = k * k * (3 - 2 * k);
      const R0 = Math.min(w, h) * (narrow ? 0.34 : 0.37);
      const R = R0 * Math.pow(1 - ek, 2.4);
      const cx =
        w *
        ((narrow ? 0.5 : 0.63) + ((narrow ? 0.5 : 0.5) - (narrow ? 0.5 : 0.63)) * ek);
      const cy = h * ((narrow ? 0.3 : 0.5) + (0.46 - (narrow ? 0.3 : 0.5)) * ek);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);

      /* Stars, fading in as the planet shrinks and the sky opens up. */
      ctx.fillStyle = "#dfe6f5";
      for (const s of stars) {
        ctx.globalAlpha =
          s.b * (0.35 + ek * 0.5) * (calm ? 1 : 0.7 + 0.3 * Math.sin(t + s.p));
        ctx.fillRect(s.x * w, s.y * h, 1.1, 1.1);
      }
      ctx.globalAlpha = 1;

      const css = (c: RGB, a = 1) => pal.css(c, a);
      const glyphAlpha = Math.min(1, Math.max(0, (R - 18) / 40));

      /* Sun from the upper left, a little toward the viewer. */
      const lx = -0.62;
      const ly = 0.42;
      const lz = 0.66;

      if (glyphAlpha > 0) {
        const buckets: Record<string, Bucket> = {};
        const add = (key: string, color: string, x: number, y: number, c: string) => {
          const b = (buckets[key] ??= { color, x: [], y: [], c: [] });
          b.x.push(x);
          b.y.push(y);
          b.c.push(c);
        };
        const land = [
          css(live[3], 0.5),
          css(live[4], 0.78),
          css([255, 255, 255], 0.95),
        ];
        const ocean = [css(live[0], 0.9), css(live[1], 0.95), css(live[2], 1)];
        const cloudC = css([255, 255, 255], 0.9);
        const city = "rgba(255,206,130,0.95)";
        const grat = css(live[2], 1);
        const rim = css(live[3], 0.55);

        const cy0 = Math.max(0, Math.floor((cy - R * 1.08) / ch));
        const cy1 = Math.min(Math.ceil(h / ch), Math.ceil((cy + R * 1.08) / ch));
        const cx0 = Math.max(0, Math.floor((cx - R * 1.08) / cw));
        const cx1 = Math.min(Math.ceil(w / cw), Math.ceil((cx + R * 1.08) / cw));
        const cosY = Math.cos(yaw);
        const sinY = Math.sin(yaw);
        const cosT = Math.cos(tilt);
        const sinT = Math.sin(tilt);
        const scanR = R * 0.42;
        const drift = t * 0.018;

        for (let gy = cy0; gy < cy1; gy++) {
          for (let gx = cx0; gx < cx1; gx++) {
            const X = (gx + 0.5) * cw;
            const Y = (gy + 0.5) * ch;
            const nx = (X - cx) / R;
            const ny = (Y - cy) / R;
            const d2 = nx * nx + ny * ny;
            if (d2 > 1.16) continue;
            if (d2 > 1) {
              /* The thin blue line of atmosphere. */
              if (hash(gx * 131 + gy, Math.floor(t * 2)) < 0.55)
                add("rim", rim, X, Y, "·");
              continue;
            }
            const nz = Math.sqrt(1 - d2);
            const sx = nx;
            const sy = -ny;
            const sz = nz;
            const lambert = sx * lx + sy * ly + sz * lz;

            /* Back into the planet's frame: undo the tilt, then the spin. */
            const ty = sy * cosT - sz * sinT;
            const tz = sy * sinT + sz * cosT;
            const ox = sx * cosY + tz * sinY;
            const oz = -sx * sinY + tz * cosY;
            const oy = ty;

            const lat = Math.asin(Math.max(-1, Math.min(1, oy)));
            const lon = Math.atan2(ox, oz);

            /* Near the cursor, the scanner reveals the graticule. */
            const dist = Math.hypot(X - pointer.x, Y - pointer.y);
            if (pointer.in && dist < scanR) {
              const latL = Math.abs(((lat * 12) / Math.PI) % 1);
              const lonL = Math.abs(((lon * 12) / Math.PI) % 1);
              const onLat = latL < 0.08 || latL > 0.92;
              const onLon = lonL < 0.05 || lonL > 0.95;
              if (onLat || onLon) {
                add("grat", grat, X, Y, onLat && onLon ? "+" : onLat ? "-" : "|");
                continue;
              }
            }

            const b = Math.max(0, lambert * 1.05 + 0.08);
            const isLand = fbm3(ox * 1.7 + 11, oy * 1.7 + 3, oz * 1.7 + 7) > 0.54;
            const cloud = fbm3(
              ox * 3.2 + Math.cos(drift) * 2,
              oy * 3.6,
              oz * 3.2 + Math.sin(drift) * 2,
              3,
            );

            if (cloud > 0.6 && b > 0.08) {
              const i = Math.min(
                CLOUD.length - 1,
                Math.floor(((cloud - 0.6) / 0.25) * CLOUD.length),
              );
              add("cloud", cloudC, X, Y, CLOUD[i]);
              continue;
            }
            if (lambert < 0.04) {
              /* Night: cities on land, near-black sea. */
              if (isLand) {
                if (hash(Math.round(lon * 60) * 97 + Math.round(lat * 60), 3) > 0.9) {
                  const tw = calm ? 1 : 0.5 + 0.5 * Math.sin(t * 2 + gx);
                  add("city", city, X, Y, tw > 0.5 ? "*" : "·");
                } else if (hash(gx * 7 + gy * 13, 1) < 0.3) {
                  add("land0", land[0], X, Y, ".");
                }
              } else if (hash(gx * 3 + gy * 17, 2) < 0.16) {
                add("ocean0", ocean[0], X, Y, "·");
              }
              continue;
            }
            if (isLand) {
              const i = Math.min(LAND.length - 1, Math.floor(b * LAND.length));
              const tier = b < 0.35 ? 0 : b < 0.7 ? 1 : 2;
              add(`land${tier}`, land[tier], X, Y, LAND[i]);
            } else {
              const i = Math.min(OCEAN.length - 1, Math.floor(b * OCEAN.length));
              const tier = b < 0.3 ? 0 : b < 0.65 ? 1 : 2;
              add(`ocean${tier}`, ocean[tier], X, Y, OCEAN[i]);
            }
          }
        }

        ctx.font = `${ch * 0.92}px ${monoFont()}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        for (const key in buckets) {
          const bk = buckets[key];
          ctx.fillStyle = bk.color;
          ctx.globalAlpha = glyphAlpha;
          for (let j = 0; j < bk.x.length; j++) ctx.fillText(bk.c[j], bk.x[j], bk.y[j]);
        }
        ctx.globalAlpha = 1;
      }

      /* Orbits: short streaks, hidden where the planet is in front. */
      ctx.lineWidth = 1;
      for (const o of ORBITS) {
        const ci = Math.cos(o.inc);
        const si = Math.sin(o.inc);
        const cn = Math.cos(o.node);
        const sn = Math.sin(o.node);
        ctx.beginPath();
        for (let j = 0; j < o.a.length; j++) {
          if (!calm) o.a[j] += o.speed * dt * (0.8 + (j % 7) * 0.05);
          const proj = (a: number) => {
            const x0 = Math.cos(a) * o.r;
            const z0 = Math.sin(a) * o.r;
            const y1 = -z0 * si;
            const z1 = z0 * ci;
            const x2 = x0 * cn - y1 * sn;
            const y2 = x0 * sn + y1 * cn;
            return [cx + x2 * R, cy + y2 * R, z1] as const;
          };
          const [x1, y1, z1] = proj(o.a[j]);
          if (z1 < 0 && Math.hypot(x1 - cx, y1 - cy) < R) continue;
          const [x0, y0] = proj(o.a[j] - 0.05 * Math.sign(o.speed));
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
        }
        ctx.strokeStyle = css(live[3], 0.35 * (1 - ek * 0.6));
        ctx.stroke();
      }

      /* The dot: a disc of light once the grid can no longer draw a world. */
      if (glyphAlpha < 1) {
        const a = 1 - glyphAlpha;
        const r = Math.max(1.8, Math.min(R, 18));
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 6);
        g.addColorStop(0, css(live[4], 0.9 * a));
        g.addColorStop(0.15, css(live[2], 0.45 * a));
        g.addColorStop(1, css(live[2], 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = css(live[4], a);
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }

      /* And what it means. */
      const cap = Math.min(1, Math.max(0, (p - 0.78) / 0.14));
      if (cap > 0) {
        ctx.globalAlpha = cap;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = "#eef0f4";
        ctx.font = `300 ${narrow ? 22 : 30}px ${displayFont()}`;
        ctx.fillText("That's here. That's home.", w / 2, cy + 48);
        ctx.font = `12px ${monoFont()}`;
        ctx.fillStyle = css(live[3], 0.8);
        ctx.fillText("Everything I've made happened on that pixel.", w / 2, cy + 92);
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
      const x = e.clientX - box.left;
      const y = e.clientY - box.top;
      if (pointer.down) {
        yawVel = (x - pointer.lastX) * 0.9;
        tilt = Math.max(-0.2, Math.min(0.9, tilt + (y - pointer.lastY) * 0.004));
      }
      pointer.lastX = x;
      pointer.lastY = y;
      pointer.x = x;
      pointer.y = y;
      pointer.in = y >= 0 && y <= box.height;
    };
    const onDown = (e: PointerEvent) => {
      pointer.down = true;
      pointer.lastX = e.clientX - canvas.getBoundingClientRect().left;
      pointer.lastY = e.clientY - canvas.getBoundingClientRect().top;
    };
    const onUp = () => {
      pointer.down = false;
    };
    const onLeave = () => {
      pointer.in = false;
      pointer.down = false;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    document.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointerleave", onLeave);
      main?.style.removeProperty("--copy-opacity");
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={className}
      style={{ touchAction: "pan-y" }}
    />
  );
}
