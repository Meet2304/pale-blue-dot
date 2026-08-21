"use client";

import { useEffect, useRef, useState, type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/**
 * A grid of flickering squares that can hold a word, dot-matrix style.
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
 *    cells actually change on a given frame, so the loop now picks that many
 *    cells at random and repaints just those. Per-frame work is proportional to
 *    what visibly changed (tens of cells), not to the grid (tens of thousands).
 *    That also removes the 16,000 RNG calls that were spent deciding.
 * 3. **`fillStyle` was a fresh template string per cell.** Opacity is quantised
 *    into `LEVELS` steps held in a `Uint8Array`, and the two colour strings are
 *    precomputed per step. No allocation in the loop.
 * 4. **`isInView` sat in the effect's dependency array**, so scrolling the
 *    footer in and out tore down and rebuilt the canvas, and `animate` still
 *    closed over a stale copy. It is a ref now; the effect runs once.
 * 5. **`color-bits` is gone** (it appended a probe to `document.body` on every
 *    render to resolve a CSS variable), and reduced motion draws one static
 *    frame without ever starting a loop.
 */

/** Quantisation steps for cell opacity. More than the eye can separate. */
const LEVELS = 24;

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
   * Fraction of the container the word should span, 0..1. When set, the size
   * is measured rather than guessed — which is the only way a dot-matrix band
   * stays filled across viewports, since a hardcoded px size is either
   * overflowing at 360px or lost in the middle at 2560px.
   */
  fitWidth?: number;
  /** Canvas `letterSpacing`, e.g. "0.06em". Ignored where unsupported. */
  letterSpacing?: string;
  /**
   * Where the word sits vertically, 0..1. Defaults to the middle.
   *
   * Needed once the field stops being a band of its own and becomes the
   * backdrop for a whole block of content: the word then has to be placed
   * around the things sitting on top of it rather than in the centre of a box
   * that holds nothing else.
   */
  textY?: number;
  /**
   * CSS font-family. May use `var(--token)` — it is resolved against the DOM
   * before it reaches the canvas, which is the one thing you cannot skip:
   * `ctx.font` silently rejects a string containing `var()` and leaves the
   * context on its `10px sans-serif` default.
   */
  fontFamily?: string;
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

    /* One probe, reused. Letting the browser compute the value is what makes
       `var(--token)` work for both the colours and the font stack. */
    const probe = document.createElement("span");
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
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

    /* Precomputed once. The render loop only ever indexes these. */
    const gridPaint: string[] = [];
    const textPaint: string[] = [];
    for (let l = 0; l < LEVELS; l++) {
      const t = l / (LEVELS - 1);
      gridPaint.push(`rgba(${r}, ${g}, ${b}, ${(t * maxOpacity).toFixed(3)})`);
      textPaint.push(
        `rgba(${tr}, ${tg}, ${tb}, ${(
          textMinOpacity +
          t * (textMaxOpacity - textMinOpacity)
        ).toFixed(3)})`,
      );
    }

    const pitch = squareSize + gridGap;

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

    const paintCell = (idx: number, clear: boolean) => {
      const i = (idx / rows) | 0;
      const j = idx - i * rows;
      const x = i * pitch * dpr;
      const y = j * pitch * dpr;
      if (clear) ctx.clearRect(x, y, cell, cell);
      ctx.fillStyle = (inText[idx] ? textPaint : gridPaint)[levels[idx]];
      ctx.fillRect(x, y, cell, cell);
    };

    const paintAll = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let idx = 0; idx < total; idx++) paintCell(idx, false);
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
         assignment is simply ignored and the word sets solid. */
      if (letterSpacing) {
        (mctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing =
          letterSpacing;
      }

      /* Measure once at a reference size and scale, rather than binary-searching
         for a fit. Text advance is linear in font size, so one measurement is
         exact. */
      let px = fontSize;
      if (fitWidth) {
        mctx.font = fontAt(100);
        const advance = mctx.measureText(text).width;
        if (advance > 0) px = Math.max(8, Math.floor(((w * fitWidth) / advance) * 100));
      }

      mctx.font = fontAt(px);
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
              const px = x0 + dx;
              const py = y0 + dy;
              if (px >= mask.width || py >= mask.height) continue;
              if (data[(py * mask.width + px) * 4 + 3] > 0) hit = 1;
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
        paintCell(idx, true);
      }

      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      /* Reduced motion gets the word, held still, and no loop at all. */
      if (reduce || raf) return;
      lastTime = 0;
      raf = requestAnimationFrame(frame);
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

    /* A strip at the bottom of the page has no business burning frames while
       it is scrolled out of sight. */
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = entry.isIntersecting;
        if (entry.isIntersecting) start();
      },
      { threshold: 0 },
    );
    intersectionObserver.observe(container);

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
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
