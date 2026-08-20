"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/**
 * Horizon's signature scene, extended for this site.
 *
 * The design system ships `NightHorizon` as a self-contained hero canvas. This
 * port keeps its intent — twinkling stars, an electric glow on the horizon
 * reflected in water, subtle pointer reactivity — and rebuilds the sea, which
 * in the source is a stack of horizontal light bands. Bands do not read as
 * water. Two things make them read as water instead:
 *
 *   Perspective. Everything below the horizon is placed by a distance
 *   coordinate `z`, not by row index, so wave detail compresses toward the
 *   horizon and opens into broad swells near the viewer.
 *
 *   A glitter path — the scatter of specular flecks below a light source. Kept
 *   deliberately sparse: it should suggest a path of light, not sparkle.
 *
 * Restraint is the governing rule here. Every effect is tuned to sit just above
 * the threshold of notice, because they all run at once and the sky, not the
 * water, is the subject. Where two techniques did the same job, one was cut.
 *
 * Two scalars drive everything, read from a ref inside the render loop:
 *
 *   `reveal` (0..1) — the load. The horizon hairline IS the loader: it draws
 *   outward from centre at mid-screen, then descends into place while the sky,
 *   stars and water resolve around it. Nothing hands off to anything.
 *
 *   `warp` (0..1) — scroll-linked. The pale blue dot holds its position while
 *   the field drifts past it and the nearest stars draw into short trails; the
 *   horizon sinks out of frame and the dot's halo opens until it takes the
 *   screen.
 */

export type SceneDrivers = {
  /** 0 = black screen, 1 = fully formed hero. */
  reveal: number;
  /** 0 = hero at rest, 1 = arrived inside the pale blue dot. */
  warp: number;
};

/** The night sky is the subject, so it takes roughly three quarters of the
    frame and the sea sits in the bottom quarter. */
export const HORIZON = 0.76;

type NightHorizonProps = {
  horizon?: number;
  glowColor?: string;
  starCount?: number;
  interactive?: boolean;
  intensity?: number;
  driversRef: React.RefObject<SceneDrivers>;
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
};

type Star = {
  x: number;
  y: number;
  r: number;
  phase: number;
  /** Twinkle rate, rad/s. */
  speed: number;
  /** How hard this star twinkles, 0..1. Most barely do; a few really flash. */
  amp: number;
  depth: number;
  fade: number;
  born: number;
  cold: boolean;
};

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOutSoft = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutCalm = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** Cheap deterministic hash for the glitter field. */
const hash = (n: number) => {
  const s = Math.sin(n) * 43758.5453;
  return s - Math.floor(s);
};

/** Where the loader line rests before it descends. */
const LOADER_Y = 0.5;

/**
 * Where the light sits along the horizon.
 *
 * A single centred gaussian is what made the glow read as artificial: real
 * light on a horizon is never symmetrical about the middle of your window.
 * These are three lobes of different widths and weights, placed off axis — one
 * dominant pool left of centre, a smaller answer to its right, and a faint
 * third further out. Irregular, but authored rather than random, so it lands
 * the same way every time.
 *
 * One profile feeds the horizon line, the bloom, the reflection and the glitter
 * path. That shared source is what keeps them consistent: the brightest water
 * is under the brightest sky because both read the same function.
 */
const LOBES = [
  { c: 0.46, w: 0.19, a: 1.0 },
  { c: 0.63, w: 0.12, a: 0.34 },
  { c: 0.3, w: 0.1, a: 0.22 },
];

/** The dominant lobe — the azimuth everything else is anchored to. */
const GLOW_CENTER = LOBES[0].c;

function glowProfile(u: number): number {
  let v = 0;
  for (let i = 0; i < LOBES.length; i++) {
    const l = LOBES[i];
    const d = (u - l.c) / l.w;
    v += l.a * Math.exp(-d * d);
  }
  /* A faint floor so the horizon stays a continuous hairline to both edges,
     low enough that the edges are barely there. */
  return Math.min(1, v + 0.025);
}

export function NightHorizon({
  horizon = HORIZON,
  glowColor = "#0d7bff",
  starCount = 78,
  interactive = true,
  intensity = 1,
  driversRef,
  children,
  style,
  className,
}: NightHorizonProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointer = useRef({ x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, active: false, wet: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let lowPower = false;
    let stars: Star[] = [];
    let strip: HTMLCanvasElement | null = null;
    let raf = 0;
    let lastHorizonVar = -1;

    /* Per-frame allocation caches. The sky gradient has nine stops and the
       horizon line seventeen, and both are rebuilt on every frame even though
       their inputs only change while the horizon is actually moving — during
       the load and the warp. Keyed on the rounded input so a resting scene
       rebuilds nothing at all. */
    let skyGrad: CanvasGradient | null = null;
    let skyGradKey = -1;
    let lineGrad: CanvasGradient | null = null;
    let lineGradKey = -1;

    /* Glitter seeds, resolved once per resize instead of two Math.sin calls per
       row per frame. */
    let glitterSeeds = new Float32Array(0);
    const t0 = performance.now();

    /* The pale blue dot: not one of the stars, but its own object — larger,
       bluer, and twinkling on a slower clock than anything around it. That
       difference in tempo is what separates it from the field, and it is the
       thing the warp flies into. */
    const dot = { x: 0, y: 0, r: 2.1, phase: 0 };

    const hex = (c: string) => {
      const m = c.replace("#", "");
      return [
        parseInt(m.slice(0, 2), 16),
        parseInt(m.slice(2, 4), 16),
        parseInt(m.slice(4, 6), 16),
      ];
    };
    const rgbArr = hex(glowColor);
    const rgb = rgbArr.join(",");
    /* The accent lifted toward white — electric rather than navy, for the
       brightest part of the wash where it meets the horizon. */
    const rgbLift = rgbArr.map((c) => Math.round(c + (255 - c) * 0.28)).join(",");

    /**
     * The glow's colour at a point along the horizon: ultramarine at the
     * shoulders, lifting toward a pale blue-white at the peak of a lobe.
     *
     * `whiteness` caps how far it is allowed to burn out. At 1 the peak goes to
     * near-white, which is what made the horizon dominate the frame — the eye
     * goes to the brightest thing on screen and there was nothing brighter than
     * that line. Both callers stay well below it now.
     */
    function glowStop(v: number, whiteness: number, alphaScale: number): string {
      const k = Math.pow(v, 2.4) * whiteness;
      const r = Math.round(rgbArr[0] + (232 - rgbArr[0]) * k);
      const g = Math.round(rgbArr[1] + (242 - rgbArr[1]) * k);
      const b = Math.round(rgbArr[2] + (255 - rgbArr[2]) * k);
      return `rgba(${r},${g},${b},${(v * alphaScale).toFixed(3)})`;
    }

    /* The reflection strip is the horizon's own luminance profile, sampled
       across the width — so the water mirrors the sky it is under rather than a
       symmetrical stand-in for it. */
    function buildStrip() {
      const s = document.createElement("canvas");
      s.width = Math.max(2, Math.floor(w));
      s.height = 1;
      const g = s.getContext("2d");
      if (!g) return;
      const grad = g.createLinearGradient(0, 0, s.width, 0);
      const steps = 32;
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        grad.addColorStop(u, glowStop(glowProfile(u), 0.44, 0.68));
      }
      g.fillStyle = grad;
      g.fillRect(0, 0, s.width, 1);
      strip = s;
    }

    function resize() {
      const r = host!.getBoundingClientRect();
      w = r.width;
      h = r.height;
      lowPower = w < 760 || (window.navigator.hardwareConcurrency ?? 8) <= 4;

      /* This scene is fill-rate bound — a full-screen gradient, a stack of
         reflection rows and a few hundred small fills, every frame. Phones
         report device ratios of 3 and 4, and honouring those means shading
         nine to sixteen times the pixels for detail nobody can resolve at
         arm-s length. Capping at 1.5 is the single largest thing that keeps a
         handset at its refresh rate. */
      const dpr = Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2);
      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const hy = h * horizon;

      /* Fewer stars on a small screen. The field is scaled to the frame, not
         to the device, so the same count in a quarter of the area reads as
         clutter as well as costing more per pixel than it is worth. */
      const count = w < 640 ? Math.round(starCount * 0.62) : starCount;

      /* Stars fill the sky rather than crowding its top — a mild exponent keeps
         them spread down toward the horizon, where `fade` thins them out as the
         glow washes them away. */
      stars = new Array(count).fill(0).map(() => {
        const rel = Math.pow(Math.random(), 1.12);
        const y = rel * hy * 0.98;
        return {
          x: Math.random() * w,
          y,
          r:
            Math.random() < 0.06
              ? 1.2 + Math.random() * 0.7
              : 0.3 + Math.random() * 0.6,
          phase: Math.random() * Math.PI * 2,
          speed: 0.5 + Math.random() * 1.9,
          amp: 0.1 + Math.pow(Math.random(), 2.2) * 0.55,
          depth: 0.3 + Math.random() * 0.7,
          fade: 1 - Math.pow(rel, 3),
          born: Math.random(),
          cold: Math.random() < 0.14,
        };
      });

      /* Upper right, clear of the centred headline, far enough off axis that the
         streaks read as a turn rather than a straight-on zoom. */
      dot.x = w * 0.68;
      dot.y = hy * 0.2;
      dot.r = Math.max(2.6, Math.min(w, h) * 0.0036);
      dot.phase = 1.1;

      /* Both cached gradients hold absolute coordinates and were built under
         the previous dpr transform, so neither survives a resize. */
      skyGrad = null;
      skyGradKey = -1;
      lineGrad = null;
      lineGradKey = -1;

      /* Two picks per row, indexed i * 2 + g. Sized to the full height so it
         stays valid however far the horizon travels. */
      glitterSeeds = new Float32Array(Math.max(Math.ceil(h), 1) * 2);
      for (let i = 0; i * 2 + 1 < glitterSeeds.length; i++) {
        glitterSeeds[i * 2] = hash(i * 7.13);
        glitterSeeds[i * 2 + 1] = hash(i * 7.13 + 91.7);
      }

      buildStrip();
    }

    /* Sky and water gradient, keyed to wherever the horizon currently is. Stops
       are forced monotonic: the horizon travels from mid-screen to its resting
       place and then off the bottom of the frame during the warp. */
    function paintSky(hy: number, alpha: number) {
      const f = hy / h;

      const key = Math.round(f * 2000);
      if (skyGrad && key === skyGradKey) {
        ctx!.globalAlpha = alpha;
        ctx!.fillStyle = skyGrad;
        ctx!.fillRect(0, 0, w, h);
        ctx!.globalAlpha = 1;
        return;
      }

      const grad = ctx!.createLinearGradient(0, 0, 0, h);
      let prev = 0;
      const add = (offset: number, colour: string) => {
        const o = Math.min(1, Math.max(prev, offset));
        grad.addColorStop(o, colour);
        prev = o;
      };
      /* Tonal only — this gradient carries no light.
         A vertical gradient painted across the full width is uniform
         horizontally by construction: every row is one flat colour edge to
         edge. So any brightness put here becomes a band that cannot taper, and
         no amount of dimming fixes that. The horizon's light comes entirely
         from the lobed bloom and the profiled line, both of which vary along
         the width. All this does is set the darkness the light sits in. */
      add(0, "#000000");
      add(0.3, "#040507");
      add(f - 0.24, "#080b0f");
      add(f - 0.06, "#0d1319");
      add(f - 0.011, "#141d29");
      add(f, "#1a2836");
      /* Below the line this gradient is allowed to carry colour again — but as
         the water's own body, not as light. Sea near the horizon holds the
         sky's blue and loses it with distance from it. Uniform across the width
         is correct here: water at a given distance really is one tone, and the
         reflection painted over the top supplies all the horizontal variation. */
      add(f + 0.013, "#0d2848");
      add(f + 0.14, "#061426");
      add(1, "#02070f");

      skyGrad = grad;
      skyGradKey = key;

      ctx!.globalAlpha = alpha;
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, w, h);
      ctx!.globalAlpha = 1;
    }

    /**
     * The atmosphere above the light.
     *
     * A tall, soft wash rising off the horizon into the night, clipped to the
     * sky so none of it spills into the water — the reflection handles what
     * happens below the line. Same three lobes, so it is brightest where the
     * light is rather than being an even band, and its stops are spaced to ease
     * out rather than ramp linearly.
     *
     * This is separate from the tight bloom below it: that one is the light
     * source, this is the air it is shining through, and they need very
     * different falloffs.
     */
    function paintSkyGlow(hy: number, span: number, alpha: number) {
      if (alpha <= 0.001 || span <= 0 || hy <= 0) return;

      ctx!.save();
      ctx!.beginPath();
      ctx!.rect(0, 0, w, Math.max(Math.min(hy, h), 0));
      ctx!.clip();

      for (let i = 0; i < LOBES.length; i++) {
        const l = LOBES[i];
        const reach = clamp01((span / 2 - Math.abs(l.c - 0.5)) / 0.12);
        if (reach <= 0.001) continue;

        ctx!.save();
        ctx!.translate(w * l.c, hy);
        ctx!.scale(Math.max(w * l.w * 2.6, 1), Math.max(h * (0.3 + 0.18 * l.a), 1));
        const g = ctx!.createRadialGradient(0, 0, 0, 0, 0, 1);
        g.addColorStop(0, `rgba(${rgbLift},0.5)`);
        g.addColorStop(0.22, `rgba(${rgb},0.27)`);
        g.addColorStop(0.5, `rgba(${rgb},0.12)`);
        g.addColorStop(0.78, `rgba(${rgb},0.038)`);
        g.addColorStop(1, `rgba(${rgb},0)`);
        ctx!.globalAlpha = alpha * l.a * reach;
        ctx!.fillStyle = g;
        ctx!.fillRect(-1, -1, 2, 2);
        ctx!.restore();
      }

      ctx!.restore();
      ctx!.globalAlpha = 1;
    }

    /**
     * Bloom belongs to the horizon and nothing else in this system.
     *
     * One pool per lobe, each a different width and height, so the light along
     * the horizon is uneven the way real light is. Scaled radial gradients
     * rather than ctx.filter, which is still not safe to lean on.
     *
     * `span` is how much of the line has been drawn, as a fraction of the full
     * width. Each lobe only lights once the line has actually reached it, so
     * during the load the glow arrives in stages instead of all at once.
     */
    function paintBloom(hy: number, span: number, alpha: number) {
      if (alpha <= 0.001 || span <= 0) return;

      for (let i = 0; i < LOBES.length; i++) {
        const l = LOBES[i];
        const reach = clamp01((span / 2 - Math.abs(l.c - 0.5)) / 0.12);
        if (reach <= 0.001) continue;

        ctx!.save();
        ctx!.translate(w * l.c, hy);
        ctx!.scale(Math.max(w * l.w * 2.1, 1), Math.max(h * (0.055 + 0.05 * l.a), 1));
        const bloom = ctx!.createRadialGradient(0, 0, 0, 0, 0, 1);
        bloom.addColorStop(0, `rgba(${rgb},0.25)`);
        bloom.addColorStop(0.4, `rgba(${rgb},0.072)`);
        bloom.addColorStop(1, `rgba(${rgb},0)`);
        ctx!.globalAlpha = alpha * l.a * reach;
        ctx!.fillStyle = bloom;
        ctx!.fillRect(-1, -1, 2, 2);
        ctx!.restore();
      }
      ctx!.globalAlpha = 1;
    }

    /**
     * The sea.
     *
     * Rows are addressed by a perspective distance `z = 1/(d + e)` rather than
     * by pixel offset, so wave frequency compresses toward the horizon exactly
     * as it does on real water. `e` is deliberately not tiny: shrink it and the
     * frequency near the horizon passes one cycle per row and the top of the
     * water aliases into moiré.
     */
    function paintSea(hy: number, t: number, alpha: number, px: number) {
      if (!strip || alpha <= 0.001 || hy >= h) return;

      const rows = Math.ceil(h - hy);
      const step = lowPower ? 3 : 2;

      const p = pointer.current;
      /* `wet` eases the cursor's presence in and out so nothing ever snaps on. */
      p.wet += ((p.active ? 1 : 0) - p.wet) * 0.05;

      const originX = w * GLOW_CENTER;

      ctx!.globalCompositeOperation = "screen";

      /* The reflection itself is never displaced by the cursor. Sliding whole
         rows moved the entire sea with the mouse, which read as a filter being
         dragged rather than as water. The waves belong to the water; the cursor
         only changes how the light answers. */
      for (let i = 0; i < rows; i += step) {
        const d = i / rows;
        const z = 1 / (d + 0.16);

        /* Two waves, not three. Amplitude grows with nearness; at the horizon
           the surface is glass. */
        const amp = 1.4 + d * d * 34;
        const swell = reduce
          ? 0
          : Math.sin(z * 2.1 - t * 0.95) * amp * 0.66 +
            Math.sin(z * 4.6 + t * 0.66) * amp * 0.34;

        /* Light collects on crests and drains from troughs. The depth ramp
           matters: perspective squeezes this wave to a few pixels near the
           horizon, so at full strength it would read as moire. Far water stays
           glassy and the banding opens up as it comes toward you. */
        const crestAmt = 0.1 + 0.38 * d;
        const crest = 1 - crestAmt * (0.5 - 0.5 * Math.sin(z * 5.1 - t * 1.25));
        /* A gentler falloff carries the light path further toward the viewer.
           At 2.7 it died within the first third of the water, which left most
           of the sea as unlit flat dark — the reason it stopped reading as a
           surface at all. */
        const falloff = Math.pow(1 - d, 2) * 0.92 + 0.06;
        const stretch = 1 + d * 0.4;
        const dw = w * stretch;

        /* Scaled about the light’s azimuth rather than the screen centre: the
           reflection has to stay under the glow as the water widens. */
        ctx!.globalAlpha = Math.min(1, falloff * crest * alpha);
        ctx!.drawImage(strip, originX * (1 - stretch) + swell, hy + i, dw, step + 0.4);
      }

      /* --- Sheen -------------------------------------------------------------
         The whole of the cursor interaction: one soft pool of light the water
         lifts toward the pointer, lagging well behind it. Flattened, because a
         circle on a plane seen near edge-on is an ellipse.

         It answers the cursor's x from anywhere on the page. With the sky
         taking three quarters of the frame, an effect that only responded to a
         cursor already over the water would almost never be found. Directly
         over the water it doubles in strength and tracks depth as well. */
      /* --- The cursor's whole effect on the water ---------------------------
         The path of light pivots toward you.
         On real water the glitter path always runs from the light source to
         wherever the observer is standing — move along the shore and the path
         swings to follow. So the far end stays pinned to the glow's azimuth and
         the near end leans toward the cursor.
         Nothing is added to the scene and nothing brightens: it is the light
         that is already there, pointing somewhere slightly different. It also
         needs no notion of the cursor being over the water at all, which is why
         there is no threshold to cross and nothing to switch off. */
      const lean = (px - 0.5) * w * 0.14 * p.wet;

      /* --- Glitter path -----------------------------------------------------
         A suggestion of the light path rather than a field of sparks: fewer
         flecks, a much higher threshold, a narrower spread. */
      if (!reduce) {
        const picks = lowPower ? 1 : 2;

        for (let i = 0; i < rows; i += step) {
          const d = i / rows;
          const z = 1 / (d + 0.16);
          const falloff = Math.pow(1 - d, 1.7);
          if (falloff < 0.03) continue;

          const spread = w * (0.04 + d * 0.36);

          for (let g = 0; g < picks; g++) {
            const seed = glitterSeeds[i * 2 + g];
            /* Each fleck winks on its own clock, tied to the wave under it. */
            const wink = Math.sin(t * (1.5 + seed * 3.4) + seed * 37 + z * 2.6);
            if (wink < 0.64) continue;

            const gx = originX + (seed - 0.5) * 2 * spread + lean * d;
            const bright = (wink - 0.64) / 0.36;
            const len = 1.2 + d * 7;
            ctx!.globalAlpha = Math.min(0.42, bright * falloff * alpha * 0.38);
            ctx!.fillStyle =
              seed > 0.82 ? "rgba(214,234,255,1)" : "rgba(240,248,255,1)";
            ctx!.fillRect(gx - len / 2, hy + i, len, Math.max(1, step * 0.6));
          }
        }
      }

      ctx!.globalAlpha = 1;
      ctx!.globalCompositeOperation = "source-over";
    }

    function draw(now: number) {
      const t = (now - t0) / 1000;
      const { reveal, warp } = driversRef.current;

      const p = pointer.current;
      p.x += (p.tx - p.x) * 0.045;
      p.y += (p.ty - p.y) * 0.045;
      const px = interactive ? p.x : 0.5;
      const py = interactive ? p.y : 0.5;

      ctx!.clearRect(0, 0, w, h);

      const lineDraw = clamp01(reveal / 0.45);
      /* The descent finishes at 0.85 of the reveal rather than riding it all
         the way to the end. Everything else — stars, water — can keep arriving
         afterwards without anyone noticing, but the horizon moving is the one
         thing the copy cannot enter on top of, so it has to be over first and
         the sequence has to leave room for it to be. */
      const settle = clamp01((reveal - 0.35) / 0.5);
      const starsIn = clamp01((reveal - 0.5) / 0.5);
      const waterIn = clamp01((reveal - 0.62) / 0.38);

      const warpEase = easeInOutCalm(warp);
      const restY = LOADER_Y + (horizon - LOADER_Y) * easeInOutCalm(settle);
      const hy = h * restY + h * warpEase * 0.55;

      const ox = (px - 0.5) * 10;
      const oy = (py - 0.5) * 6;

      /* The dot holds its position. Pulling it to centre mid-flight read as the
         scene rearranging itself around the camera; leaving it where it is means
         the sky moves past you and the one fixed thing is where you are going. */
      const vpx = dot.x + ox * 0.5;
      const vpy = dot.y + oy * 0.5;

      /* --- Sky --------------------------------------------------------------- */
      paintSky(hy, settle * intensity);
      paintSkyGlow(
        hy,
        easeOutSoft(lineDraw),
        settle * intensity * (1 - clamp01(warp * 1.6)),
      );
      paintBloom(
        hy,
        easeOutSoft(lineDraw),
        settle * intensity * (1 - clamp01(warp * 1.6)),
      );

      /* Hand the horizon's position to CSS so the masked noise can sit on the
         glow. Only when it has actually moved — this triggers a style recalc. */
      const hvar = Math.round((hy / h) * 400) / 4;
      if (hvar !== lastHorizonVar) {
        lastHorizonVar = hvar;
        host!.style.setProperty("--hz-horizon", `${hvar}%`);
      }

      /* --- Stars --------------------------------------------------------------
         Restrained on purpose. Long white lines everywhere is the stock
         hyperspace cliche; here the field drifts past and only the nearest stars
         draw out into short trails, so the motion reads without shouting. */
      const push = Math.pow(warp, 2) * 4.2;
      const streak = Math.pow(warp, 3);

      /* The sky is clipped to the sky. Pushing stars outward from the dot sends
         plenty of them below the horizon, and a star sitting on the sea is
         nonsense — it is above the waterline or it is not there. The clip
         catches trails that cross the line; the soft fade below stops stars
         from simply vanishing at it. */
      ctx!.save();
      ctx!.beginPath();
      ctx!.rect(0, 0, w, Math.max(Math.min(hy, h), 0));
      ctx!.clip();

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const appear = clamp01((starsIn - s.born * 0.5) / 0.5);
        if (appear <= 0) continue;

        /* One swing per star, and most of them barely swing at all. The
           second scintillation harmonic was what made the sky look restless. */
        const base = Math.pow(Math.abs(Math.sin(t * s.speed + s.phase)), 1.7);
        const tw = reduce ? 0.72 : 1 - s.amp + s.amp * base;

        const bx = s.x + ox * s.depth;
        const by = s.y + oy * s.depth;

        const dx = bx - vpx;
        const dy = by - vpy;
        const scale = 1 + push * s.depth;
        const cx = vpx + dx * scale;
        const cy = vpy + dy * scale;

        /* Thin out into the haze on approach to the horizon rather than
           hitting the clip edge at full brightness. */
        const skyFade = clamp01((hy - cy) / (h * 0.05));
        if (skyFade <= 0.001) continue;

        ctx!.globalAlpha = Math.min(
          1,
          tw * s.fade * skyFade * 0.62 * intensity * appear,
        );
        const colour = s.cold ? "rgba(198,205,255,1)" : "#ffffff";

        if (streak > 0.002) {
          /* Trail length scales with depth as well as distance, so the far field
             stays as points and only the near stars smear. */
          const len = streak * Math.hypot(dx, dy) * 0.5 * s.depth;
          const dist = Math.hypot(cx - vpx, cy - vpy) || 1;
          const ux = (cx - vpx) / dist;
          const uy = (cy - vpy) / dist;
          ctx!.strokeStyle = colour;
          ctx!.lineWidth = Math.max(s.r * 1.5, 0.6);
          ctx!.lineCap = "round";
          ctx!.beginPath();
          ctx!.moveTo(cx - ux * len, cy - uy * len);
          ctx!.lineTo(cx, cy);
          ctx!.stroke();
        } else {
          ctx!.fillStyle = colour;
          ctx!.beginPath();
          ctx!.arc(cx, cy, s.r, 0, Math.PI * 2);
          ctx!.fill();
        }
      }
      ctx!.restore();
      ctx!.globalAlpha = 1;

      /* --- Sea ---------------------------------------------------------------- */
      paintSea(hy, t, waterIn * (1 - clamp01(warp * 2.2)) * intensity, px);

      /* --- The line ------------------------------------------------------------
         Loader and horizon are the same 1px rule. Its width is the progress bar;
         its resting place is the horizon. It is never removed and never
         replaced — it simply stops being a loader. */
      /* While it is a loader the line is the only thing on screen and carries
         the whole moment, so it stays bright. Once the scene has formed it is
         just the horizon, and it recedes to make room for the sky. */
      const lineAlpha = (1 - clamp01(warp * 1.8)) * intensity * (1 - 0.62 * settle);
      if (lineAlpha > 0.001 && reveal > 0) {
        const halfWidth = Math.max((w / 2) * easeOutSoft(lineDraw), 0.9);
        const left = w / 2 - halfWidth;

        /* Seventeen stops, each a pow and a template string. Only the width
           changes, and only while the loader is drawing — so this is built once
           and then reused for the entire life of the resting scene. */
        const key = Math.round(halfWidth);
        if (!lineGrad || key !== lineGradKey) {
          const built = ctx!.createLinearGradient(left, 0, w / 2 + halfWidth, 0);
          /* Sampled from the same profile as the bloom and the reflection, so
             the line is brightest where the light actually is. The asymmetry
             only emerges as the loader reaches far enough out to reveal it. */
          for (let k = 0; k <= 16; k++) {
            const q = k / 16;
            const u = (left + q * halfWidth * 2) / w;
            built.addColorStop(q, glowStop(glowProfile(u), 0.3, 0.6));
          }
          lineGrad = built;
          lineGradKey = key;
        }
        const grad = lineGrad;
        ctx!.globalAlpha = lineAlpha;
        ctx!.fillStyle = grad;
        ctx!.fillRect(w / 2 - halfWidth, hy - 0.5, halfWidth * 2, 1);
        ctx!.globalAlpha = 1;
      }

      /* --- The pale blue dot ---------------------------------------------------- */
      {
        const appear = clamp01(starsIn * 1.4);

        /* The dot always twinkles, and it does it on its own terms.
           Two frequencies rather than one, so it never settles into an obvious
           metronome, and both are slower than anything in the star field — the
           stars scintillate, this breathes. That difference in tempo is what
           keeps it legible as the one thing in the sky worth going to, now that
           it is no longer picked out by being the only steady point. */
        const pulse = 0.5 + 0.5 * Math.sin(t * 1.05 + dot.phase);
        const shimmer = 0.5 + 0.5 * Math.sin(t * 2.6 + dot.phase * 1.9);
        const tw = reduce ? 1 : 0.62 + 0.28 * pulse + 0.1 * shimmer;

        /* The halo breathes with it. At this size a pure alpha change is barely
           readable; letting the glow swell a little is what the eye actually
           catches. */
        const breathe = 1 + 0.2 * ((tw - 0.62) / 0.38);

        /* Approach, not a zoom: the halo opens steadily while the hard core
           dissolves into it. A white disc scaling to fill the frame is the part
           that looked cheap — arriving should be light swallowing the view, with
           no edge to it anywhere.

           Opening is given its own window rather than a raw power of warp. At
           `pow(warp, 2.2)` the light did essentially nothing until the last
           fifth of the flight and then rushed, which is what made the arrival
           feel unprepared. It now starts just under halfway and builds. */
        const reach = Math.hypot(w, h);
        const arrive = clamp01((warp - 0.45) / 0.55);
        /* Only the resting halo breathes — the warp's opening term is left
           alone, so the arrival is not pulsing while it swallows the frame. */
        const halo =
          Math.max(dot.r * 5, 9) * breathe + Math.pow(arrive, 1.7) * reach * 1.25;
        const coreAlpha = 1 - clamp01((warp - 0.25) / 0.4);
        const r = dot.r * breathe * (1 + warp * 2.5);

        const g = ctx!.createRadialGradient(vpx, vpy, 0, vpx, vpy, halo);
        g.addColorStop(0, "rgba(255,255,255,1)");
        g.addColorStop(0.18, `rgba(232,244,255,${0.8 + 0.2 * warp})`);
        g.addColorStop(0.46, `rgba(188,220,255,${0.28 + 0.72 * warp})`);
        g.addColorStop(0.74, `rgba(121,187,255,${0.06 + 0.72 * warp})`);
        g.addColorStop(1, "rgba(13,123,255,0)");
        ctx!.globalAlpha = Math.max(tw * appear * intensity, easeOutSoft(warp));
        ctx!.fillStyle = g;
        ctx!.beginPath();
        ctx!.arc(vpx, vpy, halo, 0, Math.PI * 2);
        ctx!.fill();

        if (coreAlpha > 0.002) {
          ctx!.globalAlpha = coreAlpha * Math.max(tw * appear * intensity, 0);
          ctx!.fillStyle = "#eaf4ff";
          ctx!.beginPath();
          ctx!.arc(vpx, vpy, r, 0, Math.PI * 2);
          ctx!.fill();
        }
        ctx!.globalAlpha = 1;
      }

      raf = requestAnimationFrame(draw);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();
    raf = requestAnimationFrame(draw);

    const move = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      const q = pointer.current;
      q.tx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      q.ty = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      q.active = true;
    };
    const leave = () => {
      pointer.current.active = false;
      pointer.current.tx = 0.5;
      pointer.current.ty = 0.5;
    };

    if (interactive) {
      window.addEventListener("pointermove", move, { passive: true });
      host.addEventListener("pointerleave", leave);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", leave);
    };
  }, [horizon, glowColor, starCount, interactive, intensity, driversRef]);

  return (
    <div
      ref={hostRef}
      className={className}
      style={{
        position: "relative",
        overflow: "hidden",
        background: "var(--night-1000)",
        isolation: "isolate",
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, display: "block" }}
      />
      {/* Two grains: a faint one across the whole frame, and a stronger one
          masked onto the glow and fading up into the sky, so the light reads as
          frosted rather than as a clean gradient. */}
      <div className="hz-noise" style={{ opacity: 0.04 }} />
      <div className="hz-noise-glow">
        <div />
      </div>
      <div style={{ position: "relative", height: "100%" }}>{children}</div>
    </div>
  );
}
