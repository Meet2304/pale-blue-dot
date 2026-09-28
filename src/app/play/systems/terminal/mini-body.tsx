"use client";

import { useEffect, useRef } from "react";

import { fit } from "../lab/live-palette";
import type { BodyId } from "./bodies";
import { WAVE_SPAN, colorsFor, drawBodyGrid, makeFrame, type Side } from "./render";

/**
 * A module's screen: the same renderer as the hero, smaller, at 30 fps. It
 * rescans (the scan wave, redrawing itself) whenever `rescan` changes, and
 * its scanner follows the cursor while the cursor is over it.
 */
export function MiniBody({
  body,
  ramp,
  rescan = 0,
  scale = 0.36,
  cellW = 5,
  cellH = 8,
  className,
}: {
  body: BodyId;
  ramp: string[];
  rescan?: number;
  /** Body radius as a fraction of the screen's shorter side. */
  scale?: number;
  cellW?: number;
  cellH?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const sideRef = useRef<Side>({ body, colors: colorsFor(ramp) });
  const rescanRef = useRef(rescan);

  useEffect(() => {
    sideRef.current = { body, colors: colorsFor(ramp) };
  }, [body, ramp]);

  useEffect(() => {
    rescanRef.current = rescan;
  }, [rescan]);

  useEffect(() => {
    const canvas = ref.current;
    const g = canvas?.getContext("2d");
    if (!canvas || !g) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let mono = "monospace";
    let raf = 0;
    let visible = false;
    let last = 0;
    let from = sideRef.current;
    let to = sideRef.current;
    let seen = rescanRef.current;
    let waveStart = -1e9;
    const pointer = { x: 0, y: 0, in: false };
    let scanR = 0;

    const resize = () => {
      ({ w, h, dpr } = fit(canvas, 2));
      mono =
        getComputedStyle(canvas).getPropertyValue("--font-mono").trim() || "monospace";
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible || now - last < 32) return;
      last = now;
      const t = now / 1000;
      if (sideRef.current !== to || rescanRef.current !== seen) {
        from = to;
        to = sideRef.current;
        seen = rescanRef.current;
        waveStart = now;
      }
      const wp = calm ? 1 : Math.min(1, (now - waveStart) / 900);
      const wave = wp >= 1 ? -1 : wp * WAVE_SPAN;
      const R = Math.min(w, h) * scale;
      const cx = w / 2;
      const cy = h / 2;
      scanR += ((pointer.in ? 0.5 : 0) - scanR) * 0.2;

      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      drawBodyGrid(g, {
        w,
        h,
        cx,
        cy,
        R,
        cw: cellW,
        ch: cellH,
        frame: makeFrame(
          t,
          t * 0.12,
          0.41,
          scanR > 0.01
            ? { x: (pointer.x - cx) / R, y: (pointer.y - cy) / R, r: scanR }
            : null,
          cellW / R,
          calm,
        ),
        from,
        to,
        wave,
        font: `${cellH * 0.95}px ${mono}`,
      });
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
      pointer.x = e.clientX - box.left;
      pointer.y = e.clientY - box.top;
    };
    const onEnter = () => {
      pointer.in = true;
    };
    const onLeave = () => {
      pointer.in = false;
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerenter", onEnter);
    canvas.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerenter", onEnter);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, [scale, cellW, cellH]);

  return <canvas ref={ref} aria-hidden className={className} />;
}
