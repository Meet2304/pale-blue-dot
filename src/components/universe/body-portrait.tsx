"use client";

import { useEffect, useRef } from "react";

import type { Kind } from "@/content/work";

import { KINDS, kindColors, layout } from "./encoding";
import { fit } from "./helpers";
import { drawBody, makeFrame } from "./render";

/**
 * One unit's body, alone and large, for the top of its own page. The seed is
 * the one the map uses, so a constellation or a nebula has the same shape
 * here as it does out in the universe. Hover to scan it, as on the map.
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
    const g = canvas?.getContext("2d");
    if (!canvas || !g) return;

    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seed = layout().placed.find((p) => p.id === id)?.seed ?? 0.4;
    const body = KINDS[kind].body;
    const colors = kindColors(kind);

    let w = 0;
    let h = 0;
    let dpr = 1;
    let mono = "monospace";
    let raf = 0;
    let visible = true;
    const pointer = { x: -1e4, y: -1e4, in: false };

    const resize = () => {
      ({ w, h, dpr } = fit(canvas, 2));
      mono =
        getComputedStyle(canvas).getPropertyValue("--font-mono").trim() || "monospace";
    };

    /* Where the body sits: to the right of the text on a wide screen, above
       it on a narrow one, matching the universe's framing. */
    const place = () => {
      const narrow = w < 760;
      return {
        cx: w * (narrow ? 0.5 : 0.64),
        cy: h * (narrow ? 0.3 : 0.5),
        R: Math.min(w * (narrow ? 0.9 : 0.5), h * (narrow ? 0.5 : 0.8)) * 0.24,
      };
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      const t = now / 1000;
      const { cx, cy, R } = place();
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.globalAlpha = 1;
      g.fillStyle = "#000";
      g.fillRect(0, 0, w, h);
      const cw = w < 760 ? 6 : 7;
      const ch = cw * 1.72;
      const scan =
        pointer.in && Math.hypot(pointer.x - cx, pointer.y - cy) < R * 1.4
          ? { x: (pointer.x - cx) / R, y: (pointer.y - cy) / R, r: 0.45 }
          : null;
      drawBody(g, body, {
        w,
        h,
        cx,
        cy,
        R,
        cw,
        ch,
        frame: makeFrame(t, 0, 0, scan, cw / R, ch / R, seed, calm),
        colors,
        alpha: 1,
        font: `${ch * 0.92}px ${mono}`,
      });
    };

    resize();
    raf = requestAnimationFrame(frame);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver((entries) => {
      /* Several changes can arrive at once: the last is the current one. */
      visible = entries[entries.length - 1].isIntersecting;
    });
    io.observe(canvas);
    const onMove = (e: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      pointer.x = e.clientX - box.left;
      pointer.y = e.clientY - box.top;
      pointer.in = e.target === canvas;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, [id, kind]);

  return <canvas ref={ref} aria-hidden className={className} />;
}
