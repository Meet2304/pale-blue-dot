"use client";

import { useEffect, useRef, type CSSProperties } from "react";

import {
  HORIZON,
  NightHorizon,
  type SceneDrivers,
} from "@/components/horizon/night-horizon";

/**
 * The hero and the warp are one sticky viewport over a tall scroll runway.
 *
 * Load: `reveal` runs on a clock. The horizon hairline draws itself outward
 * from mid-screen — that width is the progress bar — then descends into place
 * while the sky, stars and water resolve around it.
 *
 * Scroll: `warp` follows scroll through a spring rather than tracking it
 * directly, so the user drives the flight but the motion is never handed the
 * raw step function that a wheel produces. Past a short dead zone the stars
 * stretch into streaks, the horizon drops away, and the pale blue dot grows
 * until its light takes the screen. The handover to black and the beat of
 * darkness after it each get their own stretch of runway — see the windows
 * below — so the next section arrives out of the dark, not out of a flash.
 *
 * Nothing here is React state: the loop writes uniforms and overlay opacities
 * straight to refs and inline styles, so a full scroll-through costs no renders.
 */

/**
 * Black screen to formed hero.
 *
 * The line draw occupies the first 45% of this, so at 1400 it lands at ~630ms
 * and the scene is complete at 1.4s, with the headline settled just before
 * 1.9s — the budget the original spec set. It ran at 2400 and felt like being
 * held: a loader earns its time by having something left to show, and this one
 * has shown everything it has well before then.
 */
const REVEAL_MS = 1400;

/**
 * Scroll runway height, in viewport units. The sticky pane is 1 of these, so
 * the warp costs `RUNWAY_VH - 100` of actual scrolling.
 *
 * At 420 that was 320svh — around 29 wheel notches to get past the hero, which
 * makes the transition a toll booth rather than a flourish. The page exists to
 * show the work, and nothing here is worth making someone grind through it.
 * 240 costs 140svh, roughly 13 notches: still long enough to read as a flight
 * you are steering, short enough that nobody has to commit to it.
 */
const RUNWAY_VH = 240;

/** Fraction of the runway spent at rest before the warp starts. */
const DEAD_ZONE = 0.06;

/**
 * How the runway is spent after the dead zone. One sprung scalar, `progress`,
 * runs 0..1 across it, and each stage reads its own window:
 *
 *   0.00 – 0.72   the flight, ending with the dot's light filling the frame
 *   0.72 – 0.89   the light gives way to black
 *   0.89 – 1.00   held black, before the section below rises into view
 *
 * The last two windows are the fix for an arrival that used to land in a tenth
 * of the range — and worse, finished at the exact scroll position where the
 * sticky pane releases. Because the spring lags the scroll, the curtain was
 * still mid-fade at that point, so the streaks could be seen sliding away as
 * the next section came up. There is now a real beat of darkness in between.
 *
 * When the runway was shortened these two grew as a share of it. The flight is
 * the repetitive part and takes the cut; the ending is the payoff and would go
 * straight back to feeling abrupt if it were scaled down in proportion.
 */
const FLIGHT_END = 0.72;
const CURTAIN_SPAN = 0.17;

/**
 * Spring constants for the scroll follower.
 *
 * Scroll position is a step function — a wheel notch is ~100px delivered in one
 * event — so driving the warp straight off it makes the flight advance in
 * visible jerks. The animation follows a spring toward the scroll instead of
 * tracking it exactly.
 *
 * Damping ratio here is 17.2 / (2 * sqrt(170)) = 0.66, which overshoots by
 * about 6% and settles in under half a second. That overshoot is the whole
 * point: at a ratio near 1 the spring is smooth but inert, and the motion just
 * reads as lag. The small carry past the target is what feels elastic.
 */
const SPRING_STIFFNESS = 170;
const SPRING_DAMPING = 17.2;

/** Fixed integration step. Anything larger and the spring can go unstable. */
const SPRING_STEP = 1 / 120;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * The hero line, set as a label and an answer.
 *
 * "What's missing," is a hairline Archivo, small and held open by tracking —
 * it reads as a caption to the thing underneath rather than as half a sentence.
 * "I make." is Anton, several times the size and close-set. Face, weight,
 * size, case and colour all break at once across the comma, which is what
 * makes the second clause land as a reply instead of a continuation.
 *
 * This departs from Horizon, which specifies Marcellus for display.
 */
const HERO_LEAD: CSSProperties = {
  /* Its own line. Sharing one with the accent meant the two competed for the
     same width, which capped how large the accent could go and wrapped on
     anything under ~430px. Stacked, each is free to size for itself. */
  display: "block",
  fontFamily: "var(--font-archivo), system-ui, sans-serif",
  fontWeight: 200,
  /* The floor is what a phone gets: vw sizing bottoms out around 5px at
     375px wide, and the label had been sitting at the 12px minimum. */
  fontSize: "clamp(0.95rem, 1.4vw, 1.25rem)",
  letterSpacing: "0.44em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
  /* The label never breaks. Split across lines its tracking makes it read as
     two loose fragments rather than one label. */
  whiteSpace: "nowrap",
  /* Tracking leaves a gap after the final letter, and centring counts that gap
     as part of the line — so the label sits half of it left of true centre
     against the word below. The indent puts it back. */
  textIndent: "0.44em",
  marginBottom: "var(--space-6)",
};

const HERO_ACCENT: CSSProperties = {
  display: "block",
  /* Anton. An ultra-condensed display face packs the most letterform into a
     given width, which is why it can be set larger here than any of the
     alternatives were and still clear the viewport at 375px. */
  fontFamily: "var(--font-anton), system-ui, sans-serif",
  fontWeight: 400,
  /* Likewise: 13.5vw is only 51px on a 375px screen, so the floor decides,
     and at 54px the word was using barely half the width available to it. */
  fontSize: "clamp(5.25rem, 13.5vw, 12rem)",
  letterSpacing: "-0.015em",
  lineHeight: 1,
};

/** The cue borrows the label's voice, so the small type on the page agrees. */
const HERO_CUE: CSSProperties = {
  fontFamily: "var(--font-archivo), system-ui, sans-serif",
  fontWeight: 400,
  letterSpacing: "0.3em",
};

export function HeroWarp() {
  const runwayRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const curtainRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);

  const drivers = useRef<SceneDrivers>({ reveal: 0, warp: 0 });

  useEffect(() => {
    const runway = runwayRef.current;
    const stage = stageRef.current;
    const copy = copyRef.current;
    const curtain = curtainRef.current;
    const cue = cueRef.current;
    if (!runway || !stage || !copy || !curtain || !cue) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let start: number | null = null;
    let last: number | null = null;
    let warpValue = 0;
    let warpVelocity = 0;
    let skipped = reduce;

    if (reduce) {
      // Reduced motion opens on the finished scene — no ignition, no build-up.
      drivers.current.reveal = 1;
      stage.dataset.hero = "skipped";
    }

    /* Any interaction during the load snaps to the formed hero. The user is
       never held inside a sequence they cannot leave. */
    const skip = () => {
      if (skipped) return;
      skipped = true;
      start = performance.now() - REVEAL_MS;
      stage.dataset.hero = "skipped";
      teardownSkip();
    };

    const onKey = (e: KeyboardEvent) => {
      if (["Escape", "Enter", " ", "ArrowDown", "PageDown"].includes(e.key)) skip();
    };

    const skipEvents: Array<[string, EventListener]> = [
      ["wheel", skip],
      ["touchstart", skip],
      ["pointerdown", skip],
      ["keydown", onKey as EventListener],
    ];

    function teardownSkip() {
      for (const [name, handler] of skipEvents) {
        window.removeEventListener(name, handler);
      }
    }

    if (!reduce) {
      for (const [name, handler] of skipEvents) {
        window.addEventListener(name, handler, { passive: true });
      }
    }

    const skipTimer = window.setTimeout(teardownSkip, REVEAL_MS);

    function frame(now: number) {
      if (start === null) start = reduce ? now - REVEAL_MS : now;
      if (last === null) last = now;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      /* --- Load ---------------------------------------------------------- */
      drivers.current.reveal = clamp01((now - start) / REVEAL_MS);

      /* --- Scroll-linked warp --------------------------------------------
         Travel is measured against the pane's own height, not innerHeight. The
         pane is sized in svh and those two disagree wherever a mobile browser
         hides or shows its toolbars, which would put the end of the runway at
         the wrong scroll position on exactly the devices that can least afford
         a seam. */
      const rect = runway!.getBoundingClientRect();
      const distance = Math.max(rect.height - stage!.offsetHeight, 1);
      const scrolled = clamp01(-rect.top / distance);
      const target = clamp01((scrolled - DEAD_ZONE) / (1 - DEAD_ZONE));

      if (reduce) {
        /* No spring under reduced motion: follow the scroll exactly, so the
           only movement on screen is the one the user is making themselves. */
        warpValue = target;
        warpVelocity = 0;
      } else {
        /* Substepped so the spring behaves identically at 60Hz, 120Hz, or after
           a stall — integrating a stiff spring on a raw frame delta is how these
           end up oscillating on one machine and crawling on another. */
        let remaining = dt;
        while (remaining > 0) {
          const step = Math.min(remaining, SPRING_STEP);
          const accel =
            (target - warpValue) * SPRING_STIFFNESS - warpVelocity * SPRING_DAMPING;
          warpVelocity += accel * step;
          warpValue += warpVelocity * step;
          remaining -= step;
        }
        /* Bound the overshoot. Emitted separately below, because the scene
           raises warp to fractional powers and a negative base is NaN. */
        if (warpValue < -0.1) {
          warpValue = -0.1;
          warpVelocity = 0;
        } else if (warpValue > 1.1) {
          warpValue = 1.1;
          warpVelocity = 0;
        }
      }

      /* One sprung scalar; each stage reads its own window of it, so the
         curtain inherits the same smoothing the flight does. */
      const progress = clamp01(warpValue);
      const warp = clamp01(progress / FLIGHT_END);
      drivers.current.warp = warp;

      /* Copy clears out early — it must never sit across the bright line, and
         it certainly must not ride the streaks. */
      copy!.style.opacity = String(1 - clamp01(warp / 0.22));
      copy!.style.transform = `translateY(${-warp * 40}px)`;

      /* The cue has done its job the moment the page moves at all — driven off
         raw scroll rather than warp, so it is gone before the dead zone ends
         instead of lingering into the flight. */
      cue!.style.opacity = String(1 - clamp01(scrolled / 0.04));

      /* The dot's own halo takes the screen from the canvas; this is the
         handover to black, and it runs on its own stretch of runway after the
         flight has finished rather than sharing its last few percent.

         The second term is a hard safety, keyed to raw scroll rather than to
         the spring. The pane stops sticking the instant `scrolled` reaches 1,
         whatever the spring is doing — and on a fast flick the spring is still
         well behind, so the curtain is only part closed at that moment and the
         lit pane slides up against the black section below it. That edge is the
         horizontal line. Forcing the curtain shut before the pane can move
         guarantees there is never a bright surface for an edge to form on. In
         ordinary scrolling the sprung value is already ahead of this ramp and
         it contributes nothing. */
      const handover = clamp01((progress - FLIGHT_END) / CURTAIN_SPAN);
      const safety = clamp01((scrolled - 0.9) / 0.1);
      curtain!.style.opacity = String(Math.max(handover, safety));

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(skipTimer);
      teardownSkip();
    };
  }, []);

  return (
    <div
      ref={runwayRef}
      style={{
        height: `${RUNWAY_VH}svh`,
        position: "relative",
        background: "var(--night-1000)",
      }}
    >
      {/* The chrome's gate. This edge is where the sticky stage releases, and
          the curtain's safety term has held the frame black since 0.9 of the
          runway, so the nav crossing it fades in on the same frame the black
          hands off to the section below. See `use-hero-gate.ts`. */}
      <div
        data-hero-end
        aria-hidden
        style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1 }}
      />
      <div
        ref={stageRef}
        style={{ position: "sticky", top: 0, height: "100svh", overflow: "hidden" }}
      >
        <NightHorizon driversRef={drivers} horizon={HORIZON} style={{ height: "100%" }}>
          {/* Copy is boxed to the height of the sky, so it can never land on
              the horizon line however the viewport is shaped. */}
          <div
            ref={copyRef}
            style={{
              height: `${HORIZON * 100}%`,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              /* Weighted below the centre of the sky box. Dead centre in three
                 quarters of empty sky read as floating; sitting lower gives the
                 line somewhere to be. Still far clear of the horizon. */
              padding: "var(--space-8) clamp(var(--space-4), 5vw, var(--space-6)) 0",
              willChange: "opacity, transform",
            }}
          >
            <h1
              className="hz-rise"
              style={
                {
                  margin: 0,
                  /* Leading is pinned here because the line box is sized by the
                     accent, which is the tallest thing on it. No max-width:
                     `ch` would resolve against this element's own font rather
                     than the faces the spans set, which is what wrapped the
                     line into four before. */
                  lineHeight: 1,
                  /* Held until the horizon has stopped moving at ~1150ms, with a
                     beat after it, then a short entrance so the wait costs
                     nothing. Landing on a travelling line was the problem. */
                  "--hz-delay": "1250ms",
                  "--hz-dur": "700ms",
                } as React.CSSProperties
              }
            >
              {/* One line, one baseline. The accent colour still comes from
                  the system's own h1 em rule, never a colour override. */}
              <span style={HERO_LEAD}>What&rsquo;s missing,</span>
              <em style={HERO_ACCENT}>I make.</em>
            </h1>
          </div>
        </NightHorizon>

        <ScrollCue ref={cueRef} />

        {/* The handover to black, so the section below rises out of the dark
            rather than out of a white flash. */}
        <div
          ref={curtainRef}
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: "var(--night-1000)",
            opacity: 0,
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}

/**
 * The entrance animation and the scroll fade have to live on different
 * elements. A CSS animation with `fill: both` holds its final keyframe above
 * any inline style, so setting `opacity` on the animated node did nothing and
 * the cue stayed lit through the whole flight. The outer node is the one the
 * loop writes to; the inner node keeps the entrance.
 */
function ScrollCue({ ref }: { ref: React.Ref<HTMLDivElement> }) {
  return (
    <div
      ref={ref}
      aria-hidden
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: "var(--space-7)",
        pointerEvents: "none",
      }}
    >
      <div
        className="hz-rise"
        style={
          {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "var(--space-4)",
            "--hz-delay": "1800ms",
            "--hz-dur": "600ms",
          } as React.CSSProperties
        }
      >
        {/* Colour is --text-muted rather than the eyebrow's default --text-faint.
            Against the near-black water behind it, faint measures 3.9:1 — under
            AA for text this small even at full strength — and the 62% opacity
            this previously carried took it to 2.2:1, which is why it could not
            be read at all. Muted at full opacity measures 7.9:1. Restraint here
            has to come from size and tracking, not from dimming. */}
        <span
          className="hz-eyebrow"
          style={{ color: "var(--text-muted)", ...HERO_CUE }}
        >
          Scroll up
        </span>
        {/* A thread of the horizon's light let down into the dark. It does not
            loop — in this system only the scene is allowed to move on its own. */}
        <span
          style={{
            display: "block",
            width: 1,
            height: 72,
            background:
              "linear-gradient(to bottom, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.09) 45%, rgba(255,255,255,0) 100%)",
          }}
        />
      </div>
    </div>
  );
}
