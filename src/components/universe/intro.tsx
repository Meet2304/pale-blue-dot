"use client";

import { Fragment, useEffect, useRef, type RefObject } from "react";

import { createIntroSound } from "./intro-sound";
import {
  CALM_TICK_AT,
  LETTER_AT,
  PERIOD_AT,
  SCRAMBLE,
  TEXT,
  TICK_AT,
  WORDS,
  WORD_AT,
  decodingAt,
  glyphAt,
} from "./intro-timeline";
import s from "./universe.module.css";

/**
 * The greeting, and the opening that brings it on.
 *
 * Every visit starts on black, and someone says hello. "Hola!" comes first,
 * on its own; then a breath; then "I'm Meet", at the pace of speech. Each
 * word decodes out of the terminal's own glyphs. The full stop lights last,
 * in pale blue: the dot everything else orbits arrives as the end of the
 * sentence. Then the line settles into the hero, where it stays, and the
 * black lifts off Earth on the same curve, so the whole handover reads as a
 * single move.
 *
 * The flight changes the line's real font size and position, not a
 * transform, so its last frame is the hero's own greeting, pixel for pixel,
 * and nothing jumps when one replaces the other.
 */

/* Timeline, in ms. The words, the letters and the ticks are in
   intro-timeline.ts, which the sound shares. */
const BEGIN = 500;
const HOLD = 1100;
const FLIGHT = 1500;
/* How far ahead of the first tick the sound is scheduled, so the audio
   clock has room to start it exactly on time. */
const LEAD = 40;

/* Slow to leave, slow to arrive. */
const ease = (p: number) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);

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
      {WORDS.map((w, wi) => (
        <Fragment key={w.text}>
          {wi > 0 && " "}
          {[...w.text].map((c, i) => (
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
          ))}
        </Fragment>
      ))}
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
  const landRef = useRef(onLand);
  const doneRef = useRef(onDone);

  useEffect(() => {
    landRef.current = onLand;
    doneRef.current = onDone;
  }, [onLand, onDone]);

  useEffect(() => {
    const root = rootRef.current;
    const line = lineRef.current;
    if (!root || !line) return;

    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const letters = [...line.querySelectorAll<HTMLElement>("[data-ch]")];
    const period = line.querySelector<HTMLElement>("[data-period]");
    const glyphs = letters.map((el) => el.querySelector<HTMLElement>(`.${s.chGlyph}`));
    const starts = calm ? WORD_AT : LETTER_AT;
    const scramble = calm ? 0 : SCRAMBLE;
    const timers: number[] = [];
    const sound = createIntroSound();
    /* Where each letter sits across the screen, -1 to 1, so a tick can sit
       where the text is loading. Measured once the type has loaded. */
    let pans: number[] = [];
    let raf = 0;
    let t0 = 0;
    let phase: "wait" | "speak" | "hold" | "fly" = "wait";

    const panOf = (el: Element) => {
      const r = el.getBoundingClientRect();
      return (((r.left + r.width / 2) / window.innerWidth) * 2 - 1) * 0.6;
    };

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
    };

    /* The glyphs follow the timeline, the same one the ticks were
       scheduled from, so every tick is a visible change in the text. */
    const speak = (now: number) => {
      const t = now - t0;
      let pending = false;
      letters.forEach((el, i) => {
        if (el.dataset.set !== undefined) return;
        pending = true;
        const g = glyphs[i];
        if (t >= starts[i] + scramble) {
          el.dataset.set = "";
          if (g) g.textContent = "";
        } else if (g) {
          const glyph = calm ? "" : glyphAt(i, t);
          if (g.textContent !== glyph) g.textContent = glyph;
        }
      });
      if (period && period.dataset.set === undefined) {
        if (t >= PERIOD_AT) period.dataset.set = "";
        else pending = true;
      }
      if (pending) {
        raf = requestAnimationFrame(speak);
      } else if (phase === "speak") {
        phase = "hold";
        later(HOLD, fly);
      }
    };

    const finish = () => doneRef.current();

    const fly = () => {
      if (phase === "fly") return;
      phase = "fly";
      cancelAnimationFrame(raf);
      /* A skip mid-greeting: the text is all there at once, so the ticks
         still to come are cut. */
      sound.stop();
      settleAll();
      window.scrollTo(0, 0);
      landRef.current();

      const hero = target.current;
      const to = hero?.getBoundingClientRect();
      const onScreen =
        hero && to && to.width > 0 && to.bottom > 0 && to.top < window.innerHeight;
      if (calm || !onScreen) {
        root.dataset.fading = "";
        later(calm ? 450 : 700, finish);
        return;
      }

      /* Lift the line out of the centred layout so it can be placed by its
         top-left corner, which is where the hero's greeting starts too. */
      const from = line.getBoundingClientRect();
      const fromSize = parseFloat(getComputedStyle(line).fontSize);
      const toSize = parseFloat(getComputedStyle(hero).fontSize);
      line.dataset.flying = "";

      const begin = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - begin) / FLIGHT);
        const e = ease(p);
        /* Measured every frame, so the line lands where the hero really
           is, even if something above it has shifted. */
        const at = hero.getBoundingClientRect();
        line.style.left = `${from.left + (at.left - from.left) * e}px`;
        line.style.top = `${from.top + (at.top - from.top) * e}px`;
        /* Size in log space, like the camera's zoom: a steady rate of
           shrinking, rather than most of it in the first few frames. */
        line.style.fontSize = `${p < 1 ? fromSize * (toSize / fromSize) ** e : toSize}px`;
        root.style.backgroundColor = `rgb(0 0 0 / ${1 - e})`;
        if (p < 1) raf = requestAnimationFrame(step);
        else finish();
      };
      raf = requestAnimationFrame(step);
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

    /* Begin only once the type has loaded, so the letters decode in their
       final shapes and the flight measures the real line. */
    let cancelled = false;
    const fonts = document.fonts?.ready ?? Promise.resolve();
    Promise.race([fonts, new Promise((r) => setTimeout(r, 1500))]).then(() => {
      if (cancelled || phase !== "wait") return;
      pans = letters.map(panOf);
      later(BEGIN, () => {
        phase = "speak";
        /* The whole run of ticks goes onto the audio clock now, each placed
           where the text is loading at that moment; the glyphs start on
           the same beat. */
        const ticks = calm ? CALM_TICK_AT : TICK_AT;
        const tickPans = ticks.map((at) => {
          const on = decodingAt(at, starts, scramble);
          return on.length ? on.reduce((sum, i) => sum + pans[i], 0) / on.length : 0;
        });
        sound.play(ticks, tickPans, LEAD);
        t0 = performance.now() + LEAD;
        raf = requestAnimationFrame(speak);
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      sound.close();
      window.removeEventListener("keydown", skip, opts);
      window.removeEventListener("pointerdown", skip, opts);
      window.removeEventListener("wheel", skip, opts);
      window.removeEventListener("touchmove", skip, opts);
    };
  }, [target]);

  return (
    <div ref={rootRef} className={s.intro} aria-hidden>
      <Greeting ref={lineRef} className={s.introLine} live />
    </div>
  );
}
