"use client";

import { useEffect, useRef } from "react";

import type { Kind } from "@/content/work";

import { KINDS, layout } from "./encoding";
import { CELL, fit } from "./helpers";
import { lookColors, lookOf, reachOf } from "./looks";
import { PORTRAITS, type PortraitId } from "./portraits";
import { drawBody, makeFrame } from "./render";

/* How bright the body is drawn: present, but quieter than the words. */
const ALPHA = { wide: 0.62, narrow: 0.42 };

/**
 * A piece of work's body, behind the top of its own page: the same body
 * the map draws for it (its look, its colours, its seed), turning slowly,
 * off to the side of the column on a wide screen, and on a narrow one half
 * risen past the right edge, behind the end of the title. It sits back: drawn at part strength on a clear canvas over
 * the stars, it doesn't answer the pointer, and it fades out downward, so
 * it sets the scene without pulling the eye from the words.
 */
export function BodyPortrait({
  id,
  kind,
  className,
}: {
  id: string;
  kind: Kind;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const g = ctx;

    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seed = layout().placed.find((p) => p.id === id)?.seed ?? 0.4;
    const body = KINDS[kind].body as PortraitId;
    const portrait = PORTRAITS[body];
    const look = lookOf(id, kind);
    const pal = lookColors(look);
    const [rx, ry] = reachOf(look, body);
    const extent = look.planet
      ? look.planet.ring || look.planet.moons > 1
        ? portrait.extent
        : 1.9
      : look.hole
        ? look.hole.disk + 0.1
        : portrait.extent;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let mono = "monospace";
    let raf = 0;
    let visible = true;

    const resize = () => {
      ({ w, h, dpr } = fit(canvas, 2));
      mono =
        getComputedStyle(canvas).getPropertyValue("--font-mono").trim() || "monospace";
      if (calm) draw(0);
    };

    /* Where the body sits, and how large: in a box to the right of the
       column on a wide screen, at the right edge, level with the title, on
       a narrow one, as large as its reach fits in that box. */
    const place = () => {
      const narrow = w < 900;
      const box = narrow
        ? { cx: w * 0.88, cy: h * 0.2, hx: w * 0.3, hy: h * 0.17 }
        : { cx: w * 0.8, cy: h * 0.44, hx: w * 0.17, hy: h * 0.32 };
      const R = Math.min(box.hx / rx, box.hy / ry) * (0.8 + 0.2 * look.scale);
      return { ...box, R, narrow };
    };

    function draw(t: number) {
      const { cx, cy, R, narrow } = place();
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      const cw = narrow ? CELL.narrow : CELL.wide;
      const ch = cw * 1.72;
      const alpha = narrow ? ALPHA.narrow : ALPHA.wide;
      const frame = makeFrame(t, t * 0.15, 0.35, null, cw / R, ch / R, seed, calm);
      frame.look = look;
      const light = { cx, cy, R, colors: pal, alpha, t, calm, look };
      portrait.under?.(g, light);
      drawBody(g, body, {
        w,
        h,
        cx,
        cy,
        R,
        cw,
        ch,
        frame,
        colors: pal,
        alpha,
        font: `${ch * 0.92}px ${mono}`,
        fn: portrait.fn,
        extent,
        light: portrait.mapLight ?? false,
      });
      portrait.over?.(g, light);
    }

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (visible) draw(now / 1000);
    };

    resize();
    if (!calm) raf = requestAnimationFrame(frame);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver((entries) => {
      /* Several changes can arrive at once: the last is the current one. */
      visible = entries[entries.length - 1].isIntersecting;
    });
    io.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [id, kind]);

  return <canvas ref={ref} aria-hidden className={className} />;
}
