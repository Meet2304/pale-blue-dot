"use client";

import { Fragment, useEffect, useRef, type RefObject } from "react";

import { createIntroSound } from "./intro-sound";
import {
  GREETING_WORDS,
  HEADLINE,
  HEADLINE_WORDS,
  OPENING,
  PERIOD_AT,
  SCRAMBLE,
  type Spoken,
} from "./intro-timeline";
import s from "./universe.module.css";

/**
 * The greeting, and the opening that brings it on.
 *
 * Every visit starts on black, and someone says hello. "Hola!" comes first,
 * on its own; then a breath; then "I'm Meet", at the pace of speech, and
 * the full stop lights in pale blue. Then, beneath it, the line that says
 * who that is: "I am an Engineer." Each word
 * decodes out of the terminal's own glyphs, ticking as it loads. Then both
 * lines fly into the hero, the greeting shrinking into its place and the
 * second line growing into the headline. As they leave, the black lifts
 * away quickly, and Earth, still a single pale blue point of light, grows
 * into the terminal Earth on the same curve, landing as the lines do.
 * Nothing fades and nothing is swapped: the opening's words are the hero's
 * words, and the dot they name is the Earth that appears.
 *
 * The second line is said on one line and breaks into the headline's lines
 * in flight: each of those lines flies as one piece, straight from its
 * place in the sentence to its place in the headline. It is set in the
 * headline's type from the start. The
 * flight changes real font sizes and positions, not transforms, and every
 * destination is measured from the hero itself, so the last frame is the
 * hero's own text, pixel for pixel.
 */

/* Timeline, in ms. The words, the letters and the ticks are in
   intro-timeline.ts, which the sound shares. */
const BEGIN = 500;
const HOLD = 1300;
const FLIGHT = 1500;
/* How far ahead of the first tick the sound is scheduled, so the audio
   clock has room to start it exactly on time. */
const LEAD = 40;
/* How quickly the black lifts once the lines start to fly: fast, so what
   appears is the sky, with Earth still a point of light in it. */
const LIFT = 450;

/* Slow to leave, slow to arrive. */
const ease = (p: number) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);

const panOf = (el: Element) => {
  const r = el.getBoundingClientRect();
  return (((r.left + r.width / 2) / window.innerWidth) * 2 - 1) * 0.6;
};

/* Each tick sits where the text is loading at that moment. */
const tickPans = (spoken: Spoken, ticks: number[], pans: number[], calm: boolean) =>
  ticks.map((at) => {
    const on = spoken.decodingAt(at, calm);
    return on.length ? on.reduce((sum, i) => sum + (pans[i] ?? 0), 0) / on.length : 0;
  });

/**
 * Words as a row of letters, each with a glyph layer for the decode when
 * `live`. Settled letters carry `data-set`.
 */
function Letters({
  words,
  live,
  set,
}: {
  words: string[];
  live: boolean;
  set: boolean;
}) {
  /* Each word is held together: every letter is its own box, and a line
     may otherwise break between any two of them. */
  return words.map((w, wi) => (
    <Fragment key={wi}>
      {wi > 0 && " "}
      <span className={s.word}>
        {[...w].map((c, i) => (
          <span
            key={i}
            className={s.ch}
            data-ch
            data-set={set ? "" : undefined}
            aria-hidden
          >
            <span className={s.chReal}>{c}</span>
            {live && <span className={s.chGlyph} />}
          </span>
        ))}
      </span>
    </Fragment>
  ));
}

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
      <span className={s.srOnly}>{GREETING_WORDS.join(" ")}.</span>
      <Letters words={GREETING_WORDS} live={live} set={!live} />
      <span className={s.ch} data-period data-set={live ? undefined : ""} aria-hidden>
        <span className={`${s.chReal} ${s.period}`}>.</span>
      </span>
    </p>
  );
}

/** The hero's headline, the opening's second line settled. */
export function Headline({
  className,
  ref,
}: {
  className?: string;
  ref?: RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <h1 ref={ref} className={className}>
      <span className={s.srOnly}>{HEADLINE}</span>
      <Letters words={HEADLINE_WORDS} live={false} set />
    </h1>
  );
}

export function Intro({
  target,
  headline,
  onLand,
  onDone,
}: {
  /** The hero's settled greeting, where this one lands. */
  target: RefObject<HTMLElement | null>;
  /** The hero's headline, where the second line lands. */
  headline: RefObject<HTMLElement | null>;
  onLand: () => void;
  onDone: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLParagraphElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const landRef = useRef(onLand);
  const doneRef = useRef(onDone);

  useEffect(() => {
    landRef.current = onLand;
    doneRef.current = onDone;
  }, [onLand, onDone]);

  useEffect(() => {
    const root = rootRef.current;
    const line = lineRef.current;
    const sub = subRef.current;
    if (!root || !line || !sub) return;

    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    /* The greeting's letters, then the second line's, in the order the
       timeline counts them. */
    const letters = [
      ...line.querySelectorAll<HTMLElement>("[data-ch]"),
      ...sub.querySelectorAll<HTMLElement>("[data-ch]"),
    ];
    const subWords = [...sub.querySelectorAll<HTMLElement>(`.${s.word}`)];
    const period = line.querySelector<HTMLElement>("[data-period]");
    const glyphs = letters.map((el) => el.querySelector<HTMLElement>(`.${s.chGlyph}`));
    const starts = calm ? OPENING.wordAt : OPENING.letterAt;
    const scramble = calm ? 0 : SCRAMBLE;
    const timers: number[] = [];
    const sound = createIntroSound();
    /* Where each letter sits across the screen, -1 to 1, so a tick can sit
       where the text is loading. Measured once the type has loaded. */
    let pans: number[] = [];
    let raf = 0;
    let t0 = 0;
    let phase: "wait" | "speak" | "hold" | "fly" = "wait";

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
          const glyph = calm ? "" : OPENING.glyphAt(i, t);
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
      const head = headline.current;
      const to = hero?.getBoundingClientRect();
      const onScreen =
        hero &&
        head &&
        to &&
        to.width > 0 &&
        to.bottom > 0 &&
        to.top < window.innerHeight;
      if (calm || !onScreen) {
        root.dataset.fading = "";
        later(calm ? 450 : 700, finish);
        return;
      }

      /* The greeting flies whole. The second line breaks into the
         headline's lines: its words are grouped by the line each falls on
         in the hero, and each group flies as one rigid line, straight to
         its place, all of them together and with the greeting, on one
         curve. Everything is measured first, then lifted out of the stack
         and placed by its top-left corner, which is where its counterpart
         in the hero starts too. */
      const heroWords = [...head.querySelectorAll<HTMLElement>(`.${s.word}`)];
      const tops = heroWords.map((w) => w.getBoundingClientRect().top);
      const lineOf = tops.reduce<number[]>(
        (acc, top, i) => [
          ...acc,
          i === 0 ? 0 : acc[i - 1] + (top > tops[i - 1] + 2 ? 1 : 0),
        ],
        [],
      );
      /* Each line is carried by its first word. */
      const lead = lineOf.map((n) => lineOf.indexOf(n));
      const lineFrom = line.getBoundingClientRect();
      const lineSize = parseFloat(getComputedStyle(line).fontSize);
      const greetSize = parseFloat(getComputedStyle(hero).fontSize);
      const wordFrom = subWords.map((w) => w.getBoundingClientRect());
      const subSize = parseFloat(getComputedStyle(sub).fontSize);
      const headSize = parseFloat(getComputedStyle(head).fontSize);
      line.dataset.flying = "";
      sub.dataset.flying = "";

      const begin = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - begin) / FLIGHT);
        const e = ease(p);
        /* Measured every frame (all reads before any writes), so all of it
           lands where the hero really is, even if something above it has
           shifted. */
        const greetAt = hero.getBoundingClientRect();
        const heroAt = heroWords.map((w) => w.getBoundingClientRect());

        line.style.left = `${lineFrom.left + (greetAt.left - lineFrom.left) * e}px`;
        line.style.top = `${lineFrom.top + (greetAt.top - lineFrom.top) * e}px`;
        /* Size in log space, like the camera's zoom: a steady rate of
           change, rather than most of it in the first few frames. */
        line.style.fontSize = `${p < 1 ? lineSize * (greetSize / lineSize) ** e : greetSize}px`;

        const size = p < 1 ? subSize * (headSize / subSize) ** e : headSize;
        subWords.forEach((w, i) => {
          /* The line's first word flies from where it was to where it will
             be; every other word keeps its place along the line, scaled to
             the size of the type at this moment, so the line stays rigid. */
          const L = lead[i];
          const ax = wordFrom[L].left + (heroAt[L].left - wordFrom[L].left) * e;
          const ay = wordFrom[L].top + (heroAt[L].top - wordFrom[L].top) * e;
          const scale = size / headSize;
          w.style.left = `${ax + (heroAt[i].left - heroAt[L].left) * scale}px`;
          w.style.top = `${ay + (heroAt[i].top - heroAt[L].top) * scale}px`;
          w.style.fontSize = `${size}px`;
        });
        /* The black goes quickly, before Earth has grown past a point of
           light: the sky appears, and Earth grows into it (the canvas). */
        const lift = Math.min(1, (now - begin) / LIFT);
        root.style.backgroundColor = `rgb(0 0 0 / ${1 - lift * lift * (3 - 2 * lift)})`;
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
        /* The whole run of ticks goes onto the audio clock now; the glyphs
           start on the same beat. */
        const ticks = calm ? OPENING.calmTicks : OPENING.ticks;
        sound.play(ticks, tickPans(OPENING, ticks, pans, calm), LEAD);
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
  }, [target, headline]);

  return (
    <div ref={rootRef} className={s.intro} aria-hidden>
      <div className={s.introStack}>
        <Greeting ref={lineRef} className={s.introLine} live />
        <p ref={subRef} className={s.introSub}>
          <Letters words={HEADLINE_WORDS} live set={false} />
        </p>
      </div>
    </div>
  );
}

/**
 * A heading that is spoken onto the screen the first time it scrolls into
 * view: decoded out of glyphs, ticking as it loads, on its own timeline. If
 * it is already in view when the page loads, or motion is reduced, it is
 * simply there.
 */
export function SpokenTitle({
  spoken,
  className,
}: {
  spoken: Spoken;
  className?: string;
}) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = el.getBoundingClientRect();
    if (box.top < window.innerHeight && box.bottom > 0) return;

    const letters = [...el.querySelectorAll<HTMLElement>("[data-ch]")];
    const glyphs = letters.map((l) => l.querySelector<HTMLElement>(`.${s.chGlyph}`));
    const settle = () =>
      letters.forEach((l, i) => {
        l.dataset.set = "";
        const g = glyphs[i];
        if (g) g.textContent = "";
      });
    /* Held back until it is seen. */
    letters.forEach((l) => delete l.dataset.set);

    let raf = 0;
    let timer = 0;
    let sound: ReturnType<typeof createIntroSound> | null = null;
    const io = new IntersectionObserver(
      (entries) => {
        /* A quick scroll can bring several crossings in one batch (0.3,
           0.66, 1): the last is where the heading is now. */
        const e = entries[entries.length - 1];
        /* As soon as most of it is on screen, so it is never scrolled
           past unspoken. */
        if (!e.isIntersecting || e.intersectionRatio < 0.5) return;
        io.disconnect();
        /* A beat after the chapter starts to rise in. */
        timer = window.setTimeout(() => {
          sound = createIntroSound();
          const pans = letters.map(panOf);
          sound.play(spoken.ticks, tickPans(spoken, spoken.ticks, pans, false), LEAD);
          const t0 = performance.now() + LEAD;
          const step = (now: number) => {
            const t = now - t0;
            let pending = false;
            letters.forEach((l, i) => {
              if (l.dataset.set !== undefined) return;
              pending = true;
              const g = glyphs[i];
              if (t >= spoken.letterAt[i] + SCRAMBLE) {
                l.dataset.set = "";
                if (g) g.textContent = "";
              } else if (g) {
                const glyph = spoken.glyphAt(i, t);
                if (g.textContent !== glyph) g.textContent = glyph;
              }
            });
            if (pending) raf = requestAnimationFrame(step);
            else sound?.close();
          };
          raf = requestAnimationFrame(step);
        }, 250);
      },
      { threshold: [0, 0.6, 1] },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      sound?.close();
      settle();
    };
  }, [spoken]);

  return (
    <h2 ref={ref} className={className}>
      <span className={s.srOnly}>{spoken.text}</span>
      <Letters words={spoken.words.map((w) => w.text)} live set />
    </h2>
  );
}
