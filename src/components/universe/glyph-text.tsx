"use client";

import { useEffect, useRef } from "react";

import { GLYPHS } from "./intro-timeline";

/* The resting glyphs, by how much of a cell the letter covers. */
const RAMP = ["·", ":", "+", "=", "#"];

type Cell = {
  x: number;
  y: number;
  cov: number;
  dot: boolean;
  heat: number;
  seed: number;
};

/**
 * Text drawn in the terminal's glyphs, on a canvas the size of its box, set
 * as large as the box allows. Wherever the pointer passes, the letters come
 * apart into the glyphs that text decodes out of and settle back behind it;
 * the first time it comes into view, one decode runs through it, left to
 * right. `dot` ends it with a full stop in the pale blue dot's blue.
 */
export function GlyphText({
  text,
  dot = false,
  weight = 300,
  density = 150,
  className,
}: {
  text: string;
  dot?: boolean;
  weight?: number;
  /** About how many glyphs fit across the box. */
  density?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const g = canvas?.getContext("2d");
    if (!canvas || !g) return;
    const quiet = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let cw = 6;
    let ch = 10;
    let mono = "monospace";
    let cells: Cell[] = [];
    let raf = 0;
    let sweep = -1;
    const pointer = { x: 0, y: 0, in: false };

    const build = () => {
      const box = canvas.getBoundingClientRect();
      w = box.width;
      h = box.height;
      if (w < 2 || h < 2) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cs = getComputedStyle(canvas);
      mono = cs.getPropertyValue("--plex-mono").trim() || "monospace";
      cw = Math.max(4, Math.round(w / density));
      ch = Math.round(cw * 1.7);

      /* The text as a mask: the letters in red, the full stop in blue. */
      const m = document.createElement("canvas");
      m.width = Math.ceil(w);
      m.height = Math.ceil(h);
      const mg = m.getContext("2d", { willReadFrequently: true });
      if (!mg) return;
      const font = (px: number) => `${weight} ${px}px ${cs.fontFamily}`;
      /* Set so the letters' own ink fills the box from top to bottom (not
         the font's line box, which leaves room above and below), so the
         box's edges are the letters' edges and things beside it can line
         up with them. Narrower than that allows, it is set smaller and
         centred. */
      mg.font = font(100);
      const ink = mg.measureText(text);
      const tall = Math.max(
        1,
        ink.actualBoundingBoxAscent + ink.actualBoundingBoxDescent,
      );
      let size = (h / tall) * 100;
      mg.font = font(size);
      const width = () => mg.measureText(text).width + (dot ? size * 0.2 : 0);
      if (width() > w * 0.995) {
        size *= (w * 0.995) / width();
        mg.font = font(size);
      }
      const inkH = (tall * size) / 100;
      const base = (h - inkH) / 2 + (ink.actualBoundingBoxAscent * size) / 100;
      mg.fillStyle = "#f00";
      mg.fillText(text, 0, base);
      if (dot) {
        const r = size * 0.085;
        mg.fillStyle = "#00f";
        mg.beginPath();
        mg.arc(
          mg.measureText(text).width + size * 0.03 + r,
          base - r,
          r,
          0,
          Math.PI * 2,
        );
        mg.fill();
      }
      const data = mg.getImageData(0, 0, m.width, m.height).data;
      const at = (x: number, y: number, c: number) =>
        data[(Math.min(m.height - 1, y) * m.width + Math.min(m.width - 1, x)) * 4 + c];

      cells = [];
      for (let y = 0; y + ch <= h + 0.5; y += ch)
        for (let x = 0; x + cw <= w + 0.5; x += cw) {
          let red = 0;
          let blue = 0;
          for (const [dx, dy] of [
            [0.25, 0.25],
            [0.75, 0.25],
            [0.5, 0.5],
            [0.25, 0.75],
            [0.75, 0.75],
          ]) {
            red += at(Math.floor(x + dx * cw), Math.floor(y + dy * ch), 0);
            blue += at(Math.floor(x + dx * cw), Math.floor(y + dy * ch), 2);
          }
          const cov = Math.max(red, blue) / (255 * 5);
          if (cov > 0.15)
            cells.push({ x, y, cov, dot: blue > red, heat: 0, seed: Math.random() });
        }
    };

    const draw = (now: number) => {
      raf = 0;
      g.clearRect(0, 0, w, h);
      g.font = `${ch * 0.9}px ${mono}`;
      g.textBaseline = "top";
      const t = now / 1000;
      const R = Math.max(60, Math.min(130, w * 0.08));
      const front = sweep >= 0 ? ((now - sweep) / 1100) * (w + 200) - 100 : -1e9;
      if (sweep >= 0 && front > w + 100) sweep = -1;
      let hot = false;
      for (const c of cells) {
        if (pointer.in) {
          const d = Math.hypot(c.x + cw / 2 - pointer.x, c.y + ch / 2 - pointer.y);
          if (d < R) c.heat = Math.max(c.heat, 1 - d / R);
        }
        if (sweep >= 0) {
          const d = Math.abs(c.x - front);
          if (d < 90) c.heat = Math.max(c.heat, (1 - d / 90) * 0.9);
        }
        let glyph: string;
        if (c.heat > 0.05) {
          hot = true;
          glyph = GLYPHS[Math.floor(c.seed * 97 + t * 16) % GLYPHS.length];
          const a = 0.45 + 0.55 * c.heat;
          g.fillStyle = c.dot ? `rgba(47,157,255,${a})` : `rgba(146,203,251,${a})`;
        } else {
          glyph = RAMP[Math.min(RAMP.length - 1, Math.floor(c.cov * RAMP.length))];
          g.fillStyle = c.dot
            ? `rgba(47,157,255,${0.55 + 0.45 * c.cov})`
            : `rgba(231,234,239,${0.25 + 0.6 * c.cov})`;
        }
        g.fillText(glyph, c.x, c.y);
        c.heat *= 0.94;
      }
      if (!quiet && (hot || pointer.in || sweep >= 0))
        raf = requestAnimationFrame(draw);
    };
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };

    const move = (e: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      pointer.x = e.clientX - box.left;
      pointer.y = e.clientY - box.top;
      pointer.in = true;
      if (!quiet) wake();
    };
    const leave = () => {
      pointer.in = false;
    };
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      if (quiet) return;
      sweep = performance.now();
      wake();
    });
    const ro = new ResizeObserver(() => {
      build();
      wake();
    });

    let live = true;
    void document.fonts.ready.then(() => {
      if (!live) return;
      ro.observe(canvas);
      io.observe(canvas);
    });
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerleave", leave);
    return () => {
      live = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerleave", leave);
    };
  }, [text, dot, weight, density]);

  return <canvas ref={ref} className={className} aria-hidden />;
}
