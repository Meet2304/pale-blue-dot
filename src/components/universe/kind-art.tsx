"use client";

import { useEffect, useRef } from "react";

import type { Kind } from "@/content/work";

import { hash, type Cell } from "./bodies";
import { KINDS, kindColors } from "./encoding";
import { fit, mulberry32 } from "./helpers";
import { GLYPHS } from "./intro-timeline";
import { PORTRAITS, type PortraitId } from "./portraits";
import { drawBody, makeFrame } from "./render";
import s from "./universe.module.css";

/*
 * The kinds' bodies, drawn live for the bar's panel (nav.tsx) and the
 * phone's drawer (drawer.tsx). A chunk of their own: the portraits behind
 * them are only fetched once the page is idle or a menu is reached for, so
 * the pages beside the universe never wait on them.
 */

/* The kind's body, live, over a field of stars. Switching kinds with the
   panel open morphs one body into the other rather than starting over: every
   glyph cell hands over from the old body to the new one through a moment
   of scramble, the change spreading out from the centre, while their light
   passes from one to the other. */
const MORPH = 520;

export function KindViewer({ open, kind }: { open: boolean; kind: Kind }) {
  const ref = useRef<HTMLCanvasElement>(null);
  /* Which body is showing, and which it is becoming. */
  const morph = useRef({ from: kind, to: kind, at: 0 });

  useEffect(() => {
    const m = morph.current;
    if (m.to === kind) return;
    morph.current = { from: m.to, to: kind, at: open ? performance.now() : 0 };
  }, [kind, open]);

  useEffect(() => {
    const canvas = ref.current;
    const g = canvas?.getContext("2d");
    if (!open || !canvas || !g) return;

    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    /* Opening shows the current body without a morph. */
    morph.current = { from: morph.current.to, to: morph.current.to, at: 0 };
    const rnd = mulberry32(29);
    const stars = Array.from({ length: 360 }, () => ({
      x: rnd(),
      y: rnd(),
      b: 0.2 + rnd() ** 3 * 0.8,
      p: rnd() * 6.28,
      r: 0.6 + rnd() * 1.6,
    }));
    let w = 0;
    let h = 0;
    let dpr = 1;
    let mono = "monospace";
    let lift = 0;
    const pointer = { x: -1e4, y: -1e4, in: false };
    const opened = performance.now();
    let raf = 0;

    const measure = () => {
      ({ w, h, dpr } = fit(canvas, 2));
      mono =
        getComputedStyle(canvas).getPropertyValue("--font-mono").trim() || "monospace";
    };

    /* A body's portrait, and its size in this frame. */
    const sized = (k: Kind, grow: number) => {
      const portrait = PORTRAITS[KINDS[k].body as PortraitId];
      const [rx, ry] = portrait.reach;
      const R =
        Math.min(w / 2 / rx, h / 2 / ry) *
        0.88 *
        (0.5 + 0.5 * grow) *
        (1 + 0.05 * lift);
      const cw = portrait.cell ?? Math.max(2.6, Math.min(3.8, R * 0.022 + 0.6));
      return {
        portrait,
        R,
        cw,
        colors: kindColors(k),
        body: KINDS[k].body as PortraitId,
      };
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const t = now / 1000;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.globalAlpha = 1;
      g.fillStyle = "#000";
      g.fillRect(0, 0, w, h);

      lift = calm ? (pointer.in ? 1 : 0) : lift + ((pointer.in ? 1 : 0) - lift) * 0.12;
      const k0 = calm ? 1 : Math.min(1, (now - opened) / 650);
      const grow = k0 * k0 * (3 - 2 * k0);
      const { from, to, at } = morph.current;
      const mRaw = calm || !at ? 1 : Math.min(1, (now - at) / MORPH);
      if (mRaw >= 1 && from !== to) morph.current = { from: to, to, at: 0 };
      const m = mRaw * mRaw * (3 - 2 * mRaw);

      const next = sized(to, grow);
      const prev = from !== to ? sized(from, grow) : null;
      const cx = w / 2;
      const cy = h / 2;
      const { R, cw } = next;
      const ch = cw * 1.72;
      const alpha = grow * (0.82 + 0.18 * lift);
      const scan =
        pointer.in && Math.hypot(pointer.x - cx, pointer.y - cy) < R * 2
          ? { x: (pointer.x - cx) / R, y: (pointer.y - cy) / R, r: 0.42 }
          : null;

      /* The sky behind, even across the whole viewer. Around a black hole
         it is lensed: each star is seen pushed outward from the hole (the
         outer image of a point lens), and stretched round it into a short
         arc, the more the closer it lies. */
      const lensR =
        ((next.portrait.lens ?? 0) * next.R * (prev ? m : 1) +
          (prev ? (prev.portrait.lens ?? 0) * prev.R * (1 - m) : 0)) *
        (0.6 + 0.4 * grow);
      g.fillStyle = "#dfe6f5";
      g.strokeStyle = "#dfe6f5";
      g.lineWidth = 1;
      for (let i = 0; i < stars.length; i++) {
        const st = stars[i];
        /* Most viewers show a sparser sky; the black hole gets it all. */
        if (i >= 140 && lensR < 1) continue;
        const a = st.b * (calm ? 0.6 : 0.4 + 0.3 * Math.sin(t * st.r + st.p));
        let x = st.x * w;
        let y = st.y * h;
        if (lensR < 1) {
          g.globalAlpha = a;
          g.fillRect(x, y, 1.1, 1.1);
          continue;
        }
        const dx = x - cx;
        const dy = y - cy;
        const d = Math.max(1, Math.hypot(dx, dy));
        const seen = (d + Math.sqrt(d * d + 4 * lensR * lensR)) / 2;
        x = cx + (dx / d) * seen;
        y = cy + (dy / d) * seen;
        const stretch = Math.min(18, (seen / d - 1) * 3);
        g.globalAlpha = Math.min(
          1,
          a * (1 + stretch * 0.08) * (i >= 140 ? Math.min(1, lensR / 40) : 1),
        );
        if (stretch < 0.6) {
          g.fillRect(x, y, 1.1, 1.1);
        } else {
          const ang = Math.atan2(dy, dx) + Math.PI / 2;
          const half = stretch / 2;
          g.beginPath();
          g.moveTo(x - Math.cos(ang) * half, y - Math.sin(ang) * half);
          g.lineTo(x + Math.cos(ang) * half, y + Math.sin(ang) * half);
          g.stroke();
        }
      }
      g.globalAlpha = 1;

      /* Light passes from one body to the other. */
      const lightOf = (b: ReturnType<typeof sized>, share: number) => ({
        cx,
        cy,
        R: b.R,
        colors: b.colors,
        alpha: alpha * share,
        t,
        calm,
      });
      if (prev) prev.portrait.under?.(g, lightOf(prev, 1 - m));
      next.portrait.under?.(g, lightOf(next, prev ? m : 1));

      const frameFor = (b: ReturnType<typeof sized>) =>
        makeFrame(
          t,
          t * 0.3,
          0.35,
          scan && { ...scan, x: scan.x * (R / b.R), y: scan.y * (R / b.R) },
          cw / b.R,
          ch / b.R,
          0.4,
          calm,
        );
      const fNext = frameFor(next);

      if (!prev) {
        drawBody(g, next.body, {
          w,
          h,
          cx,
          cy,
          R,
          cw,
          ch,
          frame: fNext,
          colors: next.colors,
          alpha,
          font: `${ch * 0.92}px ${mono}`,
          fn: next.portrait.fn,
          extent: next.portrait.extent,
          light: next.portrait.mapLight ?? false,
        });
      } else {
        /* The morph: one pass over the grid, each cell showing the old body,
           the new one, or (at the moving edge between them) a scrambled
           glyph. The edge sweeps out from the centre, with some grain, so
           the new body grows through the old. The old body's colours are
           the second seven. */
        const fPrev = frameFor(prev);
        const sp = R / prev.R;
        const reachPrev = prev.portrait.extent * (prev.R / R);
        const extent = Math.max(next.portrait.extent, reachPrev);
        const band = 0.12;
        const sweep = m * (1 + 2 * band) - band;
        const both = (nx: number, ny: number, id: number, _f: unknown, o: Cell) => {
          const order =
            0.6 * hash(id, 77) + 0.4 * Math.min(1, Math.hypot(nx, ny) / extent);
          if (order < sweep - band) return next.portrait.fn(nx, ny, id, fNext, o);
          if (order > sweep + band) {
            if (!prev.portrait.fn(nx * sp, ny * sp, id, fPrev, o)) return false;
            o.k += 7;
            return true;
          }
          const hit =
            next.portrait.fn(nx, ny, id, fNext, o) ||
            (prev.portrait.fn(nx * sp, ny * sp, id, fPrev, o) && ((o.k += 7), true));
          if (!hit) return false;
          o.c = GLYPHS[Math.floor(hash(id, Math.floor(t * 30)) * GLYPHS.length)];
          return true;
        };
        drawBody(g, next.body, {
          w,
          h,
          cx,
          cy,
          R,
          cw,
          ch,
          frame: fNext,
          colors: [...next.colors, ...prev.colors],
          alpha,
          font: `${ch * 0.92}px ${mono}`,
          fn: both,
          extent,
          light: false,
        });
      }

      if (prev) prev.portrait.over?.(g, lightOf(prev, 1 - m));
      next.portrait.over?.(g, lightOf(next, prev ? m : 1));

      /* The reticle: four ticks, no circle, as on the map. */
      if (lift > 0.02) {
        const [rx, ry] = next.portrait.reach;
        const ax = Math.min(w * 0.46, R * rx * 1.05);
        const ay = Math.min(h * 0.44, R * ry * 1.1);
        const tick = 8;
        g.strokeStyle = next.colors[3];
        g.globalAlpha = lift * 0.85;
        g.lineWidth = 1;
        g.beginPath();
        for (const [dx, dy] of [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ]) {
          const x = cx + dx * ax;
          const y = cy + dy * ay;
          g.moveTo(x, y);
          g.lineTo(x - dx * tick, y);
          g.moveTo(x, y);
          g.lineTo(x, y - dy * tick);
        }
        g.stroke();
        g.globalAlpha = 1;
      }
    };

    measure();
    raf = requestAnimationFrame(frame);
    const ro = new ResizeObserver(measure);
    ro.observe(canvas);
    const onMove = (e: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      pointer.x = e.clientX - box.left;
      pointer.y = e.clientY - box.top;
      pointer.in = true;
    };
    const onLeave = () => {
      pointer.in = false;
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, [open]);

  return (
    <div className={s.viewer}>
      <canvas ref={ref} className={s.viewerCanvas} aria-hidden />
    </div>
  );
}

/* A kind's body, small and live: the same portrait the bar's panels draw,
   turning slowly while the drawer is open. */
export function KindThumb({ kind, live }: { kind: Kind; live: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const g = canvas?.getContext("2d");
    if (!canvas || !g || !live) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const body = KINDS[kind].body as PortraitId;
    const portrait = PORTRAITS[body];
    const colors = kindColors(kind);
    const mono =
      getComputedStyle(canvas).getPropertyValue("--font-mono").trim() || "monospace";
    const { w, h, dpr } = fit(canvas, 2);
    const [rx, ry] = portrait.reach;
    const R = Math.min(w / 2 / rx, h / 2 / ry) * 0.92;
    const cw = portrait.cell ? Math.max(2.4, portrait.cell * 0.6) : 2.2;
    const ch = cw * 1.72;
    let raf = 0;
    let last = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      /* A dozen frames a second is plenty for a body this small. */
      if (now - last < 80) return;
      last = now;
      const t = calm ? 0 : now / 1000;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      const light = { cx: w / 2, cy: h / 2, R, colors, alpha: 1, t, calm };
      portrait.under?.(g, light);
      drawBody(g, body, {
        w,
        h,
        cx: w / 2,
        cy: h / 2,
        R,
        cw,
        ch,
        frame: makeFrame(t, t * 0.3, 0.35, null, cw / R, ch / R, 0.4, calm),
        colors,
        alpha: 1,
        font: `${ch * 0.92}px ${mono}`,
        fn: portrait.fn,
        extent: portrait.extent,
        light: portrait.mapLight ?? false,
      });
      portrait.over?.(g, light);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [kind, live]);

  return <canvas ref={ref} className={s.thumb} aria-hidden />;
}
