"use client";

import { useEffect, useRef } from "react";

import { mulberry32 } from "../engine";
import { fit } from "../lab/live-palette";
import type { BodyId } from "./bodies";
import { WAVE_SPAN, colorsFor, drawBodyGrid, makeFrame, type Side } from "./render";

/**
 * The hero window. One body at a time, drawn in characters; when the
 * category changes, a scan wave redraws it as the next body in the next
 * colours. The cursor is a scanner that shows each body's structure. Drag to
 * spin the Earth. Scroll, and whatever is on screen shrinks to the pale blue
 * dot.
 */

const TILT = (23.4 * Math.PI) / 180;
const WAVE_MS = 1300;

export function BodyCanvas({
  body,
  ramp,
  className,
}: {
  body: BodyId;
  ramp: string[];
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const targetRef = useRef<Side>({ body, colors: colorsFor(ramp) });

  useEffect(() => {
    targetRef.current = { body, colors: colorsFor(ramp) };
  }, [body, ramp]);

  useEffect(() => {
    const canvas = ref.current;
    const g = canvas?.getContext("2d");
    if (!canvas || !g) return;

    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const section = canvas.closest("[data-scroll-hero]") as HTMLElement | null;
    const main = canvas.closest("main") as HTMLElement | null;
    const rnd = mulberry32(3);

    let w = 0;
    let h = 0;
    let dpr = 1;
    let cw = 7;
    let ch = 12;
    let mono = "monospace";
    let display = "sans-serif";
    let raf = 0;
    let visible = true;
    let lastCopy = "";

    let from: Side = targetRef.current;
    let to: Side = targetRef.current;
    let waveStart = -1e9;

    const stars = Array.from({ length: 620 }, () => ({
      x: rnd(),
      y: rnd(),
      b: 0.2 + Math.pow(rnd(), 3) * 0.8,
      p: rnd() * 6,
      glyph: rnd() > 0.93,
    }));

    let yaw = 0;
    let yawVel = 0.12;
    let tilt = TILT;
    const pointer = { x: -1e4, y: -1e4, down: false, lastX: 0, lastY: 0, in: false };
    let scanR = 0;

    const resize = () => {
      ({ w, h, dpr } = fit(canvas, 2));
      cw = w < 760 ? 6 : 7;
      ch = w < 760 ? 10 : 12;
      const cs = getComputedStyle(canvas);
      mono = cs.getPropertyValue("--font-mono").trim() || "monospace";
      display = cs.getPropertyValue("--font-display").trim() || "sans-serif";
    };

    let last = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;

      /* A new body or colour starts a new scan from wherever the last one got to. */
      const target = targetRef.current;
      if (target !== to) {
        from = to;
        to = target;
        waveStart = now;
      }
      const wp = calm ? 1 : Math.min(1, (now - waveStart) / WAVE_MS);
      const wave =
        wp >= 1
          ? -1
          : (wp < 0.5 ? 2 * wp * wp : 1 - (-2 * wp + 2) ** 2 / 2) * WAVE_SPAN;

      let p = 0;
      if (section) {
        const box = section.getBoundingClientRect();
        const run = box.height - window.innerHeight;
        p = run > 0 ? Math.min(1, Math.max(0, -box.top / run)) : 0;
      }
      const copy = Math.max(0, 1 - p * 3.5).toFixed(3);
      if (main && copy !== lastCopy) {
        main.style.setProperty("--copy-opacity", copy);
        lastCopy = copy;
      }

      if (!pointer.down && !calm) yawVel += (0.12 - yawVel) * 0.02;
      yaw += calm ? 0 : yawVel * dt;

      const narrow = w < 760;
      const k = Math.min(1, Math.max(0, (p - 0.04) / 0.82));
      const ek = k * k * (3 - 2 * k);
      const R0 = Math.min(w, h) * (narrow ? 0.3 : 0.33);
      const R = Math.max(0.5, R0 * Math.pow(1 - ek, 2.4));
      const cx = w * ((narrow ? 0.5 : 0.64) + (0.5 - (narrow ? 0.5 : 0.64)) * ek);
      const cy = h * ((narrow ? 0.3 : 0.5) + (0.46 - (narrow ? 0.3 : 0.5)) * ek);

      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.globalAlpha = 1;
      g.fillStyle = "#000";
      g.fillRect(0, 0, w, h);

      /* The sky: points, and now and then a glyph, opening up as we pull away. */
      g.font = `9px ${mono}`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillStyle = "#dfe6f5";
      for (const s of stars) {
        g.globalAlpha =
          s.b * (0.35 + ek * 0.5) * (calm ? 1 : 0.7 + 0.3 * Math.sin(t + s.p));
        if (s.glyph) g.fillText("+", s.x * w, s.y * h);
        else g.fillRect(s.x * w, s.y * h, 1.1, 1.1);
      }
      g.globalAlpha = 1;

      /* The scanner grows in when the cursor is over the window. */
      scanR += ((pointer.in ? 0.42 : 0) - scanR) * 0.12;
      const glyphAlpha = Math.min(1, Math.max(0, (R - 18) / 40));
      if (glyphAlpha > 0) {
        const f = makeFrame(
          t,
          yaw,
          tilt,
          scanR > 0.01
            ? { x: (pointer.x - cx) / R, y: (pointer.y - cy) / R, r: scanR }
            : null,
          cw / R,
          calm,
        );
        drawBodyGrid(g, {
          w,
          h,
          cx,
          cy,
          R,
          cw,
          ch,
          frame: f,
          from,
          to,
          wave,
          font: `${ch * 0.92}px ${mono}`,
          alpha: glyphAlpha,
        });

        /* The scanner's reticle: four ticks, not a circle. */
        if (scanR > 0.05) {
          const rr = scanR * R;
          g.strokeStyle = to.colors[3];
          g.globalAlpha = Math.min(0.6, scanR * 1.4) * glyphAlpha;
          g.lineWidth = 1;
          g.beginPath();
          for (let q = 0; q < 4; q++) {
            const a = (q * Math.PI) / 2 + (calm ? 0 : t * 0.4);
            g.moveTo(pointer.x + Math.cos(a) * rr, pointer.y + Math.sin(a) * rr);
            g.lineTo(
              pointer.x + Math.cos(a) * (rr + 9),
              pointer.y + Math.sin(a) * (rr + 9),
            );
          }
          g.stroke();
          g.globalAlpha = 1;
        }
      }

      /* Past the point where characters can draw it, it is only light. */
      if (glyphAlpha < 1) {
        const a = 1 - glyphAlpha;
        const r = Math.max(1.8, Math.min(R, 18));
        const grad = g.createRadialGradient(cx, cy, 0, cx, cy, r * 6);
        grad.addColorStop(0, hexA(to.colors[4], 0.9 * a));
        grad.addColorStop(0.15, hexA(to.colors[2], 0.45 * a));
        grad.addColorStop(1, hexA(to.colors[2], 0));
        g.fillStyle = grad;
        g.beginPath();
        g.arc(cx, cy, r * 6, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = hexA(to.colors[4], a);
        g.beginPath();
        g.arc(cx, cy, r * 0.45, 0, Math.PI * 2);
        g.fill();
      }

      const cap = Math.min(1, Math.max(0, (p - 0.78) / 0.14));
      if (cap > 0) {
        g.globalAlpha = cap;
        g.textAlign = "center";
        g.textBaseline = "top";
        g.fillStyle = "#eef0f4";
        g.font = `300 ${narrow ? 22 : 30}px ${display}`;
        g.fillText("That's here. That's home.", w / 2, cy + 48);
        g.font = `12px ${mono}`;
        g.fillStyle = hexA(to.colors[3], 0.8);
        g.fillText("Everything below happened on that pixel.", w / 2, cy + 92);
        g.globalAlpha = 1;
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
      /* Only the sky itself scans: not the nav, the copy or the readout. */
      pointer.in = e.target === canvas;
    };
    const onDown = (e: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      pointer.down = true;
      pointer.lastX = e.clientX - box.left;
      pointer.lastY = e.clientY - box.top;
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

function hexA(hex: string, a: number) {
  const v = parseInt(hex.slice(1), 16);
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`;
}
