"use client";

import { useEffect, useRef } from "react";

import { hexToRgb, mulberry32 } from "../../engine";
import { fit, hash } from "../live-palette";

/**
 * Nebula Ink: a real fluid, painted with the cursor.
 *
 * A stable-fluids solver (semi-Lagrangian advection, Jacobi pressure
 * projection) on a coarse grid, with vorticity confinement to keep the curls
 * alive so it reads as nebula gas rather than soup. Three things ride it:
 *
 * - dye, rendered soft and upscaled: the gas itself;
 * - tracer particles, advected by the velocity: the stars caught in it;
 * - glyphs, laid along the local flow (- \ | /), so the texture is literally
 *   the current's direction.
 *
 * The cursor pushes the fluid and bleeds the current category's colour into
 * it. Switch category and keep painting, and the nebula keeps every colour
 * you gave it. When nobody is painting, three slow emitters keep it alive.
 */

const GW = 128;
const TRACERS = 4200;
const JACOBI = 18;

export function InkCanvas({
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
    const rnd = mulberry32(12);

    let w = 0;
    let h = 0;
    let dpr = 1;
    let gh = 72;
    let W = GW + 2;
    let u = new Float32Array(0);
    let v = new Float32Array(0);
    let u0 = new Float32Array(0);
    let v0 = new Float32Array(0);
    let pr = new Float32Array(0);
    let dv = new Float32Array(0);
    let curl = new Float32Array(0);
    let dr = new Float32Array(0);
    let dg = new Float32Array(0);
    let db = new Float32Array(0);
    let tmp = new Float32Array(0);
    let image: ImageData | null = null;
    const off = document.createElement("canvas");
    const offCtx = off.getContext("2d");

    const IX = (i: number, j: number) => i + W * j;

    const alloc = () => {
      gh = Math.max(40, Math.round((GW * h) / w));
      W = GW + 2;
      const size = W * (gh + 2);
      u = new Float32Array(size);
      v = new Float32Array(size);
      u0 = new Float32Array(size);
      v0 = new Float32Array(size);
      pr = new Float32Array(size);
      dv = new Float32Array(size);
      curl = new Float32Array(size);
      dr = new Float32Array(size);
      dg = new Float32Array(size);
      db = new Float32Array(size);
      tmp = new Float32Array(size);
      off.width = GW;
      off.height = gh;
      image = offCtx ? offCtx.createImageData(GW, gh) : null;
    };

    const tx = new Float32Array(TRACERS);
    const ty = new Float32Array(TRACERS);
    const age = new Float32Array(TRACERS);
    const spawn = (k: number) => {
      tx[k] = 1 + rnd() * GW;
      ty[k] = 1 + rnd() * gh;
      age[k] = rnd() * 400;
    };

    let mono = "monospace";
    const resize = () => {
      ({ w, h, dpr } = fit(canvas, 2));
      mono =
        getComputedStyle(canvas).getPropertyValue("--font-mono").trim() || "monospace";
      alloc();
      for (let k = 0; k < TRACERS; k++) spawn(k);
    };

    /* Bilinear sample of a field at grid coordinates. */
    const sample = (f: Float32Array, x: number, y: number) => {
      x = Math.max(0.5, Math.min(GW + 0.5, x));
      y = Math.max(0.5, Math.min(gh + 0.5, y));
      const i0 = Math.floor(x);
      const j0 = Math.floor(y);
      const s1 = x - i0;
      const t1 = y - j0;
      return (
        (1 - s1) * ((1 - t1) * f[IX(i0, j0)] + t1 * f[IX(i0, j0 + 1)]) +
        s1 * ((1 - t1) * f[IX(i0 + 1, j0)] + t1 * f[IX(i0 + 1, j0 + 1)])
      );
    };

    const advect = (d: Float32Array, d0: Float32Array, dt: number, decay: number) => {
      for (let j = 1; j <= gh; j++) {
        for (let i = 1; i <= GW; i++) {
          const id = IX(i, j);
          d[id] = sample(d0, i - dt * u[id], j - dt * v[id]) * decay;
        }
      }
    };

    const project = () => {
      for (let j = 1; j <= gh; j++) {
        for (let i = 1; i <= GW; i++) {
          const id = IX(i, j);
          dv[id] = -0.5 * (u[id + 1] - u[id - 1] + v[id + W] - v[id - W]);
          pr[id] = 0;
        }
      }
      for (let k = 0; k < JACOBI; k++) {
        for (let j = 1; j <= gh; j++) {
          for (let i = 1; i <= GW; i++) {
            const id = IX(i, j);
            pr[id] = (dv[id] + pr[id - 1] + pr[id + 1] + pr[id - W] + pr[id + W]) / 4;
          }
        }
      }
      for (let j = 1; j <= gh; j++) {
        for (let i = 1; i <= GW; i++) {
          const id = IX(i, j);
          u[id] -= 0.5 * (pr[id + 1] - pr[id - 1]);
          v[id] -= 0.5 * (pr[id + W] - pr[id - W]);
        }
      }
    };

    /* Vorticity confinement: find the curl, push along its gradient. */
    const confine = (eps: number) => {
      for (let j = 1; j <= gh; j++) {
        for (let i = 1; i <= GW; i++) {
          const id = IX(i, j);
          curl[id] = (v[id + 1] - v[id - 1] - (u[id + W] - u[id - W])) * 0.5;
        }
      }
      for (let j = 2; j < gh; j++) {
        for (let i = 2; i < GW; i++) {
          const id = IX(i, j);
          const gx = (Math.abs(curl[id + 1]) - Math.abs(curl[id - 1])) * 0.5;
          const gy = (Math.abs(curl[id + W]) - Math.abs(curl[id - W])) * 0.5;
          const len = Math.hypot(gx, gy) + 1e-5;
          u[id] += eps * (gy / len) * curl[id];
          v[id] -= eps * (gx / len) * curl[id];
        }
      }
    };

    /* Push velocity and dye in around a point, in grid coordinates. */
    const splat = (
      x: number,
      y: number,
      fx: number,
      fy: number,
      col: [number, number, number],
      amount: number,
      radius: number,
    ) => {
      const r2 = radius * radius;
      const i0 = Math.max(1, Math.floor(x - radius * 2));
      const i1 = Math.min(GW, Math.ceil(x + radius * 2));
      const j0 = Math.max(1, Math.floor(y - radius * 2));
      const j1 = Math.min(gh, Math.ceil(y + radius * 2));
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          const d2 = (i - x) ** 2 + (j - y) ** 2;
          const k = Math.exp(-d2 / r2);
          if (k < 0.01) continue;
          const id = IX(i, j);
          u[id] += fx * k;
          v[id] += fy * k;
          dr[id] += (col[0] / 255) * amount * k;
          dg[id] += (col[1] / 255) * amount * k;
          db[id] += (col[2] / 255) * amount * k;
        }
      }
    };

    const pointer = { x: 0, y: 0, px: 0, py: 0, in: false, fresh: true };
    let raf = 0;
    let visible = true;
    let last = performance.now();

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      const t = now / 1000;
      const dtf = Math.min(2, (now - last) / 16.67);
      last = now;
      const pal = paletteRef.current.map(hexToRgb) as [number, number, number][];
      const sx = GW / w;
      const sy = gh / h;

      /* Three slow emitters keep the nebula breathing on its own. */
      if (!calm) {
        for (let e = 0; e < 3; e++) {
          const a = t * (0.11 + e * 0.04) + e * 2.1;
          const ex = GW * (0.62 + Math.cos(a) * 0.2);
          const ey = gh * (0.5 + Math.sin(a * 1.3) * 0.28);
          splat(
            ex,
            ey,
            Math.cos(a + 1.6) * 0.35,
            Math.sin(a + 1.6) * 0.35,
            pal[e === 1 ? 3 : 2],
            0.03,
            3.2,
          );
        }
      }

      /* The cursor: a brush of force and colour. */
      if (pointer.in) {
        const dx = (pointer.x - pointer.px) * sx;
        const dy = (pointer.y - pointer.py) * sy;
        if (!pointer.fresh && (dx !== 0 || dy !== 0)) {
          const sp = Math.min(3, Math.hypot(dx, dy));
          splat(
            pointer.x * sx + 1,
            pointer.y * sy + 1,
            dx * 1.6,
            dy * 1.6,
            pal[2],
            0.16 * sp,
            2.6,
          );
          splat(pointer.x * sx + 1, pointer.y * sy + 1, 0, 0, pal[4], 0.03 * sp, 1.2);
        }
        pointer.px = pointer.x;
        pointer.py = pointer.y;
        pointer.fresh = false;
      }

      if (!calm) {
        confine(0.22);
        u0.set(u);
        v0.set(v);
        advect(u, u0, dtf, 0.999);
        advect(v, v0, dtf, 0.999);
        project();
        tmp.set(dr);
        advect(dr, tmp, dtf, 0.9965);
        tmp.set(dg);
        advect(dg, tmp, dtf, 0.9965);
        tmp.set(db);
        advect(db, tmp, dtf, 0.9965);
      }

      /* 1. Gas: dye tone-mapped into a small image, drawn large and soft. */
      if (image && offCtx) {
        const d = image.data;
        for (let j = 0; j < gh; j++) {
          for (let i = 0; i < GW; i++) {
            const id = IX(i + 1, j + 1);
            const o = (j * GW + i) * 4;
            d[o] = 255 * (1 - Math.exp(-dr[id] * 2.4));
            d[o + 1] = 255 * (1 - Math.exp(-dg[id] * 2.4));
            d[o + 2] = 255 * (1 - Math.exp(-db[id] * 2.4));
            d[o + 3] = 255;
          }
        }
        offCtx.putImageData(image, 0, 0);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(off, 0, 0, canvas.width, canvas.height);
        /* A blurred, added copy: the glow that makes it read as gas. */
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.7;
        ctx.filter = `blur(${Math.round(18 * dpr)}px)`;
        ctx.drawImage(off, 0, 0, canvas.width, canvas.height);
        ctx.filter = "none";
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cellW = w / GW;
      const cellH = h / gh;

      /* 2. Glyphs laid along the current, in the thinner gas. */
      ctx.font = `${Math.round(cellW * 0.75)}px ${mono}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const strokes = ["-", "\\", "|", "/"];
      const epoch = Math.floor(t * 2);
      ctx.fillStyle = "rgba(240,244,255,0.3)";
      for (let j = 1; j <= gh; j += 1) {
        for (let i = 1; i <= GW; i += 1) {
          const id = IX(i, j);
          const dens = dr[id] + dg[id] + db[id];
          if (dens < 0.05 || dens > 1.6) continue;
          const sp = Math.hypot(u[id], v[id]);
          /* Sparse, and only where the gas is actually moving. */
          if (hash(id, epoch) > 0.035 + Math.min(0.08, sp * 0.3)) continue;
          let ch = "·";
          if (sp > 0.08) {
            const a = ((Math.atan2(v[id], u[id]) % Math.PI) + Math.PI) % Math.PI;
            ch = strokes[Math.round(a / (Math.PI / 4)) % 4];
          } else if (dens > 0.5) ch = ":";
          ctx.fillText(ch, (i - 0.5) * cellW, (j - 0.5) * cellH);
        }
      }

      /* 3. Tracers: stars carried by the fluid. */
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "#eef3ff";
      for (let k = 0; k < TRACERS; k++) {
        if (!calm) {
          const vx = sample(u, tx[k], ty[k]);
          const vy = sample(v, tx[k], ty[k]);
          tx[k] += vx * dtf + Math.sin(t + k) * 0.004;
          ty[k] += vy * dtf + Math.cos(t * 0.9 + k) * 0.004;
          age[k] += dtf;
          if (age[k] > 900 || tx[k] < 1 || tx[k] > GW || ty[k] < 1 || ty[k] > gh)
            spawn(k);
        }
        const dens = sample(dr, tx[k], ty[k]) + sample(dg, tx[k], ty[k]);
        ctx.globalAlpha = Math.min(0.9, 0.18 + dens * 0.5);
        const s1 = k % 9 === 0 ? 1.8 : 1;
        ctx.fillRect((tx[k] - 0.5) * cellW, (ty[k] - 0.5) * cellH, s1, s1);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    };

    resize();
    /* Seed the first frame with a little gas, so it opens on a nebula. */
    const pal0 = paletteRef.current.map(hexToRgb) as [number, number, number][];
    for (let k = 0; k < 14; k++) {
      splat(
        GW * (0.45 + rnd() * 0.4),
        gh * (0.25 + rnd() * 0.5),
        (rnd() - 0.5) * 2,
        (rnd() - 0.5) * 2,
        pal0[2 + (k % 2)],
        0.5,
        6,
      );
    }
    raf = requestAnimationFrame(frame);

    const ro = new ResizeObserver(() => {
      const box = canvas.getBoundingClientRect();
      if (Math.abs(box.width - w) > 2 || Math.abs(box.height - h) > 2) resize();
    });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    io.observe(canvas);

    const onMove = (e: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      pointer.x = e.clientX - box.left;
      pointer.y = e.clientY - box.top;
      const inside = pointer.y >= 0 && pointer.y <= box.height;
      if (inside && !pointer.in) pointer.fresh = true;
      pointer.in = inside;
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
