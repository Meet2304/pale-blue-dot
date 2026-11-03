"use client";

import { useEffect, useRef } from "react";

import type { BodyFn } from "@/components/universe/bodies";
import { glyphs } from "@/components/universe/glyph-gl";
import { CELL, fit } from "@/components/universe/helpers";
import {
  drawFlash,
  NOVA_EVERY,
  NOVA_FIRST,
  WAVE_LIFE,
  withWaves,
} from "@/components/universe/nova-burst";
import { createGlow, gatherGlow, shedGlow } from "@/components/universe/orb";
import { PORTRAITS } from "@/components/universe/portraits";
import { drawBody, makeFrame } from "@/components/universe/render";

import a from "./award.module.css";

/**
 * The award's supernova, small, at the side of its page's head: the same
 * body the map draws for it (bodies.ts), with its glow (orb.ts). It goes
 * off by itself every ten seconds or so, as it does on the home page
 * (nova-burst.ts), and it's alive to the pointer for anyone who finds it.
 * Nothing on the page says so.
 *
 *   - Pointed at, its shell bulges away from the pointer, as if pushed by
 *     it; sparks fly off the pointer as it moves; and as the pointer nears
 *     the star at its heart, the core flares.
 *   - Clicked (or Enter or Space), it goes off again: a shockwave of
 *     characters runs out from the core, the core flashes, and a burst of
 *     sparks is flung outwards.
 *   - Dragged, it spins, spikes and all, and coasts to a stop; left alone
 *     it turns, slowly.
 *
 * It draws only while it's on screen, a little over twenty times a second
 * when nothing is happening and every frame when something is, at one and
 * a half times the pixels at most. Under
 * reduced motion it is still, and a press only flares the core.
 */

const SPARKS = ["*", "+", "·", "x", "'"];

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  ch: string;
};

export function Nova({ colors }: { colors: string[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const burstRef = useRef<() => void>(() => {});

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const g = ctx;
    const el: HTMLCanvasElement = canvas;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const portrait = PORTRAITS.supernova;
    const base = portrait.fn;
    const glow = createGlow();

    let w = 0;
    let h = 0;
    let dpr = 1;
    let mono = "monospace";
    let raf = 0;
    let last = 0;
    let visible = true;
    /* Starting turned, so its spikes cross on the diagonals and none stands
       upright as a rule would. */
    let spin = 0.4;
    let spinVel = 0;
    let flare = 0;
    let hover = 0;
    let frames = 0;
    const ptr = { x: 0, y: 0, in: false, down: false, lastX: 0, lastY: 0, moved: 0 };
    const waves: number[] = [];
    const sparks: Spark[] = [];
    /* When it next goes off by itself: a moment after it's first seen,
       then every ten seconds or so. */
    let nextAt = 0;
    const later = (now: number, ms: number) =>
      (nextAt = now + ms + (Math.random() - 0.5) * 1500);

    const radius = () => Math.min(w, h) * 0.34;

    const emit = (
      x: number,
      y: number,
      n: number,
      speed: [number, number],
      life: [number, number],
    ) => {
      for (let i = 0; i < n && sparks.length < 260; i++) {
        const ang = Math.random() * Math.PI * 2;
        const v = speed[0] + Math.random() * (speed[1] - speed[0]);
        const max = life[0] + Math.random() * (life[1] - life[0]);
        sparks.push({
          x,
          y,
          vx: Math.cos(ang) * v,
          vy: Math.sin(ang) * v,
          life: max,
          max,
          ch: SPARKS[Math.floor(Math.random() * SPARKS.length)],
        });
      }
    };

    /* It goes off again. */
    const burst = () => {
      flare = 1;
      if (calm) {
        ask();
        return;
      }
      const now = performance.now();
      waves.push(now);
      /* As many sparks, as fast, as its size allows. */
      const k = Math.min(1, w / 420);
      emit(
        w / 2,
        h / 2,
        Math.round(30 + 40 * k),
        [90 * k + 40, 380 * k + 60],
        [0.6, 1.4],
      );
      later(now, NOVA_EVERY);
      ask();
    };
    burstRef.current = burst;

    function draw(now: number) {
      const t = calm ? 0 : now / 1000;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      const R = radius();
      const cx = w / 2;
      const cy = h / 2;
      const light = { cx, cy, R, colors, alpha: 1, t, calm };
      portrait.under?.(g, light);

      /* The core's flare, white-hot, over its glow. */
      drawFlash(g, cx, cy, R, flare);

      /* The body, spun, pushed by the pointer, and crossed by its waves. */
      const cs = Math.cos(spin);
      const sn = Math.sin(spin);
      const px = (ptr.x - cx) / R;
      const py = (ptr.y - cy) / R;
      const live = waves
        .map((at) => (now - at) / 1000)
        .filter((age) => age < WAVE_LIFE);
      const pushed: BodyFn = (nx, ny, id, f, o) => {
        let sx = nx;
        let sy = ny;
        if (hover > 0.01) {
          const dx = nx - px;
          const dy = ny - py;
          const d = Math.hypot(dx, dy) + 1e-3;
          const k = hover * 0.2 * Math.exp(-(d * d) / 0.07);
          sx -= (dx / d) * k;
          sy -= (dy / d) * k;
        }
        return base(sx * cs + sy * sn, -sx * sn + sy * cs, id, f, o);
      };
      const fn = withWaves(pushed, live);
      const narrow = w < 360;
      const cw = narrow ? CELL.narrow : CELL.wide;
      const ch = cw * 1.72;
      drawBody(g, "supernova", {
        w,
        h,
        cx,
        cy,
        R,
        cw,
        ch,
        frame: makeFrame(t, t * 0.3, 0.35, null, cw / R, ch / R, 0.4, calm),
        colors,
        alpha: 1,
        font: `${ch * 0.92}px ${mono}`,
        fn,
        extent: portrait.extent,
        light: false,
      });

      /* Its spikes, turned with it. */
      g.save();
      g.translate(cx, cy);
      g.rotate(spin);
      g.translate(-cx, -cy);
      portrait.over?.(g, { ...light, R: R * (1 + flare * 0.25) });
      g.restore();

      /* Sparks, and round the pointer the site's reticle. */
      if (sparks.length) {
        const batch = glyphs();
        const font = `12px ${mono}`;
        if (batch) batch.begin(g, font);
        else {
          g.font = font;
          g.textAlign = "center";
          g.textBaseline = "middle";
        }
        for (const s of sparks) {
          const k = s.life / s.max;
          const col = k > 0.6 ? "#ffffff" : colors[3];
          if (batch) {
            batch.color(col, Math.min(1, k * 1.2));
            batch.add(s.ch, s.x, s.y);
          } else {
            g.fillStyle = col;
            g.globalAlpha = Math.min(1, k * 1.2);
            g.fillText(s.ch, s.x, s.y);
          }
        }
        batch?.end();
        g.globalAlpha = 1;
      }

      /* Its own light, spilling round it: gathered every other frame. */
      if (frames++ % 2 === 0) gatherGlow(glow, el);
      shedGlow(g, glow, 0, 0, el.width, el.height, 0.75);

      if (ptr.in && hover > 0.05) {
        const r = 10 + flare * 6;
        const tick = 6;
        g.strokeStyle = colors[3];
        g.globalAlpha = 0.8 * hover;
        g.lineWidth = 1;
        g.beginPath();
        for (const [sx, sy] of [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ]) {
          const x = ptr.x + sx * r;
          const y = ptr.y + sy * r;
          g.moveTo(x, y);
          g.lineTo(x - sx * tick, y);
          g.moveTo(x, y);
          g.lineTo(x, y - sy * tick);
        }
        g.stroke();
        g.globalAlpha = 1;
      }
    }

    const busy = () =>
      ptr.in ||
      waves.length > 0 ||
      sparks.length > 0 ||
      Math.abs(spinVel) > 1e-4 ||
      flare > 0.01 ||
      hover > 0.01;

    function tick(now: number) {
      raf = requestAnimationFrame(tick);
      if (!visible) return;
      if (!nextAt) later(now, NOVA_FIRST);
      else if (now >= nextAt && !ptr.down) burst();
      /* Left alone, a little over twenty frames a second is plenty. */
      if (!busy() && now - last < 44) return;
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      hover += ((ptr.in ? 1 : 0) - hover) * Math.min(1, dt * 8);
      const R = radius();
      const nearCore = ptr.in && Math.hypot(ptr.x - w / 2, ptr.y - h / 2) < R * 0.45;
      flare +=
        ((nearCore ? 0.45 : 0) - flare) * Math.min(1, dt * (flare > 0.5 ? 2.2 : 4));
      if (!ptr.down) spinVel *= Math.pow(0.04, dt);
      spin += spinVel + dt * 0.05;
      while (waves.length && (now - waves[0]) / 1000 > WAVE_LIFE) waves.shift();
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life -= dt;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        const drag = Math.pow(0.18, dt);
        s.vx *= drag;
        s.vy *= drag;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
      }
      draw(now);
    }

    const ask = () => {
      if (calm) draw(performance.now());
    };

    const resize = () => {
      ({ w, h, dpr } = fit(el, 1.5));
      mono = getComputedStyle(el).getPropertyValue("--font-mono").trim() || "monospace";
      if (calm) draw(0);
    };

    const local = (e: PointerEvent) => {
      const box = el.getBoundingClientRect();
      return { x: e.clientX - box.left, y: e.clientY - box.top };
    };
    const onMove = (e: PointerEvent) => {
      const { x, y } = local(e);
      const dx = x - ptr.lastX;
      const dy = y - ptr.lastY;
      ptr.x = x;
      ptr.y = y;
      ptr.in = true;
      if (ptr.down) {
        /* A drag spins it, the way the pointer goes round its centre. */
        const a0 = Math.atan2(ptr.lastY - h / 2, ptr.lastX - w / 2);
        const a1 = Math.atan2(y - h / 2, x - w / 2);
        let da = a1 - a0;
        if (da > Math.PI) da -= Math.PI * 2;
        if (da < -Math.PI) da += Math.PI * 2;
        spinVel = spinVel * 0.5 + da * 0.5;
        ptr.moved += Math.abs(dx) + Math.abs(dy);
      } else if (!calm && e.pointerType === "mouse") {
        const speed = Math.hypot(dx, dy);
        if (speed > 2)
          emit(x, y, Math.min(3, Math.ceil(speed / 14)), [20, 90], [0.35, 0.9]);
      }
      ptr.lastX = x;
      ptr.lastY = y;
    };
    const onDown = (e: PointerEvent) => {
      const { x, y } = local(e);
      ptr.down = true;
      ptr.moved = 0;
      ptr.lastX = x;
      ptr.lastY = y;
      el.setPointerCapture(e.pointerId);
    };
    const onUp = () => {
      if (ptr.down && ptr.moved < 6) burst();
      ptr.down = false;
    };
    const onLeave = () => {
      ptr.in = false;
      ptr.down = false;
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onLeave);
    el.addEventListener("pointerleave", onLeave);

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    const io = new IntersectionObserver((entries) => {
      const was = visible;
      visible = entries[entries.length - 1].isIntersecting;
      /* Back on screen, it waits a moment before going off. */
      if (visible && !was && nextAt) later(performance.now(), NOVA_FIRST);
    });
    io.observe(el);
    if (!calm) raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onLeave);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [colors]);

  return (
    <div className={a.nova}>
      <canvas
        ref={ref}
        className={a.novaCanvas}
        role="button"
        tabIndex={0}
        aria-label="A supernova. Press to set it off again."
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            burstRef.current();
          }
        }}
      />
    </div>
  );
}
