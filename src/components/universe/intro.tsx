"use client";

import { useEffect, useRef, type RefObject } from "react";

import s from "./universe.module.css";

/**
 * The greeting, and the opening that brings it on.
 *
 * Every visit starts on black with one point of light: the pale blue dot.
 * The greeting decodes out of the terminal's own glyphs, letter by letter,
 * and the point of light glides into place as its full stop. Then the whole
 * line flies down into the hero, where it stays, and the black lifts off
 * Earth. So the first thing anyone learns is whose universe this is, and the
 * dot they meet first is the one everything else orbits.
 *
 * The line is laid out identically here and in the hero (same component,
 * same letters), so the flight is a plain FLIP: measure both, then move
 * and scale one onto the other.
 */

const TEXT = "Hola! I'm Meet";

/* The terminal's light glyphs, the ones the bodies are drawn with. */
const GLYPHS = ["·", ":", "+", "×", "=", "~", "-", "*", ";"];

/* Timeline, in ms. */
const DOT_IN = 650;
const DECODE_AT = 800;
const STAGGER = 55;
const SCRAMBLE = 320;
const HOLD = 700;
const FLIGHT = 950;

/**
 * The greeting as a row of letters. `live` renders each one with a glyph
 * layer for the decode; the hero renders it settled.
 */
export function Greeting({
  className,
  live = false,
  ref,
}: {
  className?: string;
  live?: boolean;
  ref?: RefObject<HTMLParagraphElement | null>;
}) {
  return (
    <p ref={ref} className={className}>
      <span className={s.srOnly}>{TEXT}.</span>
      {[...TEXT].map((c, i) =>
        c === " " ? (
          " "
        ) : (
          <span
            key={i}
            className={s.ch}
            data-ch
            data-set={live ? undefined : ""}
            aria-hidden
          >
            <span className={s.chReal}>{c}</span>
            {live && <span className={s.chGlyph} />}
          </span>
        ),
      )}
      <span className={s.ch} data-period data-set={live ? undefined : ""} aria-hidden>
        <span className={`${s.chReal} ${s.period}`}>.</span>
      </span>
    </p>
  );
}

export function Intro({
  target,
  onLand,
  onDone,
}: {
  /** The hero's settled greeting, where this one lands. */
  target: RefObject<HTMLElement | null>;
  onLand: () => void;
  onDone: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLParagraphElement>(null);
  const dotRef = useRef<HTMLSpanElement>(null);
  const landRef = useRef(onLand);
  const doneRef = useRef(onDone);

  useEffect(() => {
    landRef.current = onLand;
    doneRef.current = onDone;
  }, [onLand, onDone]);

  useEffect(() => {
    const root = rootRef.current;
    const line = lineRef.current;
    const dot = dotRef.current;
    if (!root || !line || !dot) return;

    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const letters = [...line.querySelectorAll<HTMLElement>("[data-ch]")];
    const period = line.querySelector<HTMLElement>("[data-period]");
    const glyphs = letters.map((el) => el.querySelector<HTMLElement>(`.${s.chGlyph}`));
    const timers: number[] = [];
    let raf = 0;
    let t0 = 0;
    let phase: "wait" | "decode" | "hold" | "fly" = "wait";

    /* Start at the top: the greeting lands in the hero. */
    window.scrollTo(0, 0);

    const later = (ms: number, fn: () => void) => {
      timers.push(window.setTimeout(fn, ms));
    };

    const settleAll = () => {
      letters.forEach((el, i) => {
        el.dataset.set = "";
        const g = glyphs[i];
        if (g) g.textContent = "";
      });
      if (period) period.dataset.set = "";
      dot.dataset.gone = "";
    };

    /* Where the full stop sits, so the point of light can become it. */
    const placeDot = () => {
      if (!period) return;
      const r = period.getBoundingClientRect();
      const box = root.getBoundingClientRect();
      dot.style.left = `${r.left + r.width / 2 - box.left}px`;
      dot.style.top = `${r.top + r.height * 0.74 - box.top}px`;
    };

    const decode = (now: number) => {
      const t = now - t0;
      let pending = false;
      letters.forEach((el, i) => {
        const start = i * STAGGER;
        if (el.dataset.set !== undefined) return;
        pending = true;
        const g = glyphs[i];
        if (!g) return;
        if (t < start) {
          g.textContent = "";
        } else if (t < start + SCRAMBLE) {
          g.textContent = GLYPHS[Math.floor(now / 60 + i * 3) % GLYPHS.length];
        } else {
          el.dataset.set = "";
          g.textContent = "";
        }
      });
      if (period && t > letters.length * STAGGER + SCRAMBLE * 0.5) {
        period.dataset.set = "";
        dot.dataset.gone = "";
      }
      if (pending) {
        raf = requestAnimationFrame(decode);
      } else if (phase === "decode") {
        phase = "hold";
        later(HOLD, fly);
      }
    };

    const finish = () => doneRef.current();

    const fly = () => {
      if (phase === "fly") return;
      phase = "fly";
      cancelAnimationFrame(raf);
      settleAll();
      window.scrollTo(0, 0);
      landRef.current();
      root.dataset.lifting = "";

      const to = target.current?.getBoundingClientRect();
      const from = line.getBoundingClientRect();
      const onScreen =
        to && to.width > 0 && to.bottom > 0 && to.top < window.innerHeight;
      if (calm || !onScreen) {
        root.dataset.fading = "";
        later(calm ? 450 : 700, finish);
        return;
      }
      const k = to.width / from.width;
      line.style.transition = `transform ${FLIGHT}ms cubic-bezier(0.65, 0, 0.35, 1)`;
      line.style.transformOrigin = "0 0";
      line.style.transform = `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${k})`;
      later(FLIGHT + 30, finish);
    };

    /* Any key, click, tap or scroll skips ahead to the landing, and the
       page holds still until the line has landed. (Hiding the overflow
       instead would take the scrollbar away and bring it back, shifting the
       hero sideways under the line as it lands.) */
    const skip = (e: Event) => {
      if (e.cancelable) e.preventDefault();
      e.stopImmediatePropagation();
      fly();
    };
    const opts = { capture: true, passive: false } as const;
    window.addEventListener("keydown", skip, opts);
    window.addEventListener("pointerdown", skip, opts);
    window.addEventListener("wheel", skip, opts);
    window.addEventListener("touchmove", skip, opts);

    /* Measure only once the type has loaded, or the dot lands in the
       wrong place. */
    let cancelled = false;
    const fonts = document.fonts?.ready ?? Promise.resolve();
    Promise.race([fonts, new Promise((r) => setTimeout(r, 1500))]).then(() => {
      if (cancelled || phase !== "wait") return;
      root.dataset.ready = "";
      if (calm) {
        settleAll();
        phase = "hold";
        later(1400, fly);
        return;
      }
      later(DOT_IN, () => {
        placeDot();
        dot.dataset.moving = "";
      });
      later(DECODE_AT, () => {
        phase = "decode";
        t0 = performance.now();
        raf = requestAnimationFrame(decode);
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      window.removeEventListener("keydown", skip, opts);
      window.removeEventListener("pointerdown", skip, opts);
      window.removeEventListener("wheel", skip, opts);
      window.removeEventListener("touchmove", skip, opts);
    };
  }, [target]);

  return (
    <div ref={rootRef} className={s.intro} aria-hidden>
      <span ref={dotRef} className={s.introDot} />
      <Greeting ref={lineRef} className={s.introLine} live />
    </div>
  );
}
