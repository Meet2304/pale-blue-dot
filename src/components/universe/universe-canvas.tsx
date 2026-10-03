"use client";

import { useEffect, useRef } from "react";

import {
  buildBackdrop,
  createBackdrop,
  drawDust,
  drawHaze,
  drawShootingStar,
  drawStars as drawBackStars,
  type Body,
} from "./backdrop";
import { FIRST, SKY } from "./chapters";
import { buildCosmos, createCosmos, drawCosmos } from "./cosmos";
import { EARTH_COLORS, KINDS, layout } from "./encoding";
import { fit, mulberry32, whenIdle } from "./helpers";
import { lookColors, lookOf, reachOf } from "./looks";
import { PORTRAITS, type PortraitId } from "./portraits";
import { drawBody, makeFrame } from "./render";

/**
 * One universe, one camera, driven by scroll.
 *
 *   step 0      Earth, close, with its orbits: who I am, on Earth.
 *   step 1      pull straight back: Earth shrinks to a point of light where
 *               it stands, the pale blue dot, with the deep sky beginning to
 *               show around it (cosmos.ts), soft and near.
 *   step 2      further out: the whole deep sky, the impact so far.
 *   step 2..13  the camera dives back in, to one piece of work at a time,
 *               newest first; each resolves out of the dark, its neighbours
 *               from the same year dimmed at the edges.
 *   step 7      out past the sky, until all of it is one small patch of light
 *               in the void: how much is still to do.
 *
 * Between keyframes the camera holds still for a moment (so the text beside
 * it can be read), then moves; zoom is interpolated in log space so the
 * pull-back from a planet to a pixel reads as one continuous move. Nothing
 * orbits and nothing turns: the life is in the characters.
 */

const TILT = (23.4 * Math.PI) / 180;

/* What is costly to make and the same every time: made once a visit. */
const made: {
  cosmos?: ReturnType<typeof createCosmos>;
  backdrop?: ReturnType<typeof createBackdrop>;
} = {};

/* Earth's arrival on a fresh visit: nothing while the opening speaks, then,
   as its lines fly to the hero, a single pale blue point of light that grows
   into the terminal Earth, on the same curve and in the same time, so both
   land together. It grows in log space, as the camera zooms: at first a
   point (the renderer's own for a body too small for glyphs), then glyphs
   resolving, then the orbits. The same eased curve as the opening's. */
const ARRIVE = 1500;
const FROM = 0.012;
const arrivalEase = (p: number) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);
const ORBITS = [
  { r: 1.3, inc: 0.35, node: 0.2, speed: 0.22, n: 420 },
  { r: 1.55, inc: -0.6, node: 1.2, speed: -0.14, n: 360 },
  { r: 1.85, inc: 0.9, node: 2.4, speed: 0.09, n: 300 },
];

/* The characters every body is drawn in, Earth and each piece of work
   alike, the same size whether the camera is moving or still: fine enough
   to show detail, never so small it turns to noise. In px across. */
const CELL = { wide: 4.6, narrow: 3.8 };

/* A body behind a picture of its work: its radius against the picture's
   height, and how far above the picture's top edge its centre sits, in its
   own radii. */
const BEHIND: Partial<Record<string, [number, number]>> = {
  blackhole: [0.44, 0.7],
  planet: [0.3, 0.85],
  sun: [0.3, 0.8],
  constellation: [0.36, 0.75],
  nebula: [0.36, 0.8],
};

/* A body beside a picture of its work is drawn this much larger than one
   alone, so it holds its own next to the picture. */
const BESIDE = 1.3;

/* Earth's own slow turn (rad/s); the most a flick sends it spinning at,
   and how quickly (s) a glide eases back to that turn. */
const IDLE_SPIN = 0.12;
const MAX_FLICK = 3;
const GLIDE_S = 0.45;

/* How much closer than the deep sky the pale blue dot is framed: close
   enough that the sky is a soft glow around it, not yet the whole view. */
const DOT = 2.6;

type Cam = { x: number; y: number; z: number; ax: number; ay: number };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (k: number) => k * k * (3 - 2 * k);
const smoother = (k: number) => k * k * k * (k * (k * 6 - 15) + 10);
const lerp = (a: number, b: number, e: number) => a + (b - a) * e;

export function UniverseCanvas({
  arriveRef,
  onPick,
  className,
}: {
  /** When Earth began to arrive (see ARRIVE); null while the opening plays. */
  arriveRef: { current: number | null };
  /** A body was clicked: the index of its piece of work. */
  onPick: (unit: number) => void;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const pickRef = useRef(onPick);

  useEffect(() => {
    pickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    const canvas = ref.current;
    const g = canvas?.getContext("2d");
    if (!canvas || !g) return;

    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const section = canvas.closest("[data-universe]") as HTMLElement | null;
    const rnd = mulberry32(5);
    const { placed } = layout();
    const looks = placed.map((p) => lookOf(p.id, p.kind));
    const palettes = looks.map(lookColors);
    /* Built once a visit: coming back to the universe doesn't work the
       deep sky's noise out again. */
    const cosmos = (made.cosmos ??= createCosmos());
    const backdrop = (made.backdrop ??= createBackdrop());
    /* The work's bodies, drawn offscreen (see "The work" below). */
    const work = {
      canvas: document.createElement("canvas"),
      key: "",
      at: -1e9,
    };
    const wg = work.canvas.getContext("2d");
    /* Earth, drawn offscreen too (see "Earth" below). */
    const earth = {
      canvas: document.createElement("canvas"),
      key: "",
      at: -1e9,
      /* The part of the layer last drawn on, in device pixels. */
      box: [0, 0, 0, 0] as [number, number, number, number],
    };
    const eg = earth.canvas.getContext("2d");

    let w = 0;
    let h = 0;
    let dpr = 1;
    let mono = "monospace";
    let raf = 0;
    let visible = true;
    let keys: Cam[] = [];
    /* The scroll position the camera follows: eased towards the real one,
       so the steps of a mouse wheel become one glide. */
    let sv = -1;

    const stars = Array.from({ length: 900 }, () => ({
      x: rnd(),
      y: rnd(),
      z: 0.2 + rnd() * 0.8,
      b: 0.15 + Math.pow(rnd(), 3) * 0.85,
      p: rnd() * 6,
    }));
    const orbits = ORBITS.map((o) => ({
      ...o,
      a: Array.from({ length: o.n }, () => rnd() * Math.PI * 2),
    }));
    /* The stars behind Earth: fewer and brighter than the dust above, each
       drawn as a light glyph that twinkles on its own clock. Their own seed,
       so adding them left every other random draw as it was. */
    const srnd = mulberry32(11);
    const TINTS = ["#dfe6f5", "#ffd08a", EARTH_COLORS[3]];
    const skyStars = Array.from({ length: 240 }, (_, order) => {
      const hue = srnd();
      return {
        order,
        x: srnd(),
        y: srnd(),
        z: srnd(),
        b: 0.3 + Math.pow(srnd(), 2.2) * 0.7,
        rate: 0.6 + srnd() * 1.8,
        p: srnd() * Math.PI * 2,
        tint: hue < 0.84 ? 0 : hue < 0.92 ? 1 : 2,
      };
    }).sort((a, b) => a.tint - b.tint);
    /* The stars the camera passes on its way out: shells of stars at
       scales five times apart, from just beyond the Moon to the edge of
       the deep sky. Each streams in towards the dot as the camera recedes
       and fades as it gathers, while the next shell arrives from the
       edges, so there is always something passing: the pull-back reads as
       travel, not as a fade from one picture to another. */
    const lrnd = mulberry32(17);
    const shells = Array.from({ length: 5 }, (_, level) => ({
      scale: 4 * Math.pow(5, level),
      stars: Array.from({ length: 90 }, () => ({
        x: lrnd() * 2 - 1,
        y: lrnd() * 2 - 1,
        b: 0.3 + Math.pow(lrnd(), 2) * 0.7,
        rate: 0.6 + lrnd() * 1.8,
        p: lrnd() * Math.PI * 2,
        tint: lrnd() < 0.8 ? 0 : lrnd() < 0.5 ? 1 : 2,
      })),
    }));

    let yaw = 0;
    let yawVel = IDLE_SPIN;
    let tilt = TILT;
    /* A drag turns Earth with the pointer, the point held staying under it;
       let go, it glides on at the drag's last speed (capped) and eases back
       to its own slow turn within a second, rather than spinning on. */
    let flick = 0;
    let movedAt = 0;
    const pointer = {
      x: -1e4,
      y: -1e4,
      in: false,
      down: false,
      lastX: 0,
      lastY: 0,
      moved: 0,
    };
    let hovered: string | null = null;
    let camNow: Cam = { x: 0, y: 0, z: 1, ax: 0.5, ay: 0.5 };

    /**
     * Where a piece of work's body goes: into the space its copy and
     * picture leave on screen. The page lays the copy and picture out (the
     * copy left and the picture under the body on a wide screen; stacked
     * under the body on a phone), and this measures them, so the body is
     * placed and sized for whatever the screen is: centred in the space
     * left, as large as its visible reach allows, a little smaller or
     * larger by its look.
     */
    /* Which pieces' bodies stand back behind a picture of the work: there
       the picture and the words lead, and the body is part of the setting,
       drawn quieter and without its chart marks. */
    const recede: boolean[] = [];

    const pieceFrame = (i: number, narrow: boolean): Cam => {
      const p = placed[i];
      const look = looks[i];
      const [rx, ry] = reachOf(look, KINDS[p.kind].body);
      const barBottom = narrow ? 64 : 56;
      let box = narrow
        ? { x0: 16, x1: w - 16, y0: barBottom, y1: h * 0.42 }
        : { x0: w * 0.44, x1: w - 96, y0: barBottom, y1: h - 32 };
      let mid: number | null = null;
      const chapter = section?.querySelector(`[data-piece="${i}"]`);
      const copy = chapter?.querySelector('[data-part="copy"]');
      if (chapter && copy) {
        const c = chapter.getBoundingClientRect();
        const cp = copy.getBoundingClientRect();
        const aside = chapter.querySelector<HTMLElement>('[data-part="media"]');
        const media = aside?.getBoundingClientRect();
        /* Laid out in the flow (a phone on its side), the picture sits
           beside the copy; placed (a wide screen), it is set apart. */
        const inFlow = !!aside && getComputedStyle(aside).position === "static";
        if (narrow) {
          /* The copy's top edge fades in over its first 1.2rem. */
          const top = Math.min(cp.top, media?.top ?? Infinity) - c.top + 18;
          box = {
            x0: 16,
            x1: w - 16,
            y0: barBottom,
            y1: Math.max(barBottom + 80, top),
          };
          recede[i] = !!media;
        } else {
          /* A picture beside the copy (a phone on its side) pushes the
             body further right; one under the body caps it from below. */
          const beside = inFlow;
          box = {
            x0: (beside && media ? media.right : cp.right) - c.left + 40,
            x1: w - (w < 860 ? 16 : 96),
            y0: barBottom + 8,
            y1: media && !beside ? media.top - c.top - 24 : h - 32,
          };
          if (media && !beside) mid = media.left - c.left + media.width / 2;
          recede[i] = !!media;
          if (media && !beside) {
            /* The picture leads: the body rises behind its top-right
               corner, half hidden by it, like a light behind a print. */
            /* How large each kind is against the picture, and how far above
               its top edge it sits: a black hole shows mostly its shadow and
               jet, so it can be large and low; a planet or a star shows its
               whole disc, so it is smaller and rides higher. */
            const [size, rise] = BEHIND[KINDS[p.kind].body] ?? [0.36, 0.5];
            const top = media.top - c.top;
            const room = top - barBottom - 8;
            /* Against the picture, or the screen for a small one (a logo). */
            let R = Math.min(
              Math.max(media.height, h * 0.42) * size,
              Math.min(w, h) * 0.26,
            );
            R *= (0.85 + 0.15 * Math.min(1, look.scale)) * BESIDE * (look.size ?? 1);
            /* Clear of the bar above: a body drawn larger sits lower behind
               the picture to fit, but always shows more than half of itself. */
            const lift = Math.min(rise, Math.max(0.2, room / R - ry));
            R = Math.max(40, Math.min(R, room / (lift + ry)));
            return {
              x: p.x,
              y: p.y,
              z: R / (p.r * look.scale),
              /* A piece drawn as another's body sees it from the other
                 side: behind the picture's top-left corner instead. */
              ax:
                (p.twin !== undefined
                  ? media.left - c.left + media.width * 0.07
                  : media.right - c.left - media.width * 0.07) / w,
              ay: (top - R * lift) / h,
            };
          }
        }
      }
      const bw = Math.max(40, box.x1 - box.x0);
      const bh = Math.max(40, box.y1 - box.y0);
      const fits = Math.min(bw / (2 * rx), bh / (2 * ry)) * 0.94;
      /* A star's corona reaches far past its disc: it is capped smaller,
         so it glows beside the copy rather than filling the screen. */
      const cap = KINDS[p.kind].body === "sun" ? 0.19 : 0.25;
      let R = Math.max(30, Math.min(fits, Math.min(w, h) * cap));
      R *= (0.8 + 0.2 * Math.min(1, look.scale)) * (recede[i] ? BESIDE : 1);
      /* Drawn larger, but never past the space left for it. */
      R = Math.max(R, Math.min(R * (look.size ?? 1), fits));
      const half = rx * R;
      const cx =
        mid === null
          ? p.twin !== undefined
            ? /* Seen from another side: off to the left of the space. */
              Math.max(box.x0 + half, box.x0 + (box.x1 - box.x0) * 0.3)
            : (box.x0 + box.x1) / 2
          : Math.max(box.x0 + half, Math.min(box.x1 - half, mid));
      return {
        x: p.x,
        y: p.y,
        z: R / (p.r * look.scale),
        ax: cx / w,
        ay: (box.y0 + box.y1) / 2 / h,
      };
    };

    const resize = () => {
      ({ w, h, dpr } = fit(canvas, 2));
      const cs = getComputedStyle(canvas);
      mono = cs.getPropertyValue("--font-mono").trim() || "monospace";
      measure();
    };

    const measure = () => {
      /* Held upright and small, the copy stacks under the canvas (the page's
         CSS uses the same test). */
      const narrow = w < 860 && w <= h * (4 / 3);
      const m = Math.min(w, h);

      /* The deep sky is framed to fill the screen: about 1000 Earth radii
         across on a wide screen, with Earth where it stood in the hero, so
         the pull-back is straight out from it. On a phone the copy stacks
         at the bottom, so Earth keeps to the top part of the screen, and a
         wider slice of sky is shown, since the screen is so narrow. */
      const sky: Cam = {
        x: 0,
        y: 0,
        z: narrow ? Math.max(w / 560, h / 1300) : Math.max(w / 1000, h / 620),
        ax: narrow ? 0.5 : 0.64,
        ay: narrow ? 0.3 : 0.52,
      };
      keys = [
        {
          x: 0,
          y: 0,
          z: m * (narrow ? 0.3 : 0.34),
          ax: narrow ? 0.5 : 0.63,
          ay: narrow ? 0.32 : 0.5,
        },
        /* The pale blue dot: Earth a point of light, where it stood in the
           hero, the sky soft around it. */
        {
          ...sky,
          z: sky.z * DOT,
          ax: narrow ? 0.5 : 0.62,
          ay: narrow ? 0.3 : 0.48,
        },
        sky,
        /* Each piece of work, framed in the space its copy leaves. */
        ...placed.map((_, i) => pieceFrame(i, narrow)),
        /* The void: the whole sky, a patch of light about 280 px across. */
        {
          ...sky,
          z: sky.z * 0.1,
          ax: narrow ? 0.5 : 0.66,
          ay: narrow ? 0.28 : 0.5,
        },
      ];
    };

    /**
     * The camera at a scroll position. Zoom runs in log space. The camera
     * does not pan in a straight line through the world, which, with the
     * zoom changing under it, swings what is in view out and back; instead
     * the subject of the move (whatever the closer of the two framings is
     * looking at) travels in a straight line across the screen, and the
     * camera is solved around it. From Earth to the deep sky the subject is
     * Earth, so the dot stays where it is and the sky opens around it.
     */
    const camAt = (s: number): Cam => {
      const i = Math.max(0, Math.min(keys.length - 1, Math.floor(s)));
      const j = Math.min(keys.length - 1, i + 1);
      const a = keys[i];
      const b = keys[j];
      /* Each move runs over nearly the whole way from one chapter to the
         next, with no dead stretch at either end to read as a stall. */
      const e =
        i === 0
          ? smoother(clamp01((s - 0.02) / 0.9))
          : smooth(clamp01((s - i - 0.04) / 0.92));
      let z = Math.exp(lerp(Math.log(a.z), Math.log(b.z), e));
      const ax = lerp(a.ax, b.ax, e);
      const ay = lerp(a.ay, b.ay, e);
      /* Between two framings at the same zoom (one piece of work to the
         next) the camera pans; across a long way, from one year to the
         next, it rises a little mid-way and comes back down, so the move
         reads as a hop, not a slide. */
      if (Math.abs(Math.log(a.z / b.z)) < 0.1) {
        const span = Math.hypot(b.x - a.x, b.y - a.y) * a.z;
        const hop = Math.max(0, Math.log(span / (w * 0.8)));
        z *= Math.exp(-hop * 0.8 * Math.sin(Math.PI * e));
        return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), z, ax, ay };
      }
      const p = a.z >= b.z ? a : b;
      const sx = lerp(a.ax * w + (p.x - a.x) * a.z, b.ax * w + (p.x - b.x) * b.z, e);
      const sy = lerp(a.ay * h + (p.y - a.y) * a.z, b.ay * h + (p.y - b.y) * b.z, e);
      return { x: p.x - (sx - ax * w) / z, y: p.y - (sy - ay * h) / z, z, ax, ay };
    };

    const hexA = (hex: string, a: number) => {
      const v = parseInt(hex.slice(1), 16);
      return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`;
    };

    let last = performance.now();
    /* Coming back from another page (the opening has played), the page
       arrives in a transition: for that half second the canvas draws only
       now and then, leaving the frames to the arrival. */
    const settleUntil = arriveRef.current === 0 ? last + 550 : 0;
    let drawnAt = -1e9;
    /* The deep sky and its dust are worked out in the page's quiet moments,
       so they are ready long before anyone scrolls to them without taking
       time from a frame. */
    const build = (budget: number) => {
      const start = performance.now();
      const done =
        buildBackdrop(backdrop, budget) &&
        buildCosmos(cosmos, budget - (performance.now() - start), performance.now());
      if (!done) cancelBuild = whenIdle(build);
    };
    let cancelBuild = whenIdle(build);
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (now < settleUntil && now - drawnAt < 80) return;
      drawnAt = now;
      if (!visible) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;

      let target = 0;
      if (section) {
        const top = section.getBoundingClientRect().top;
        /* In chapters, each as tall as the stage (100svh, which on a phone
           can differ from the window's height). */
        target = Math.min(keys.length - 1, Math.max(0, -top / h));
      }
      /* Locked to the page's own scroll, so the sky and the words never
         drift apart. The page's scroll is smooth already: the browser
         animates a wheel's notches, and the stops glide (universe.tsx). */
      sv = target;
      const s = sv;
      /* Scrolled out before the quiet moments have finished the deep sky,
         the frames finish it. */
      if (s > 0.2 && !cosmos.readyAt) {
        buildBackdrop(backdrop, 2);
        buildCosmos(cosmos, 4, now);
      }

      const cam = camAt(s);
      const arrivedAt = arriveRef.current;
      const arrived =
        calm || arrivedAt === 0
          ? 1
          : arrivedAt === null
            ? 0
            : Math.min(1, (now - arrivedAt) / ARRIVE);
      const earthScale =
        arrived >= 1 ? 1 : Math.exp(Math.log(FROM) * (1 - arrivalEase(arrived)));
      camNow = cam;
      const toX = (x: number) => cam.ax * w + (x - cam.x) * cam.z;
      const toY = (y: number) => cam.ay * h + (y - cam.y) * cam.z;
      /* Held upright and small, the copy stacks under the canvas (the page's
         CSS uses the same test). */
      const narrow = w < 860 && w <= h * (4 / 3);

      /* How far out the camera is, against the deep sky's framing: the sky
         fades in over the last stretch of the pull-back and out as the
         camera dives to a year, where the year's work resolves instead. The
         work never shows on the way out from Earth. */
      const out = Math.log(cam.z / keys[SKY].z);
      const skyA = 1 - smooth(clamp01((out - Math.log(1.3)) / Math.log(11)));
      /* Further out than the sky's framing, towards the void. */
      const far = cam.z / keys[SKY].z;
      const voidA = clamp01(-out / Math.log(6));
      const workA = s <= SKY ? 0 : smooth(clamp01((out - Math.log(2.5)) / Math.log(4)));

      if (!pointer.down && !calm) {
        yawVel += (IDLE_SPIN - yawVel) * (1 - Math.exp(-dt / GLIDE_S));
        yaw += yawVel * dt;
      }

      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.globalAlpha = 1;
      g.fillStyle = "#000";
      g.fillRect(0, 0, w, h);

      /* Stars, drifting a little with the camera for depth. The deep sky
         brings its own, so these step back when it is in view. */
      const zoomOut = Math.min(
        1,
        Math.max(0, (Math.log(keys[0].z) - Math.log(cam.z)) / 2),
      );
      g.fillStyle = "#dfe6f5";
      for (const st of stars) {
        const px = (((st.x * w - cam.x * cam.z * 0.004 * st.z) % w) + w) % w;
        const py = (((st.y * h - cam.y * cam.z * 0.004 * st.z) % h) + h) % h;
        g.globalAlpha =
          st.b *
          (0.4 + zoomOut * 0.4) *
          (1 - 0.6 * skyA) *
          (1 - 0.9 * voidA) *
          (calm ? 1 : 0.7 + 0.3 * Math.sin(t + st.p));
        g.fillRect(px, py, 1.1, 1.1);
      }
      g.globalAlpha = 1;

      /* The stars behind Earth. They belong to the close-up: as the camera
         pulls back they gather in towards the dot and fade, and the deep
         sky's own take over. A star's glyph follows its brightness (· then
         + then *), and none is drawn over Earth's disc. */
      const near = Math.max(0, 1 - s);
      if (near > 0.01) {
        const ex0 = toX(0);
        const ey0 = toY(0);
        const pull = cam.z / keys[0].z;
        const clear = cam.z * earthScale * 1.12;
        const count = Math.min(skyStars.length, Math.round((w * h) / 9000));
        g.font = `${narrow ? 10 : 11}px ${mono}`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        let tint = -1;
        for (const st of skyStars) {
          /* A density, not a fixed number, so a phone gets a sparser sky.
             The draws are random, so any first few are an even scatter. */
          if (st.order >= count) continue;
          const k = Math.pow(pull, 0.08 + 0.12 * st.z);
          const px = ex0 + (st.x * w - ex0) * k;
          const py = ey0 + (st.y * h - ey0) * k;
          if (Math.hypot(px - ex0, py - ey0) < clear) continue;
          const tw = calm ? 0.8 : (0.5 + 0.5 * Math.sin(t * st.rate + st.p)) ** 2;
          const level = st.b * (0.3 + 0.7 * tw);
          if (st.tint !== tint) {
            tint = st.tint;
            g.fillStyle = TINTS[tint];
          }
          g.globalAlpha = Math.min(1, level * near * 1.1);
          g.fillText(level > 0.72 ? "*" : level > 0.42 ? "+" : "·", px, py);
        }
        g.globalAlpha = 1;
      }

      /* The shells of stars passing on the way out, and on the way back out
         from the last year. Only while travelling: the hero has its own
         sky, the deep sky its own stars, and the years stay clear. */
      const lastMove = keys.length - 2;
      const travel =
        (1 - skyA) *
        (s < SKY + 0.5
          ? smooth(clamp01(s / 0.12))
          : smooth(clamp01((s - lastMove - 0.22) / 0.2)));
      if (travel > 0.01) {
        const ex0 = toX(0);
        const ey0 = toY(0);
        const half = Math.max(w, h) * 0.5;
        g.font = `${narrow ? 10 : 11}px ${mono}`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        for (const shell of shells) {
          /* How wide the shell is on screen, against the screen: it shows
             from well beyond the edges down to a small cluster. */
          const spread = (shell.scale * cam.z) / half;
          const la =
            smooth(clamp01((Math.log(spread) + 2.3) / 1.4)) *
            (1 - smooth(clamp01((Math.log(spread) - 0.4) / 1.2)));
          if (la < 0.01) continue;
          for (const st of shell.stars) {
            const px = ex0 + st.x * shell.scale * cam.z;
            const py = ey0 + st.y * shell.scale * cam.z;
            if (px < -8 || py < -8 || px > w + 8 || py > h + 8) continue;
            const tw = calm ? 0.8 : 0.6 + 0.4 * Math.sin(t * st.rate + st.p);
            const level = st.b * tw;
            g.fillStyle = TINTS[st.tint];
            g.globalAlpha = Math.min(1, level * la * travel);
            g.fillText(level > 0.7 ? "+" : "·", px, py);
          }
        }
        g.globalAlpha = 1;
      }

      /* The deep sky. */
      if (skyA > 0.01) {
        drawCosmos(g, cosmos, {
          cam,
          w,
          h,
          t,
          dt,
          now,
          alpha: skyA,
          calm,
          narrow,
          mono,
          dpr,
          far,
          pointer,
        });
      }

      const ex = toX(0);
      const ey = toY(0);
      const earthR = cam.z * earthScale;

      /* The work: one body per piece, each with its own look, drawn as the
         bar's panels draw them, once the camera is close enough. The piece
         on screen is lit fully; its neighbours from the same year show at
         the edges, dimmed, so it is clear there is more around it. */
      const sizeOf = (i: number) => {
        const p = placed[i];
        const look = looks[i];
        const portrait = PORTRAITS[KINDS[p.kind].body as PortraitId];
        const R = p.r * cam.z * look.scale;
        const extent = look.planet
          ? look.planet.ring || look.planet.moons > 1
            ? portrait.extent
            : 1.9
          : look.hole
            ? look.hole.disk + 0.1
            : portrait.extent;
        return { p, look, portrait, R, extent, px: toX(p.x), py: toY(p.y) };
      };

      /* Which body is under the pointer: cheap, so every frame. */
      hovered = null;
      let hoverD = 1e9;
      for (let i = 0; workA > 0.5 && pointer.in && i < placed.length; i++) {
        if (placed[i].twin !== undefined) continue;
        const { p, R, px, py } = sizeOf(i);
        const d = Math.hypot(pointer.x - px, pointer.y - py);
        if (d < Math.max(14, R * 1.3) && d < hoverD) {
          hoverD = d;
          hovered = p.id;
        }
      }

      /* The sky behind the work: haze in the colours of the body on
         screen, stars (lensed round a black hole), now and then a shooting
         star (backdrop.ts). The nebulosity in characters goes with the
         bodies, below. */
      const focusI = Math.max(0, Math.min(placed.length - 1, Math.round(s) - FIRST));
      const nearOf = (i: number) => 1 - Math.min(1, Math.abs(s - (i + FIRST)));
      /* How near the camera is to a body: its own chapter, or any piece
         drawn as it (`twin`). */
      const nearBody = (i: number) =>
        placed.reduce(
          (m, q, j) => (j === i || q.twin === i ? Math.max(m, nearOf(j)) : m),
          0,
        );
      const back = {
        w,
        h,
        t,
        now,
        calm,
        driftX: cam.x * cam.z,
        driftY: cam.y * cam.z,
        alpha: workA,
        mono,
        narrow,
      };
      if (workA > 0.01) {
        const bodies: Body[] = [];
        for (let i = 0; i < placed.length; i++) {
          if (placed[i].twin !== undefined) continue;
          const near = nearBody(i);
          if (near <= 0) continue;
          const { look, R, px, py } = sizeOf(i);
          bodies.push({
            x: px,
            y: py,
            R,
            a: smooth(near) * (recede[i] ? 0.94 : 1),
            colors: palettes[i],
            lens: look.hole ? R * 0.95 : 0,
          });
        }
        drawHaze(g, bodies, back);
        drawBackStars(g, backdrop, bodies, back);
        drawShootingStar(g, backdrop, back);
      }

      /* Drawing them is the costly part: thousands of glyphs each. They
         turn slowly, so they are drawn offscreen and redrawn when anything
         moves (the camera, the scroll, the pointer over a body)
         or every 80 ms; the frames between copy them. */
      const workKey = `${w}x${h}@${dpr} ${cam.x.toFixed(3)},${cam.y.toFixed(3)},${cam.z.toFixed(3)} ${s.toFixed(3)} ${hovered ?? ""}${hovered ? ` ${Math.round(pointer.x)},${Math.round(pointer.y)}` : ""}`;
      if (
        wg &&
        workA > 0.01 &&
        (workKey !== work.key ||
          /* A body being pointed at answers every frame. */
          hovered !== null ||
          now - work.at > 80)
      ) {
        const pw = Math.round(w * dpr);
        const ph = Math.round(h * dpr);
        if (work.canvas.width !== pw || work.canvas.height !== ph) {
          work.canvas.width = pw;
          work.canvas.height = ph;
        }
        wg.setTransform(1, 0, 0, 1, 0, 0);
        wg.clearRect(0, 0, pw, ph);
        wg.setTransform(dpr, 0, 0, dpr, 0, 0);
        work.key = workKey;
        work.at = now;
        drawDust(wg, backdrop, palettes[focusI], {
          ...back,
          alpha: workA * (0.35 + 0.65 * smooth(nearOf(focusI))),
        });
        for (let i = 0; i < placed.length; i++) {
          if (placed[i].twin !== undefined) continue;
          const { p, look, portrait, R, extent, px, py } = sizeOf(i);
          const pal = palettes[i];
          const reach = Math.max(R * extent, 14);
          if (
            px + reach < -20 ||
            px - reach > w + 20 ||
            py + reach < -20 ||
            py - reach > h + 20
          )
            continue;
          const near = nearBody(i);
          const a = workA * (0.3 + 0.7 * smooth(near)) * (recede[i] ? 0.94 : 1);
          /* At a distance, a body is only a point of light; it resolves into
             its full form as the camera closes in. */
          const bodyA = narrow
            ? smooth(Math.min(1, Math.max(0, (R - 14) / 26)))
            : smooth(Math.min(1, Math.max(0, (R - 26) / 44)));
          const pointA = 1 - bodyA;
          if (pointA > 0.01) {
            const tw = calm ? 1 : 0.86 + 0.14 * Math.sin(t * 1.3 + p.seed * 40);
            const pa = pointA * a * tw;
            const glowR = 5 + p.impact * 4.5;
            const grad = wg.createRadialGradient(px, py, 0, px, py, glowR);
            grad.addColorStop(0, hexA(pal[3], 0.75 * pa));
            grad.addColorStop(0.35, hexA(pal[2], 0.28 * pa));
            grad.addColorStop(1, hexA(pal[2], 0));
            wg.fillStyle = grad;
            wg.fillRect(px - glowR, py - glowR, glowR * 2, glowR * 2);
            wg.fillStyle = hexA(pal[4], pa);
            wg.beginPath();
            wg.arc(px, py, 0.9 + p.impact * 0.45, 0, Math.PI * 2);
            wg.fill();
          }
          if (bodyA <= 0.01) continue;
          /* A neighbour is only a soft glow in its colours, at the edge of
             the screen; it sharpens into its characters as the camera
             arrives. That keeps the screen for the piece being read, and
             drawing only the one body in full is what keeps it smooth. */
          const sharp = smooth(clamp01((near - 0.25) / 0.5));
          if (sharp < 1) {
            const gr = R * 1.6;
            const glow = wg.createRadialGradient(px, py, 0, px, py, gr);
            glow.addColorStop(0, hexA(pal[2], 0.2 * a * bodyA * (1 - sharp)));
            glow.addColorStop(1, hexA(pal[2], 0));
            wg.fillStyle = glow;
            wg.fillRect(px - gr, py - gr, gr * 2, gr * 2);
          }
          if (sharp <= 0.01) continue;
          /* Every body is set in the same characters as Earth, moving or
             still (CELL). */
          const cw = narrow ? CELL.narrow : CELL.wide;
          const ch = cw * 1.72;
          const scan =
            hovered === p.id && R > 40
              ? { x: (pointer.x - px) / R, y: (pointer.y - py) / R, r: 0.42 }
              : null;
          const frame = makeFrame(t, t * 0.3, 0.35, scan, cw / R, ch / R, p.seed, calm);
          frame.look = look;
          const light = {
            cx: px,
            cy: py,
            R,
            colors: pal,
            alpha: a * bodyA * sharp,
            t,
            calm,
            look,
          };
          portrait.under?.(wg, light);
          drawBody(wg, KINDS[p.kind].body, {
            w,
            h,
            cx: px,
            cy: py,
            R,
            cw,
            ch,
            frame,
            colors: pal,
            alpha: a * bodyA * sharp,
            font: `${ch * 0.92}px ${mono}`,
            fn: portrait.fn,
            extent,
            light: portrait.mapLight ?? false,
          });
          portrait.over?.(wg, light);

          /* The piece on screen is framed like a find on a star chart:
             corner ticks round the body's reach, and its name. */
          if (near > 0.4 && hovered !== p.id && !recede[i]) {
            const [rx, ry] = reachOf(look, KINDS[p.kind].body);
            const fa = smooth((near - 0.4) / 0.6) * a;
            const bx = rx * R * 1.04;
            const by = ry * R * 1.08;
            const tick = Math.min(14, R * 0.12 + 6);
            wg.strokeStyle = hexA(pal[3], 0.5 * fa);
            wg.lineWidth = 1;
            wg.beginPath();
            for (const [sx, sy] of [
              [-1, -1],
              [1, -1],
              [1, 1],
              [-1, 1],
            ]) {
              const x = px + sx * bx;
              const y = py + sy * by;
              wg.moveTo(x, y);
              wg.lineTo(x - sx * tick, y);
              wg.moveTo(x, y);
              wg.lineTo(x, y - sy * tick);
            }
            wg.stroke();
            wg.font = `11px ${mono}`;
            wg.textAlign = "left";
            wg.textBaseline = "bottom";
            wg.fillStyle = hexA(pal[3], 0.85 * fa);
            wg.fillText(
              `${KINDS[p.kind].mark} ${KINDS[p.kind].bodyName}`,
              px - bx,
              py - by - 6,
            );
          }

          /* The one being pointed at gets a reticle: four ticks, no circle. */
          if (hovered === p.id) {
            const rr = Math.max(10, R * 1.3);
            wg.strokeStyle = hexA(pal[3], 0.8 * a);
            wg.lineWidth = 1;
            wg.beginPath();
            for (let q = 0; q < 4; q++) {
              const ang = (q * Math.PI) / 2 + Math.PI / 4;
              wg.moveTo(px + Math.cos(ang) * rr, py + Math.sin(ang) * rr);
              wg.lineTo(px + Math.cos(ang) * (rr + 8), py + Math.sin(ang) * (rr + 8));
            }
            wg.stroke();
          }
        }
      }
      if (workA > 0.01) {
        g.save();
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.drawImage(work.canvas, 0, 0);
        g.restore();
      }

      /* Earth. */
      const glyphAlpha = Math.min(1, Math.max(0, (earthR - 18) / 40));
      if (glyphAlpha > 0) {
        const ecw = narrow ? CELL.narrow : CELL.wide;
        const ech = ecw * 1.72;
        const earthScan =
          pointer.in &&
          Math.hypot(pointer.x - ex, pointer.y - ey) < earthR * 1.1 &&
          earthR > 80
            ? { x: (pointer.x - ex) / earthR, y: (pointer.y - ey) / earthR, r: 0.42 }
            : null;
        /* Densely set, Earth is many thousands of characters, and it turns
           slowly: while nothing else about it changes (the camera, the
           scanner, a drag), it is redrawn twenty times a second and the
           frames between show the last drawing. */
        const alphaE = glyphAlpha * (1 - workA);
        const earthKey = `${w}x${h}@${dpr} ${ex.toFixed(1)},${ey.toFixed(1)},${earthR.toFixed(2)} ${alphaE.toFixed(3)} ${
          earthScan ? `${earthScan.x.toFixed(3)},${earthScan.y.toFixed(3)}` : ""
        }`;
        if (eg) {
          const pw = Math.round(w * dpr);
          const ph = Math.round(h * dpr);
          /* Only the box round Earth is cleared and copied, never the whole
             screen: copying a full-screen layer every frame was most of
             what the hero cost. */
          const reach = earthR * 1.12 + ech;
          const box: [number, number, number, number] = [
            Math.max(0, Math.floor((ex - reach) * dpr)),
            Math.max(0, Math.floor((ey - reach) * dpr)),
            Math.min(pw, Math.ceil((ex + reach) * dpr)),
            Math.min(ph, Math.ceil((ey + reach) * dpr)),
          ];
          if (pointer.down || earthKey !== earth.key || now - earth.at > 50) {
            if (earth.canvas.width !== pw || earth.canvas.height !== ph) {
              earth.canvas.width = pw;
              earth.canvas.height = ph;
            }
            eg.setTransform(1, 0, 0, 1, 0, 0);
            const [a0, b0, a1, b1] = earth.box;
            eg.clearRect(a0, b0, a1 - a0, b1 - b0);
            eg.clearRect(box[0], box[1], box[2] - box[0], box[3] - box[1]);
            earth.box = box;
            eg.setTransform(dpr, 0, 0, dpr, 0, 0);
            drawBody(eg, "earth", {
              w,
              h,
              cx: ex,
              cy: ey,
              R: earthR,
              cw: ecw,
              ch: ech,
              frame: makeFrame(
                t,
                yaw,
                tilt,
                earthScan,
                ecw / earthR,
                ech / earthR,
                0,
                calm,
              ),
              colors: EARTH_COLORS,
              alpha: alphaE,
              font: `${ech * 0.92}px ${mono}`,
            });
            earth.key = earthKey;
            earth.at = now;
          }
          const [x0, y0, x1, y1] = earth.box;
          if (x1 > x0 && y1 > y0) {
            g.save();
            g.setTransform(1, 0, 0, 1, 0, 0);
            g.drawImage(
              earth.canvas,
              x0,
              y0,
              x1 - x0,
              y1 - y0,
              x0,
              y0,
              x1 - x0,
              y1 - y0,
            );
            g.restore();
          }
        }
      }

      /* Earth's orbits, while it is big enough to have them. */
      const orbitAlpha = Math.min(1, Math.max(0, (earthR - 40) / 120));
      if (orbitAlpha > 0) {
        g.lineWidth = 1;
        for (const o of orbits) {
          const ci = Math.cos(o.inc);
          const si = Math.sin(o.inc);
          const cn = Math.cos(o.node);
          const sn = Math.sin(o.node);
          g.beginPath();
          for (let j = 0; j < o.a.length; j++) {
            if (!calm) o.a[j] += o.speed * dt * (0.8 + (j % 7) * 0.05);
            const proj = (a: number) => {
              const x0 = Math.cos(a) * o.r;
              const z0 = Math.sin(a) * o.r;
              const y1 = -z0 * si;
              const z1 = z0 * ci;
              return [
                ex + (x0 * cn - y1 * sn) * earthR,
                ey + (x0 * sn + y1 * cn) * earthR,
                z1,
              ] as const;
            };
            const [x1, y1, z1] = proj(o.a[j]);
            if (z1 < 0 && Math.hypot(x1 - ex, y1 - ey) < earthR) continue;
            const [x0, y0] = proj(o.a[j] - 0.05 * Math.sign(o.speed));
            g.moveTo(x0, y0);
            g.lineTo(x1, y1);
          }
          g.strokeStyle = hexA(EARTH_COLORS[3], 0.35 * orbitAlpha * (1 - workA));
          g.stroke();
        }
      }

      /* Past the point where characters can draw it, Earth is only light:
         the pale blue dot. Out in the deep sky it is named, and a slow ping
         goes out from it now and then, so the eye can always find it. */
      if (glyphAlpha < 1) {
        const a = (1 - glyphAlpha) * (1 - workA);
        const r = Math.max(2, Math.min(earthR, 14));
        const glow = Math.min(r * 5, 26);
        const grad = g.createRadialGradient(ex, ey, 0, ex, ey, glow);
        grad.addColorStop(0, hexA(EARTH_COLORS[4], 0.95 * a));
        grad.addColorStop(0.12, hexA(EARTH_COLORS[2], 0.5 * a));
        grad.addColorStop(1, hexA(EARTH_COLORS[2], 0));
        g.fillStyle = grad;
        g.beginPath();
        g.arc(ex, ey, glow, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = hexA(EARTH_COLORS[4], a);
        g.beginPath();
        g.arc(ex, ey, Math.min(r * 0.5, 2.6), 0, Math.PI * 2);
        g.fill();
        /* Named in the sky; in the void, the patch of light speaks for it. */
        const named = skyA * (1 - smooth(clamp01((0.6 - far) / 0.4)));
        if (skyA > 0.02) {
          if (!calm) {
            const k = (t % 4.8) / 2.4;
            if (k < 1) {
              g.strokeStyle = hexA(EARTH_COLORS[3], 0.4 * (1 - k) ** 2 * skyA * a);
              g.lineWidth = 1;
              g.beginPath();
              g.arc(ex, ey, 5 + smooth(k) * 26, 0, Math.PI * 2);
              g.stroke();
            }
          }
          g.font = `10px ${mono}`;
          g.textAlign = "left";
          g.textBaseline = "middle";
          g.fillStyle = hexA(EARTH_COLORS[3], 0.8 * named * a);
          if (named > 0.01) g.fillText("you are here", ex + 12, ey + 1);
        }
      }

      /* The copy and the picture fall in. Each piece of the copy is pulled
         toward the hole, nearest first, along an inward spiral that turns
         the way the disk does; on the way it is stretched toward the hole
         and squeezed across, shrinks, and fades as it reaches the shadow.
         The chapter would otherwise fade its copy as it leaves the screen;
         while the hole pulls, the copy stays lit until it is swallowed. */
      canvas.style.cursor = hovered ? "pointer" : "";
    };

    resize();
    raf = requestAnimationFrame(frame);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    /* The copy and pictures reflow as fonts and images arrive, and with
       the screen: each time, the bodies are placed again. */
    let remeasure = 0;
    const mo = new ResizeObserver(() => {
      cancelAnimationFrame(remeasure);
      remeasure = requestAnimationFrame(measure);
    });
    section
      ?.querySelectorAll("[data-piece] [data-part]")
      .forEach((el) => mo.observe(el));
    const io = new IntersectionObserver((entries) => {
      /* Several changes can arrive at once: the last is the current one. */
      visible = entries[entries.length - 1].isIntersecting;
    });
    io.observe(canvas);

    const onMove = (e: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      const x = e.clientX - box.left;
      const y = e.clientY - box.top;
      if (pointer.down) {
        /* Turning by the pointer's travel over Earth's radius, against
           the sense of yaw (which carries the surface the other way), keeps
           the point held under the pointer. */
        const reach = Math.max(60, camNow.z);
        const turn = -(x - pointer.lastX) / reach;
        yaw += turn;
        const ms = Math.max(8, e.timeStamp - movedAt);
        movedAt = e.timeStamp;
        const speed = Math.max(-MAX_FLICK, Math.min(MAX_FLICK, turn / (ms / 1000)));
        flick = flick * 0.6 + speed * 0.4;
        tilt = Math.max(-0.2, Math.min(0.9, tilt - (y - pointer.lastY) / reach));
        pointer.moved += Math.abs(x - pointer.lastX) + Math.abs(y - pointer.lastY);
      }
      pointer.lastX = x;
      pointer.lastY = y;
      pointer.x = x;
      pointer.y = y;
      pointer.in = e.target === canvas;
    };
    const onDown = (e: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      pointer.lastX = e.clientX - box.left;
      pointer.lastY = e.clientY - box.top;
      pointer.moved = 0;
      flick = 0;
      movedAt = e.timeStamp;
      /* Dragging turns the Earth only while it is big enough to hold. */
      pointer.down =
        camNow.z > 60 &&
        Math.hypot(pointer.lastX - camNow.ax * w, pointer.lastY - camNow.ay * h) <
          camNow.z * 1.3;
    };
    const onUp = (e: PointerEvent) => {
      /* Held still before letting go, it doesn't glide at all. */
      if (pointer.down) yawVel = e.timeStamp - movedAt > 90 ? 0 : flick;
      pointer.down = false;
    };
    const onClick = () => {
      if (pointer.moved > 6 || !hovered) return;
      const i = placed.findIndex((q) => q.id === hovered);
      if (i >= 0) pickRef.current(i);
    };
    const onLeave = () => {
      pointer.in = false;
      pointer.down = false;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    canvas.addEventListener("click", onClick);
    document.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      cancelBuild();
      ro.disconnect();
      mo.disconnect();
      cancelAnimationFrame(remeasure);
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("click", onClick);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [arriveRef]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={className}
      style={{ touchAction: "pan-y" }}
    />
  );
}
