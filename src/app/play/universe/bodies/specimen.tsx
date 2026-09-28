"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { fit } from "../../systems/lab/live-palette";
import type { BodyId } from "../bodies";
import { EARTH_COLORS, KINDS, KIND_ORDER, colorsOf, type Kind } from "../data";
import { drawBody, makeFrame } from "../render";
import s from "../universe.module.css";

/** Each body alone and large, for judging it and tuning it. Hover to scan. */
export function BodySpecimen() {
  const [kind, setKind] = useState<Kind | "earth">("research");
  const ref = useRef<HTMLCanvasElement>(null);
  const kindRef = useRef(kind);

  useEffect(() => {
    kindRef.current = kind;
  }, [kind]);

  useEffect(() => {
    const canvas = ref.current;
    const g = canvas?.getContext("2d");
    if (!canvas || !g) return;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let mono = "monospace";
    let raf = 0;
    const pointer = { x: -1e4, y: -1e4, in: false };
    const resize = () => {
      ({ w, h, dpr } = fit(canvas, 2));
      mono =
        getComputedStyle(canvas).getPropertyValue("--font-mono").trim() || "monospace";
    };
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const t = now / 1000;
      const k = kindRef.current;
      const body: BodyId = k === "earth" ? "earth" : KINDS[k].body;
      const colors =
        k === "earth" ? EARTH_COLORS : colorsOf(KINDS[k].hue, KINDS[k].l, KINDS[k].c);
      const R = Math.min(w, h) * (k === "earth" ? 0.36 : 0.2);
      const cx = w / 2;
      const cy = h / 2;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = "#000";
      g.fillRect(0, 0, w, h);
      const cw = 7;
      const ch = 12;
      drawBody(g, body, {
        w,
        h,
        cx,
        cy,
        R,
        cw,
        ch,
        frame: makeFrame(
          t,
          t * 0.12,
          0.41,
          pointer.in
            ? { x: (pointer.x - cx) / R, y: (pointer.y - cy) / R, r: 0.45 }
            : null,
          cw / R,
          ch / R,
          0.4,
          false,
        ),
        colors,
        alpha: 1,
        font: `${ch * 0.92}px ${mono}`,
      });
    };
    resize();
    raf = requestAnimationFrame(frame);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const onMove = (e: PointerEvent) => {
      const b = canvas.getBoundingClientRect();
      pointer.x = e.clientX - b.left;
      pointer.y = e.clientY - b.top;
      pointer.in = e.target === canvas;
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <main className={s.root}>
      <div className={s.stage}>
        <canvas ref={ref} className={s.canvas} aria-hidden />
        <nav className={s.filter} aria-label="Body">
          <button
            type="button"
            aria-pressed={kind === "earth"}
            onClick={() => setKind("earth")}
          >
            earth
          </button>
          {KIND_ORDER.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
            >
              <span className={s.mark}>{KINDS[k].mark}</span>
              {KINDS[k].bodyName}
            </button>
          ))}
        </nav>
        <p className={s.specimenNote}>
          {kind === "earth" ? "home" : KINDS[kind].label.toLowerCase()}, hover to scan.{" "}
          <Link href="/play/universe">Back to the universe</Link>
        </p>
      </div>
    </main>
  );
}
