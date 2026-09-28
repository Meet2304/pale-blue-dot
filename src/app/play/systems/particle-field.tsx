"use client";

import { useEffect, useRef, type CSSProperties } from "react";

import {
  BAYER8,
  densityGrid,
  hexToRgb,
  mulberry32,
  rampColor,
  sampleShape,
  type FieldConfig,
  type Shape,
  type ShapeId,
} from "./engine";

/**
 * A canvas of particles that morphs to whichever `shape` it is given. The
 * first shape is arrived at from a scatter, which is the field's one
 * orchestrated entrance; every later change is a morph from wherever the
 * particles are, so an interrupted morph simply bends toward the new shape.
 */
export function ParticleField({
  config,
  shape,
  name = "Meet Bhatt",
  focusX = 0.5,
  interactive = true,
  still = false,
  className,
  style,
}: {
  config: FieldConfig;
  shape: ShapeId;
  name?: string;
  /** Horizontal centre of the shapes, as a fraction of the width. */
  focusX?: number;
  interactive?: boolean;
  /** Draw once and stop: for swatches. */
  still?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shapeRef = useRef(shape);
  const retargetRef = useRef<((id: ShapeId, animate: boolean) => void) | null>(null);

  useEffect(() => {
    shapeRef.current = shape;
    retargetRef.current?.(shape, true);
  }, [shape]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const calm = reduce || still;
    const n = config.count;
    const rnd = mulberry32(7);

    /* Particle state. `f*` is where a morph started, `t*` where it ends. */
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
    let dur = config.duration * 1.6;
    let raf = 0;
    let visible = true;
    let needsDraw = true;
    let current: ShapeId = shapeRef.current;
    const pointer = { x: 1e9, y: 1e9 };

    const cell = config.cell ?? 8;
    let gw = 0;
    let gh = 0;
    let grid = new Float32Array(0);
    let grid2 = new Float32Array(0);
    let tmp = new Float32Array(0);
    let image: ImageData | null = null;
    const off = document.createElement("canvas");
    const offCtx = off.getContext("2d");

    const bg = hexToRgb(config.bg);
    const inks = config.inks.map(hexToRgb);

    const fontOf = (v?: string) =>
      (v && getComputedStyle(canvas).getPropertyValue(v).trim()) || "serif";

    const shapeFor = (id: ShapeId): Shape => {
      const s = sampleShape(id, n, {
        halfW: w / 2 / unit || 1.6,
        seed: 11,
        text: name,
        font: fontOf(config.nameFontVar),
        weight: config.nameWeight ?? 400,
      });
      /* The name is wider than any other form, so it is centred on the frame
         rather than on the focus point, and lifted clear of the hero copy. */
      if (id === "name" && !still) {
        const shiftX = (w / 2 - cx) / unit;
        const lift = w < 760 ? 0 : -0.45;
        for (let i = 0; i < n; i++) {
          s.xy[i * 2] += shiftX;
          s.xy[i * 2 + 1] += lift;
        }
      }
      return s;
    };

    const retarget = (id: ShapeId, animate: boolean) => {
      current = id;
      const s = shapeFor(id);
      const now = performance.now();
      for (let i = 0; i < n; i++) {
        fx[i] = x[i];
        fy[i] = y[i];
        tx[i] = s.xy[i * 2];
        ty[i] = s.xy[i * 2 + 1];
        hueF[i] = hue[i];
        hueT[i] = s.hue[i];
        if (!animate || calm) {
          x[i] = fx[i] = tx[i];
          y[i] = fy[i] = ty[i];
          hue[i] = hueF[i] = hueT[i];
        }
        delay[i] =
          config.staggerBy === "radial"
            ? Math.min(1, Math.hypot(tx[i], ty[i]) / 1.3) * config.stagger
            : rnd() * config.stagger;
      }
      start = now;
      if (animate) dur = config.duration;
      needsDraw = true;
    };
    retargetRef.current = retarget;

    /* Glow sprites: a hot core inside a soft halo, one per ink. */
    const sprites = inks.map((c) => {
      const s = document.createElement("canvas");
      s.width = s.height = 48;
      const g = s.getContext("2d")!;
      const grad = g.createRadialGradient(24, 24, 0, 24, 24, 24);
      grad.addColorStop(0, "rgba(255,255,255,1)");
      grad.addColorStop(0.12, `rgba(${c[0]},${c[1]},${c[2]},0.9)`);
      grad.addColorStop(0.4, `rgba(${c[0]},${c[1]},${c[2]},0.18)`);
      grad.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
      g.fillStyle = grad;
      g.fillRect(0, 0, 48, 48);
      return s;
    });

    /* Film grain for the glow renderer: a small noise tile, re-offset per frame. */
    const grain = document.createElement("canvas");
    grain.width = grain.height = 128;
    {
      const g = grain.getContext("2d")!;
      const d = g.createImageData(128, 128);
      for (let i = 0; i < d.data.length; i += 4) {
        const v =
          (BAYER8[((i / 4) % 8) + 8 * (Math.floor(i / 4 / 128) % 8)] / 64) * 90 +
          rnd() * 165;
        d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
        d.data[i + 3] = 255;
      }
      g.putImageData(d, 0, 0);
    }
    const grainPattern = ctx.createPattern(grain, "repeat");

    /* Glyph atlas: one row of the density ramp per ink. */
    const RAMP = " .·:-=+*#%@";
    const atlas = document.createElement("canvas");
    const buildAtlas = () => {
      atlas.width = cell * RAMP.length;
      atlas.height = cell * inks.length;
      const g = atlas.getContext("2d")!;
      g.clearRect(0, 0, atlas.width, atlas.height);
      g.font = `${cell * 1.05}px ${fontOf(config.monoFontVar)}`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      inks.forEach((c, row) => {
        g.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
        for (let k = 1; k < RAMP.length; k++) {
          g.fillText(RAMP[k], k * cell + cell / 2, row * cell + cell / 2 + 1);
        }
      });
    };

    /* Stipple colours, quantised so each bin sets fillStyle once per frame. */
    const BINS = 24;
    const binColor = Array.from({ length: BINS }, (_, b) => {
      const c = rampColor(inks, b / (BINS - 1));
      return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
    });
    const binCount = new Int32Array(BINS);
    const binIdx = new Int32Array(BINS * n);

    const resize = () => {
      const box = canvas.getBoundingClientRect();
      w = Math.max(1, box.width);
      h = Math.max(1, box.height);
      dpr = Math.min(
        window.devicePixelRatio || 1,
        config.mode === "glow" || config.mode === "stipple" ? 2 : 1,
      );
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      unit = (Math.min(w, h) / 2) * (w < 760 ? 0.78 : 0.9);
      if (still) unit = (h / 2) * 0.9;
      cx = w * (w < 760 ? 0.5 : focusX);
      /* On phones the copy fills the lower half, so forms sit in the upper third. */
      cy = !still && w < 760 ? h * 0.3 : h / 2;
      gw = Math.ceil(w / cell);
      gh = Math.ceil(h / cell);
      grid = new Float32Array(gw * gh);
      grid2 = new Float32Array(gw * gh);
      tmp = new Float32Array(gw * gh);
      off.width = gw;
      off.height = gh;
      image = offCtx ? offCtx.createImageData(gw, gh) : null;
      if (config.mode === "glyph") buildAtlas();
      /* Shapes that depend on the frame's proportions are re-sampled in place. */
      const s = shapeFor(current);
      for (let i = 0; i < n; i++) {
        tx[i] = s.xy[i * 2];
        ty[i] = s.xy[i * 2 + 1];
        hueT[i] = s.hue[i];
        if (calm) {
          x[i] = fx[i] = tx[i];
          y[i] = fy[i] = ty[i];
          hue[i] = hueF[i] = hueT[i];
        }
      }
      needsDraw = true;
    };

    const ease = (t: number) => 1 - Math.pow(1 - t, 3.2);
    const easeInOut = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const step = (now: number) => {
      const tsec = now / 1000;
      let anyMoving = false;
      const pr = 0.2 * unit;
      for (let i = 0; i < n; i++) {
        let p = dur > 0 ? (now - start - delay[i]) / dur : 1;
        p = p < 0 ? 0 : p > 1 ? 1 : p;
        moving[i] = p > 0 && p < 1 ? 1 : 0;
        if (p < 1) anyMoving = true;
        let e = config.morph === "straight" ? easeInOut(p) : ease(p);
        if (config.morph === "stepped") e = Math.floor(e * 7) / 7;
        const dx = tx[i] - fx[i];
        const dy = ty[i] - fy[i];
        let px = fx[i] + dx * e;
        let py = fy[i] + dy * e;
        const arc = Math.sin(Math.PI * e);
        if (config.morph === "swirl") {
          px += -dy * arc * 0.32 * turn[i];
          py += dx * arc * 0.32 * turn[i];
        } else if (config.morph === "flow") {
          const a =
            Math.sin(px * 2.3 + tsec * 0.4) * 2.2 +
            Math.cos(py * 1.9 - tsec * 0.3) * 2.2;
          px += Math.cos(a) * arc * 0.34;
          py += Math.sin(a) * arc * 0.34;
        }
        if (!calm) {
          const settle = 0.25 + 0.75 * e;
          px +=
            Math.sin(tsec * (0.35 + size[i] * 0.2) + phase[i]) * config.drift * settle;
          py +=
            Math.cos(tsec * (0.3 + size[i] * 0.15) + phase[i] * 1.3) *
            config.drift *
            settle;
        }
        x[i] = px;
        y[i] = py;
        hue[i] = hueF[i] + (hueT[i] - hueF[i]) * e;

        let X = cx + px * unit;
        let Y = cy + py * unit;
        /* The cursor parts the particles like a hand through dust. */
        if (interactive) {
          const ddx = X - pointer.x;
          const ddy = Y - pointer.y;
          const d2 = ddx * ddx + ddy * ddy;
          if (d2 < pr * pr) {
            const d = Math.sqrt(d2) || 1;
            const push = Math.pow(1 - d / pr, 2) * 0.35 * pr;
            X += (ddx / d) * push;
            Y += (ddy / d) * push;
          }
        }
        sx[i] = X;
        sy[i] = Y;
      }
      return anyMoving;
    };

    const drawGlow = (now: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = config.bg;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      const base = Math.max(5, unit * 0.022);
      /* Haze first: a sixth of the particles also cast a wide, faint halo, so
         dense regions read as glowing gas rather than as a crowd of points. */
      ctx.globalAlpha = 0.05;
      for (let i = 0; i < n; i += 6) {
        const sp =
          sprites[Math.min(sprites.length - 1, Math.floor(hue[i] * sprites.length))];
        const s = base * 9;
        ctx.drawImage(sp, sx[i] - s / 2, sy[i] - s / 2, s, s);
      }
      for (let i = 0; i < n; i++) {
        const sp =
          sprites[Math.min(sprites.length - 1, Math.floor(hue[i] * sprites.length))];
        const s = base * size[i] * (moving[i] ? 1.15 : 1);
        ctx.globalAlpha = 0.55 + 0.45 * Math.sin(now / 1400 + phase[i]) ** 2;
        ctx.drawImage(sp, sx[i] - s / 2, sy[i] - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      if (grainPattern) {
        const ox = (now * 0.13) % 128;
        ctx.save();
        ctx.globalAlpha = 0.055;
        ctx.globalCompositeOperation = "overlay";
        ctx.translate(-ox, -((now * 0.07) % 128));
        ctx.fillStyle = grainPattern;
        ctx.fillRect(0, 0, w + 128, h + 128);
        ctx.restore();
      }
    };

    const tone = (v: number) => 1 - Math.exp(-v * (config.gain ?? 1));

    const drawBit = () => {
      if (!image || !offCtx) return;
      densityGrid(sx, sy, n, cell, gw, gh, grid, 1, tmp);
      const d = image.data;
      const lo = inks[0];
      const hi = inks[inks.length - 1];
      for (let gy = 0; gy < gh; gy++) {
        for (let gx = 0; gx < gw; gx++) {
          const i = gy * gw + gx;
          const t = (BAYER8[(gy & 7) * 8 + (gx & 7)] + 0.5) / 64;
          /* Three levels, dithered: background, the faint ink, the bright ink. */
          const L = tone(grid[i]) * 2;
          const c = L > 1 + t ? hi : L > t ? lo : bg;
          const o = i * 4;
          d[o] = c[0];
          d[o + 1] = c[1];
          d[o + 2] = c[2];
          d[o + 3] = 255;
        }
      }
      offCtx.putImageData(image, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(off, 0, 0, canvas.width, canvas.height);
    };

    const drawHalftone = () => {
      densityGrid(sx, sy, n, cell, gw, gh, grid, 1, tmp);
      densityGrid(sx, sy, n, cell, gw, gh, grid2, 3, tmp);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = config.bg;
      ctx.fillRect(0, 0, w, h);
      /* Two plates, printed slightly out of register: the spot colour carries
         the halo, the light plate carries the form. */
      const plate = (g: Float32Array, color: string, off: number, scale: number) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let gy = 0; gy < gh; gy++) {
          for (let gx = 0; gx < gw; gx++) {
            const v = tone(g[gy * gw + gx]);
            if (v < 0.03) continue;
            const r = Math.sqrt(v) * cell * scale;
            const X = (gx + 0.5) * cell + off;
            const Y = (gy + 0.5) * cell + off;
            ctx.moveTo(X + r, Y);
            ctx.arc(X, Y, r, 0, Math.PI * 2);
          }
        }
        ctx.fill();
      };
      plate(grid2, config.inks[0], 1.6, 0.62);
      plate(grid, config.inks[config.inks.length - 1], 0, 0.52);
    };

    let frame = 0;
    const drawGlyph = () => {
      densityGrid(sx, sy, n, cell, gw, gh, grid, 0, tmp);
      densityGrid(sx, sy, n, cell, gw, gh, grid2, 0, tmp, moving);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = config.bg;
      ctx.fillRect(0, 0, w, h);
      const rows = inks.length;
      const tick = frame >> 2;
      for (let gy = 0; gy < gh; gy++) {
        for (let gx = 0; gx < gw; gx++) {
          const i = gy * gw + gx;
          const v = tone(grid[i]);
          if (v < 0.06) continue;
          let k = Math.max(1, Math.ceil(v * (RAMP.length - 1)));
          /* Characters in transit are still being decided. */
          if (grid2[i] > grid[i] * 0.4) {
            const hsh = Math.sin((i + 1) * 12.9898 + tick * 78.233) * 43758.5453;
            k = 3 + Math.floor((hsh - Math.floor(hsh)) * (RAMP.length - 3));
          }
          const row = Math.min(rows - 1, Math.floor(v * rows));
          ctx.drawImage(
            atlas,
            k * cell,
            row * cell,
            cell,
            cell,
            gx * cell,
            gy * cell,
            cell,
            cell,
          );
        }
      }
    };

    const drawStipple = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = `rgba(${bg[0]},${bg[1]},${bg[2]},${calm ? 1 : (config.trail ?? 0.3)})`;
      ctx.fillRect(0, 0, w, h);
      binCount.fill(0);
      for (let i = 0; i < n; i++) {
        const b = Math.min(BINS - 1, Math.floor(hue[i] * BINS));
        binIdx[b * n + binCount[b]++] = i;
      }
      for (let b = 0; b < BINS; b++) {
        ctx.fillStyle = binColor[b];
        for (let k = 0; k < binCount[b]; k++) {
          const i = binIdx[b * n + k];
          const s = size[i] > 1.4 ? 2.1 : 1.15;
          ctx.fillRect(sx[i], sy[i], s, s);
        }
      }
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      /* Offscreen fields sleep, except for a still field's one pending draw:
         a swatch below the fold must already be painted when it arrives. */
      if (!visible && !(calm && needsDraw)) return;
      const moved = step(now);
      if (calm && !moved && !needsDraw) return;
      needsDraw = false;
      frame++;
      if (config.mode === "glow") drawGlow(now);
      else if (config.mode === "bit") drawBit();
      else if (config.mode === "halftone") drawHalftone();
      else if (config.mode === "glyph") drawGlyph();
      else drawStipple();
    };

    resize();
    retarget(current, true);
    dur = config.duration * 1.6;
    if (calm) retarget(current, false);
    raf = requestAnimationFrame(loop);

    /* Fonts decide the name's shape and the glyph atlas; redo both once loaded. */
    document.fonts?.ready.then(() => {
      if (config.mode === "glyph") buildAtlas();
      if (current === "name") retarget("name", true);
    });

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(canvas);

    const onMove = (e: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
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
  }, [config, name, focusX, interactive, still]);

  return <canvas ref={canvasRef} aria-hidden className={className} style={style} />;
}
