import { mulberry32 } from "./helpers";
import { fbm3 } from "./noise";

/**
 * The sky behind each piece of work, so the screens are not bare black:
 *
 *   - stars, in three depths that drift a little against each other as the
 *     camera moves, each twinkling on its own clock; around a black hole
 *     they are pushed outward, the nearest drawn out a little, so its
 *     gravity shows in the sky itself (kept to these few stars: cheap);
 *   - a soft haze in the colours of the body on screen, breathing slowly;
 *   - faint nebulosity drawn in characters, drifting with the camera;
 *   - now and then, a shooting star.
 *
 * All of it is quiet: it sits under the copy and the body and never
 * competes with them. Under reduced motion it holds still and no star
 * shoots.
 */

type Star = {
  x: number;
  y: number;
  depth: number;
  b: number;
  rate: number;
  p: number;
  warm: boolean;
};

type Shot = { at: number; x: number; y: number; dx: number; dy: number; len: number };

export type Backdrop = {
  stars: Star[];
  /** A patch of noise for the nebulosity, read with mirrored edges. */
  dust: Float32Array;
  shot: Shot | null;
  nextShot: number;
  rnd: () => number;
};

const DUST = 128;
/* How far each depth of stars drifts against the camera. */
const DEPTHS = [0.006, 0.014, 0.028];

export function createBackdrop(): Backdrop {
  const rnd = mulberry32(61);
  const stars = Array.from({ length: 520 }, () => ({
    x: rnd(),
    y: rnd(),
    depth: Math.floor(rnd() * 3),
    b: 0.25 + Math.pow(rnd(), 2.4) * 0.75,
    rate: 0.5 + rnd() * 2,
    p: rnd() * Math.PI * 2,
    warm: rnd() < 0.14,
  }));
  const dust = new Float32Array(DUST * DUST);
  for (let y = 0; y < DUST; y++)
    for (let x = 0; x < DUST; x++)
      dust[y * DUST + x] = fbm3(x * 0.056, y * 0.056, 2.2, 3);
  return { stars, dust, shot: null, nextShot: 0, rnd };
}

/* A body the backdrop answers to: where it is, how big, how lit, and, for
   a black hole, how strongly it bends light. */
export type Body = {
  x: number;
  y: number;
  R: number;
  a: number;
  colors: string[];
  lens: number;
};

type Opts = {
  w: number;
  h: number;
  t: number;
  now: number;
  calm: boolean;
  /** The camera's drift, in screen px, that the stars answer to. */
  driftX: number;
  driftY: number;
  alpha: number;
  mono: string;
  narrow: boolean;
};

const rgba = (hex: string, a: number) => {
  const v = parseInt(hex.slice(1), 16);
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`;
};

/** The haze: a few soft clouds of the body's colours around it. */
export function drawHaze(g: CanvasRenderingContext2D, bodies: Body[], o: Opts) {
  for (const b of bodies) {
    if (b.a < 0.02) continue;
    const breath = o.calm ? 1 : 0.85 + 0.15 * Math.sin(o.t * 0.3 + b.x * 0.01);
    for (const [dx, dy, r, k, a] of [
      [-1.9, 0.7, 3.2, 1, 0.1],
      [1.6, -1.3, 2.6, 2, 0.07],
      [0.4, 1.9, 2.4, 0, 0.09],
    ] as const) {
      const x = b.x + dx * b.R;
      const y = b.y + dy * b.R;
      const rr = r * b.R;
      const grad = g.createRadialGradient(x, y, 0, x, y, rr);
      grad.addColorStop(0, rgba(b.colors[k], a * b.a * breath * o.alpha));
      grad.addColorStop(1, rgba(b.colors[k], 0));
      g.fillStyle = grad;
      g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
  }
}

/** The stars, lensed round any black hole on screen. */
export function drawStars(
  g: CanvasRenderingContext2D,
  bd: Backdrop,
  bodies: Body[],
  o: Opts,
) {
  const count = Math.min(bd.stars.length, Math.round((o.w * o.h) / 4200));
  const holes = bodies.filter((b) => b.lens > 0 && b.a > 0.05);
  g.font = `${o.narrow ? 10 : 11}px ${o.mono}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.lineWidth = 1;
  for (let i = 0; i < count; i++) {
    const st = bd.stars[i];
    const k = DEPTHS[st.depth];
    let x = (((st.x * o.w - o.driftX * k) % o.w) + o.w) % o.w;
    let y = (((st.y * o.h - o.driftY * k) % o.h) + o.h) % o.h;
    const tw = o.calm ? 0.75 : (0.5 + 0.5 * Math.sin(o.t * st.rate + st.p)) ** 2;
    let a = st.b * (0.25 + 0.75 * tw) * (0.55 + 0.2 * st.depth) * o.alpha;
    let stretch = 0;
    let ang = 0;
    for (const hole of holes) {
      /* A point lens: every star is seen pushed outward, to where
         (d + √(d² + 4θ²)) / 2 puts it, and drawn out into an arc the
         closer it lies to the ring of radius θ. */
      const dx = x - hole.x;
      const dy = y - hole.y;
      const d = Math.max(1, Math.hypot(dx, dy));
      const theta = hole.lens * hole.a;
      if (d > theta * 6) continue;
      const seen = (d + Math.sqrt(d * d + 4 * theta * theta)) / 2;
      x = hole.x + (dx / d) * seen;
      y = hole.y + (dy / d) * seen;
      stretch = Math.max(stretch, Math.min(22, (seen / d - 1) * 3.2));
      ang = Math.atan2(dy, dx) + Math.PI / 2;
      a *= 1 + Math.min(1.2, stretch * 0.08);
    }
    if (a < 0.03) continue;
    g.globalAlpha = Math.min(1, a);
    const color = st.warm ? "#ffd9a8" : "#dfe6f5";
    if (stretch > 1) {
      const half = stretch / 2;
      g.strokeStyle = color;
      g.beginPath();
      g.moveTo(x - Math.cos(ang) * half, y - Math.sin(ang) * half);
      g.lineTo(x + Math.cos(ang) * half, y + Math.sin(ang) * half);
      g.stroke();
      continue;
    }
    const level = st.b * (0.3 + 0.7 * tw);
    g.fillStyle = color;
    g.fillText(level > 0.75 ? "*" : level > 0.45 ? "+" : "·", x, y);
  }
  g.globalAlpha = 1;
}

/**
 * Faint nebulosity in characters, in the colours of the body on screen,
 * drifting with the camera a little faster than the far stars.
 */
export function drawDust(
  g: CanvasRenderingContext2D,
  bd: Backdrop,
  colors: string[],
  o: Opts,
) {
  if (o.alpha < 0.02) return;
  const cw = o.narrow ? 9 : 10;
  const ch = o.narrow ? 15 : 17;
  const cols = Math.ceil(o.w / cw);
  const rows = Math.ceil(o.h / ch);
  const scale = 1 / 9;
  const ox = -o.driftX * 0.04;
  const oy = -o.driftY * 0.04;
  const shift = o.calm ? 0 : o.t * 0.8;
  const mirror = (v: number) => {
    const m = ((v % (2 * DUST)) + 2 * DUST) % (2 * DUST);
    return Math.max(0, Math.min(DUST - 1, m < DUST ? m : 2 * DUST - m - 1));
  };
  g.font = `${o.narrow ? 10 : 11}px ${o.mono}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  const buckets: [number, number, string][][] = [[], [], []];
  for (let gy = 0; gy < rows; gy++) {
    const Y = (gy + 0.5) * ch;
    for (let gx = 0; gx < cols; gx++) {
      const X = (gx + 0.5) * cw;
      const u = Math.floor(mirror((X + ox + shift) * scale));
      const v = Math.floor(mirror((Y + oy) * scale));
      const n = bd.dust[v * DUST + u];
      const level = (n - 0.56) * 9;
      if (level < 0.4) continue;
      const lvl = Math.min(2, Math.floor(level));
      buckets[lvl].push([X, Y, lvl === 2 ? ":" : lvl === 1 ? "·" : "."]);
    }
  }
  const alphas = [0.16, 0.24, 0.32];
  buckets.forEach((list, lvl) => {
    g.fillStyle = colors[lvl === 2 ? 2 : 1];
    g.globalAlpha = alphas[lvl] * o.alpha;
    for (const [x, y, c] of list) g.fillText(c, x, y);
  });
  g.globalAlpha = 1;
}

/** Now and then, a shooting star across the upper sky. */
export function drawShootingStar(g: CanvasRenderingContext2D, bd: Backdrop, o: Opts) {
  if (o.calm || o.alpha < 0.3) {
    bd.shot = null;
    return;
  }
  if (!bd.shot && o.now > bd.nextShot) {
    if (bd.nextShot) {
      const r = bd.rnd;
      const dir = r() < 0.5 ? -1 : 1;
      bd.shot = {
        at: o.now,
        x: o.w * (0.35 + r() * 0.55),
        y: o.h * (0.08 + r() * 0.3),
        dx: dir * (0.8 + r() * 0.3),
        dy: 0.35 + r() * 0.25,
        len: 90 + r() * 90,
      };
    }
    bd.nextShot = o.now + 7000 + bd.rnd() * 9000;
  }
  const sh = bd.shot;
  if (!sh) return;
  const k = (o.now - sh.at) / 900;
  if (k >= 1) {
    bd.shot = null;
    return;
  }
  const travel = 260 * k;
  const hx = sh.x + sh.dx * travel;
  const hy = sh.y + sh.dy * travel;
  const tail = sh.len * Math.min(1, k * 3);
  const fade = Math.sin(Math.PI * k) * o.alpha;
  const grad = g.createLinearGradient(hx, hy, hx - sh.dx * tail, hy - sh.dy * tail);
  grad.addColorStop(0, `rgba(240,244,255,${0.85 * fade})`);
  grad.addColorStop(1, "rgba(240,244,255,0)");
  g.strokeStyle = grad;
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(hx, hy);
  g.lineTo(hx - sh.dx * tail, hy - sh.dy * tail);
  g.stroke();
}
