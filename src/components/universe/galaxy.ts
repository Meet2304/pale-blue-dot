import { fbm3 } from "./noise";
import { hash } from "./bodies";

/**
 * The galaxy behind the map, in the same character grid as everything else:
 * a warm core, two spiral arms seen at an angle, dark dust lanes along their
 * inner edges, pink knots where stars are forming, and a deep field of stars.
 *
 * The shape is measured once (per resize) into a list of cells. The cells are
 * drawn live every frame, so the galaxy is never a picture:
 *   - every character re-decides itself on its own slow clock;
 *   - stars twinkle, each at its own rate;
 *   - waves of light run outward along the arms;
 *   - the core breathes, and the star-forming knots flicker;
 *   - the whole disc turns, very slowly, about its centre.
 *
 * Earth is not at the centre. It sits out in an arm, which is where it is.
 */

type Opts = {
  /** World rectangle to fill, and the zoom the grid is measured at. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  z: number;
  /** Galaxy centre and radius, in world units. */
  cx: number;
  cy: number;
  radius: number;
};

/** Cell kinds, which are also colour rows. */
const CORE = 0;
const ARM = 1;
const DUST = 2;
const KNOT = 3;
const FIELD = 4;
const COLORS = ["#ffdcb0", "#c9d6ff", "#8f86a8", "#ff9fc8", "#e6ebf5"];

const RAMP = [".", "·", ":", ";", "+", "*"];
const LEVELS = 4;

export type Galaxy = {
  n: number;
  /** World position, relative to the galaxy's centre. */
  x: Float32Array;
  y: Float32Array;
  kind: Uint8Array;
  density: Float32Array;
  /** Spiral phase at the cell, for waves that travel along the arms. */
  phase: Float32Array;
  /** Radius in galaxy units (0 at the core, ~1 at the edge). */
  r: Float32Array;
  seed: Float32Array;
  cx: number;
  cy: number;
  radius: number;
  /** The zoom the grid was measured at. */
  z: number;
};

export function buildGalaxy(o: Opts): Galaxy {
  const cw = 6;
  const ch = 10;
  const wpx = (o.x1 - o.x0) * o.z;
  const hpx = (o.y1 - o.y0) * o.z;
  const cols = Math.ceil(wpx / cw);
  const rows = Math.ceil(hpx / ch);

  const xs: number[] = [];
  const ys: number[] = [];
  const kinds: number[] = [];
  const dens: number[] = [];
  const phases: number[] = [];
  const rads: number[] = [];
  const seeds: number[] = [];
  const push = (
    wx: number,
    wy: number,
    k: number,
    d: number,
    ph: number,
    r: number,
    s: number,
  ) => {
    xs.push(wx);
    ys.push(wy);
    kinds.push(k);
    dens.push(d);
    phases.push(ph);
    rads.push(r);
    seeds.push(s);
  };

  const tilt = -0.42;
  const incl = 0.58;
  const pitch = 0.3;
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);

  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const id = gx * 131 + gy * 977;
      const wx = o.x0 + ((gx + 0.5) * cw) / o.z - o.cx;
      const wy = o.y0 + ((gy + 0.5) * ch) / o.z - o.cy;

      const px = (wx * ct + wy * st) / o.radius;
      const py = (-wx * st + wy * ct) / incl / o.radius;
      const r = Math.hypot(px, py);
      const th = Math.atan2(py, px);
      const phase = th - Math.log(Math.max(r, 0.02)) / Math.tan(pitch);
      const arm = Math.pow(0.5 + 0.5 * Math.cos(2 * phase), 3.2);
      const lane = Math.pow(0.5 + 0.5 * Math.cos(2 * (phase + 0.42)), 8);
      const n = fbm3(px * 5.5, py * 5.5, 1.3, 3);

      const bulge = Math.exp(-((r / 0.11) ** 2)) * 1.4;
      const disk =
        Math.exp(-r / 0.62) *
        (0.08 + 1.1 * arm) *
        (0.45 + n * 1.1) *
        (r > 1.15 ? 0 : 1);
      const dust = lane * Math.exp(-r / 0.7) * 0.7 * (r > 0.1 ? 1 : 0);
      const d = Math.max(0, bulge + disk - dust);
      const s = hash(id, 8);

      if (arm > 0.55 && r > 0.12 && r < 0.95 && n > 0.62 && hash(id, 71) < 0.5) {
        push(wx, wy, KNOT, 0.5 + (n - 0.62) * 5, phase, r, s);
        continue;
      }
      if (d > 0.03 && hash(id, 7) < Math.min(0.72, d * 1.9)) {
        push(wx, wy, r < 0.2 ? CORE : dust > 0.35 ? DUST : ARM, d, phase, r, s);
        continue;
      }
      const hs = hash(id, 9);
      if (hs > 0.985)
        push(wx, wy, FIELD, hs > 0.998 ? 1.2 : hs > 0.993 ? 0.6 : 0.25, 0, 2, s);
    }
  }

  return {
    n: xs.length,
    x: Float32Array.from(xs),
    y: Float32Array.from(ys),
    kind: Uint8Array.from(kinds),
    density: Float32Array.from(dens),
    phase: Float32Array.from(phases),
    r: Float32Array.from(rads),
    seed: Float32Array.from(seeds),
    cx: o.cx,
    cy: o.cy,
    radius: o.radius,
    z: o.z,
  };
}

/* Reused buckets: kind × brightness level. */
const BUCKETS = COLORS.length * LEVELS;
const bx: number[][] = Array.from({ length: BUCKETS }, () => []);
const by: number[][] = Array.from({ length: BUCKETS }, () => []);
const bc: string[][] = Array.from({ length: BUCKETS }, () => []);

export function drawGalaxy(
  g: CanvasRenderingContext2D,
  gal: Galaxy,
  o: {
    toX: (x: number) => number;
    toY: (y: number) => number;
    z: number;
    w: number;
    h: number;
    t: number;
    alpha: number;
    rot: number;
    calm: boolean;
    mono: string;
  },
) {
  const { t, calm } = o;
  const k = o.z / gal.z;
  const cr = Math.cos(o.rot);
  const sr = Math.sin(o.rot);
  const gcx = o.toX(gal.cx);
  const gcy = o.toY(gal.cy);

  /* A soft glow under the core that breathes. */
  const breathe = calm ? 1 : 1 + 0.12 * Math.sin(t * 0.5);
  const rr = gal.radius * o.z * 0.42;
  const grad = g.createRadialGradient(gcx, gcy, 0, gcx, gcy, rr);
  grad.addColorStop(0, `rgba(255,220,176,${0.3 * breathe * o.alpha})`);
  grad.addColorStop(0.4, `rgba(255,210,170,${0.08 * breathe * o.alpha})`);
  grad.addColorStop(1, "rgba(255,220,176,0)");
  g.globalCompositeOperation = "lighter";
  g.fillStyle = grad;
  g.fillRect(gcx - rr, gcy - rr, rr * 2, rr * 2);
  g.globalCompositeOperation = "source-over";

  for (let b = 0; b < BUCKETS; b++) {
    bx[b].length = 0;
    by[b].length = 0;
    bc[b].length = 0;
  }

  for (let i = 0; i < gal.n; i++) {
    const X = gcx + (gal.x[i] * cr - gal.y[i] * sr) * o.z;
    const Y = gcy + (gal.x[i] * sr + gal.y[i] * cr) * o.z;
    if (X < -10 || Y < -10 || X > o.w + 10 || Y > o.h + 10) continue;
    const kind = gal.kind[i];
    const s = gal.seed[i];
    let d = gal.density[i];

    if (!calm) {
      if (kind === FIELD) {
        /* Twinkle, each star at its own rate. */
        d *= 0.55 + 0.45 * Math.sin(t * (0.6 + s * 1.8) + s * 40);
      } else if (kind === KNOT) {
        d *= 0.6 + 0.4 * Math.sin(t * (1.2 + s * 2) + s * 30);
      } else {
        /* Waves of light running outward along the arms, a slow pulse in
           the core, and a small shimmer on every cell. */
        const wave = Math.max(0, Math.sin(gal.phase[i] * 2 + gal.r[i] * 3 - t * 0.55));
        const core = kind === CORE ? 0.15 * Math.sin(t * 0.5 - gal.r[i] * 12) : 0;
        d *= 1 + 0.5 * wave * wave + core + 0.12 * Math.sin(t * (0.8 + s) + s * 20);
      }
    }
    if (d < 0.02) continue;

    let c: string;
    if (kind === FIELD) c = d > 0.9 ? "+" : ".";
    else if (kind === KNOT) c = d > 0.8 ? "+" : ":";
    else {
      /* Each cell re-decides its glyph on its own slow clock. */
      const epoch = calm ? 0 : Math.floor(t / (1.6 + s * 3.2) + s * 7);
      const jitter = (hash(i, epoch) - 0.5) * 2.2;
      const gi = Math.max(0, Math.min(RAMP.length - 1, Math.floor(d * 4.5 + jitter)));
      c = RAMP[gi];
    }
    const lvl = Math.max(0, Math.min(LEVELS - 1, Math.floor(d * 3.2)));
    const bIdx = kind * LEVELS + lvl;
    bx[bIdx].push(X);
    by[bIdx].push(Y);
    bc[bIdx].push(c);
  }

  g.font = `${Math.max(6, Math.min(16, 9 * k))}px ${o.mono}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  const alphas = [0.28, 0.45, 0.65, 0.9];
  for (let b = 0; b < BUCKETS; b++) {
    const xs = bx[b];
    if (!xs.length) continue;
    g.fillStyle = COLORS[Math.floor(b / LEVELS)];
    g.globalAlpha = alphas[b % LEVELS] * o.alpha;
    const ys = by[b];
    const cs = bc[b];
    for (let j = 0; j < xs.length; j++) g.fillText(cs[j], xs[j], ys[j]);
  }
  g.globalAlpha = 1;
}
