"use client";

import { useEffect, useRef, useState, type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/**
 * A grid of flickering squares that can hold a word, dot-matrix style, and
 * lights up under the pointer.
 *
 * Adapted from a 21st.dev component — same grid, same flicker model, same
 * "brighten the cells the word covers" idea — but the render path has been
 * rebuilt, because the original could not run at this size.
 *
 * What changed, and why:
 *
 * 1. **The text mask was read back once per cell, per frame.** `getImageData`
 *    ran for every square on every frame: at this band's size that is roughly
 *    16,000 GPU readbacks a frame, each one a pipeline stall. The mask only
 *    depends on size, text and font, so it is rasterised once into a
 *    `Uint8Array` of per-cell flags.
 * 2. **Every frame repainted every cell.** Only about a third of a percent of
 *    cells actually change on a given frame, so the loop picks that many at
 *    random and repaints just those. Per-frame work is proportional to what
 *    visibly changed (tens of cells), not to the grid (tens of thousands). That
 *    also removes the 16,000 RNG calls that were spent deciding.
 * 3. **`fillStyle` was a fresh template string per cell.** Opacity is quantised
 *    into `LEVELS` steps held in a `Uint8Array`, and every colour string the
 *    loop can need is precomputed. No allocation in the render path.
 * 4. **`isInView` sat in the effect's dependency array**, so scrolling the
 *    footer in and out tore down and rebuilt the canvas, and `animate` still
 *    closed over a stale copy. It is a ref now; the effect runs once.
 * 5. **`color-bits` is gone** (it appended a probe to `document.body` on every
 *    render to resolve a CSS variable), and reduced motion draws one static
 *    frame without ever starting a loop.
 */

/** Quantisation steps for cell opacity. More than the eye can separate. */
const LEVELS = 24;

/** Quantisation steps for the pointer halo, same reasoning. */
const HALO_LEVELS = 16;

type FlickeringGridProps = HTMLAttributes<HTMLDivElement> & {
  squareSize?: number;
  gridGap?: number;
  /** Chance per second that a given cell picks a new opacity. */
  flickerChance?: number;
  /** Any CSS colour, including `var(--token)` — resolved once, on mount. */
  color?: string;
  /** Colour for the cells the word covers. Defaults to `color`. */
  textColor?: string;
  /** Ceiling for the idle grid. Keep it low; the word is what should read. */
  maxOpacity?: number;
  /** Floor for the cells the word covers — this is what makes it legible. */
  textMinOpacity?: number;
  /**
   * Ceiling for those cells. Without it the word always flickers up to fully
   * opaque, so the only way to make it quieter is to raise the floor — which
   * flattens it instead of dimming it. Capping the top lets the word keep its
   * whole range and simply sit lower than the thing next to it.
   */
  textMaxOpacity?: number;
  text?: string;
  /** Ignored when `fitWidth` is set. */
  fontSize?: number;
  fontWeight?: number | string;
  /**
   * Fraction of the container the word should span, 0..1. When set, the size is
   * measured rather than guessed — the only way a dot-matrix band stays filled
   * across viewports, since a hardcoded px size is either overflowing at 360px
   * or lost in the middle at 2560px.
   */
  fitWidth?: number;
  /** Canvas `letterSpacing`, e.g. "0.06em". Ignored where unsupported. */
  letterSpacing?: string;
  /** Where the word sits vertically, 0..1. Defaults to the middle. */
  textY?: number;
  /**
   * CSS font-family. May use `var(--token)` — it is resolved against the DOM
   * before it reaches the canvas, which is the one thing you cannot skip:
   * `ctx.font` silently rejects a string containing `var()` and leaves the
   * context on its `10px sans-serif` default.
   */
  fontFamily?: string;
  /** Light the cells under the pointer. */
  interactive?: boolean;
  /** Radius of that light, in CSS px. */
  haloRadius?: number;
  /** Brightest the halo drives a cell, 0..1. */
  haloOpacity?: number;
};

/** `rgb(r, g, b)` / `rgba(...)` → `[r, g, b]`. */
function parseRGB(value: string): [number, number, number] {
  const match = value.match(/(\d+(?:\.\d+)?)/g);
  if (!match || match.length < 3) return [180, 180, 180];
  return [Number(match[0]), Number(match[1]), Number(match[2])];
}

export function FlickeringGrid({
  squareSize = 2,
  gridGap = 3,
  flickerChance = 0.12,
  color = "#6B7280",
  textColor,
  maxOpacity = 0.22,
  textMinOpacity = 0.7,
  textMaxOpacity = 1,
  text = "",
  fontSize = 96,
  fontWeight = 400,
  fitWidth,
  letterSpacing,
  textY = 0.5,
  fontFamily,
  interactive = true,
  haloRadius = 130,
  haloOpacity = 0.85,
  className,
  ...props
}: FlickeringGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inViewRef = useRef(false);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const alive = interactive && !reduce;

    /* One probe, reused. Letting the browser compute the value is what makes
       `var(--token)` work for both the colours and the font stack. */
    const probe = document.createElement("span");
    container.appendChild(probe);

    const computed = (prop: "color" | "fontFamily", value: string) => {
      probe.style.cssText = "position:absolute;visibility:hidden";
      probe.style[prop] = value;
      return getComputedStyle(probe)[prop];
    };

    const [r, g, b] = parseRGB(computed("color", color));
    const [tr, tg, tb] = parseRGB(computed("color", textColor || color));
    const family = computed("fontFamily", fontFamily || "var(--font-display), serif");
    container.removeChild(probe);

    const fontAt = (px: number) => `${fontWeight} ${px}px ${family}`;

    /* Every colour string the render path can need, built once. The alphas are
       kept alongside so a cell can pick whichever of its two candidates — its
       own flicker, or the halo under the pointer — is currently brighter,
       without either of them being composed at draw time. */
    const gridPaint: string[] = [];
    const textPaint: string[] = [];
    const gridAlpha: number[] = [];
    const textAlpha: number[] = [];
    for (let l = 0; l < LEVELS; l++) {
      const t = l / (LEVELS - 1);
      const ga = t * maxOpacity;
      const ta = textMinOpacity + t * (textMaxOpacity - textMinOpacity);
      gridAlpha.push(ga);
      textAlpha.push(ta);
      gridPaint.push(`rgba(${r}, ${g}, ${b}, ${ga.toFixed(3)})`);
      textPaint.push(`rgba(${tr}, ${tg}, ${tb}, ${ta.toFixed(3)})`);
    }

    const haloGridPaint: string[] = [];
    const haloTextPaint: string[] = [];
    const haloAlpha: number[] = [];
    for (let l = 0; l < HALO_LEVELS; l++) {
      const a = (l / (HALO_LEVELS - 1)) * haloOpacity;
      haloAlpha.push(a);
      haloGridPaint.push(`rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`);
      haloTextPaint.push(`rgba(${tr}, ${tg}, ${tb}, ${a.toFixed(3)})`);
    }

    const pitch = squareSize + gridGap;
    const half = squareSize / 2;
    const radius2 = haloRadius * haloRadius;

    let cols = 0;
    let rows = 0;
    let total = 0;
    let dpr = 1;
    let cell = 0;
    /** Quantised opacity per cell. */
    let levels = new Uint8Array(0);
    /** 1 where the word covers this cell. Rebuilt only on resize. */
    let inText = new Uint8Array(0);
    let raf = 0;
    let lastTime = 0;

    /* Pointer position in container coordinates. `-1` means "not over us",
       which is also the resting state, so nothing has to special-case absence. */
    let px = -1;
    let py = -1;
    let paintedPx = -1;
    let paintedPy = -1;

    /** 0 outside the halo, rising to 1 at its centre. */
    const boostAt = (i: number, j: number) => {
      if (px < 0) return 0;
      const dx = i * pitch + half - px;
      const dy = j * pitch + half - py;
      const d2 = dx * dx + dy * dy;
      if (d2 >= radius2) return 0;
      /* Squared falloff on the *distance*, so the light has a soft shoulder
         rather than a visible circular edge. */
      const t = 1 - Math.sqrt(d2) / haloRadius;
      return t * t;
    };

    const paintCell = (i: number, j: number, clear: boolean) => {
      const idx = i * rows + j;
      const x = i * pitch * dpr;
      const y = j * pitch * dpr;
      if (clear) ctx.clearRect(x, y, cell, cell);

      const level = levels[idx];
      const isText = inText[idx] === 1;

      let paint = isText ? textPaint[level] : gridPaint[level];
      if (alive && px >= 0) {
        const boost = boostAt(i, j);
        if (boost > 0) {
          const hl = (boost * (HALO_LEVELS - 1) + 0.5) | 0;
          /* The halo sets a floor, it does not replace the cell: a bright
             flicker inside the light stays bright rather than being pulled
             down to the halo's value. */
          if (haloAlpha[hl] > (isText ? textAlpha[level] : gridAlpha[level])) {
            paint = isText ? haloTextPaint[hl] : haloGridPaint[hl];
          }
        }
      }

      ctx.fillStyle = paint;
      ctx.fillRect(x, y, cell, cell);
    };

    const paintAll = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) paintCell(i, j, false);
      }
    };

    /** Repaint the square of cells covering one halo position. */
    const paintAround = (cx: number, cy: number) => {
      if (cx < 0) return;
      const i0 = Math.max(0, Math.floor((cx - haloRadius) / pitch));
      const i1 = Math.min(cols - 1, Math.ceil((cx + haloRadius) / pitch));
      const j0 = Math.max(0, Math.floor((cy - haloRadius) / pitch));
      const j1 = Math.min(rows - 1, Math.ceil((cy + haloRadius) / pitch));
      for (let i = i0; i <= i1; i++) {
        for (let j = j0; j <= j1; j++) paintCell(i, j, true);
      }
    };

    const buildTextMask = (w: number, h: number) => {
      inText = new Uint8Array(total);
      if (!text) return;

      const mask = document.createElement("canvas");
      mask.width = Math.max(1, Math.round(w));
      mask.height = Math.max(1, Math.round(h));
      const mctx = mask.getContext("2d", { willReadFrequently: true });
      if (!mctx) return;

      mctx.fillStyle = "#fff";
      mctx.textAlign = "center";
      mctx.textBaseline = "middle";

      /* `letterSpacing` is Canvas2D and not universal; where it is missing the
         assignment is ignored and the word simply sets solid. */
      if (letterSpacing) {
        (mctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing =
          letterSpacing;
      }

      /* Measure once at a reference size and scale, rather than binary-searching
         for a fit. Text advance is linear in font size, so one measurement is
         exact. */
      let size = fontSize;
      if (fitWidth) {
        mctx.font = fontAt(100);
        const advance = mctx.measureText(text).width;
        if (advance > 0)
          size = Math.max(8, Math.floor(((w * fitWidth) / advance) * 100));
      }

      mctx.font = fontAt(size);
      mctx.fillText(text, w / 2, h * textY);

      /* One readback for the whole band instead of one per cell. */
      const data = mctx.getImageData(0, 0, mask.width, mask.height).data;

      for (let i = 0; i < cols; i++) {
        const x0 = Math.floor(i * pitch);
        for (let j = 0; j < rows; j++) {
          const y0 = Math.floor(j * pitch);
          let hit = 0;
          /* Sampling the square is enough to decide at this cell size. */
          for (let dx = 0; dx < squareSize && !hit; dx++) {
            for (let dy = 0; dy < squareSize && !hit; dy++) {
              const sx = x0 + dx;
              const sy = y0 + dy;
              if (sx >= mask.width || sy >= mask.height) continue;
              if (data[(sy * mask.width + sx) * 4 + 3] > 0) hit = 1;
            }
          }
          inText[i * rows + j] = hit;
        }
      }
    };

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;

      dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      cell = squareSize * dpr;
      setSize({ width: w, height: h });

      cols = Math.ceil(w / pitch);
      rows = Math.ceil(h / pitch);
      total = cols * rows;

      levels = new Uint8Array(total);
      for (let i = 0; i < total; i++) levels[i] = (Math.random() * LEVELS) | 0;

      buildTextMask(w, h);
      paintAll();
      paintedPx = px;
      paintedPy = py;
    };

    const frame = (time: number) => {
      if (!inViewRef.current) {
        raf = 0;
        return;
      }
      const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 0;
      lastTime = time;

      /* Instead of rolling a die for every cell, take the number of cells that
         would have changed and pick exactly that many. Same distribution, and
         the frame costs what actually moved rather than what exists. */
      const changes = Math.min(total, Math.round(flickerChance * delta * total));
      for (let k = 0; k < changes; k++) {
        const idx = (Math.random() * total) | 0;
        levels[idx] = (Math.random() * LEVELS) | 0;
        paintCell((idx / rows) | 0, idx % rows, true);
      }

      /* The light only costs anything on frames where it actually moved, and
         then only across the two squares it left and arrived at. */
      if (alive && (px !== paintedPx || py !== paintedPy)) {
        paintAround(paintedPx, paintedPy);
        paintAround(px, py);
        paintedPx = px;
        paintedPy = py;
      }

      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      /* Reduced motion gets the word, held still, and no loop at all. */
      if (reduce || raf) return;
      lastTime = 0;
      raf = requestAnimationFrame(frame);
    };

    /* Tracked on the window rather than the host: the field sits behind the
       footer's links, so a listener on the host would drop out every time the
       cursor crossed one of them and the light would stutter. The rect is read
       here rather than cached because the footer moves with the scroll. */
    const onPointerMove = (event: PointerEvent) => {
      if (!inViewRef.current) return;
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const near = haloRadius;
      if (x < -near || y < -near || x > rect.width + near || y > rect.height + near) {
        px = -1;
        py = -1;
        return;
      }
      px = x;
      py = y;
    };

    const onPointerLeave = () => {
      px = -1;
      py = -1;
    };

    /* The face has to be in the font set before the mask is rasterised, or the
       word is measured in the fallback and never fits the band. On routes that
       do not otherwise use it, nothing would have triggered the download. */
    let cancelled = false;
    const ready = document.fonts
      ? document.fonts.load(fontAt(fontSize)).then(() => document.fonts.ready)
      : Promise.resolve();

    resize();
    void ready.then(() => {
      if (!cancelled) resize();
    });

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    /* A strip at the bottom of the page has no business burning frames while it
       is scrolled out of sight. */
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = entry.isIntersecting;
        if (entry.isIntersecting) start();
        else onPointerLeave();
      },
      { threshold: 0 },
    );
    intersectionObserver.observe(container);

    if (alive) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      document.addEventListener("pointerleave", onPointerLeave);
    }

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [
    squareSize,
    gridGap,
    flickerChance,
    color,
    textColor,
    maxOpacity,
    textMinOpacity,
    textMaxOpacity,
    text,
    fontSize,
    fontWeight,
    fitWidth,
    letterSpacing,
    textY,
    fontFamily,
    interactive,
    haloRadius,
    haloOpacity,
  ]);

  return (
    <div ref={containerRef} className={cn("h-full w-full", className)} {...props}>
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none"
        style={{ width: size.width, height: size.height }}
      />
    </div>
  );
}
