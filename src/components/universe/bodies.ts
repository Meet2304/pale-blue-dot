import { mulberry32 } from "./helpers";
import type { Look } from "./looks";
import { fbm3 } from "./noise";

/**
 * The bodies of the universe, each drawn one character cell at a time.
 *
 * A renderer gets a cell's position in body units (radius 1, y down) and
 * fills `o` with a glyph, a colour tier and an alpha, or returns false.
 * Colour tiers: 0 deep, 1 dim, 2 accent, 3 soft, 4 near-white (the kind's
 * ramp), 5 warm, 6 white.
 *
 * Every body answers the scanner: inside the cursor's scan radius it shows
 * the structure underneath instead of its surface.
 */

export type BodyId =
  "earth" | "planet" | "sun" | "nebula" | "blackhole" | "constellation";

export type Cell = { c: string; k: number; a: number };

export type Frame = {
  t: number;
  cosY: number;
  sinY: number;
  cosT: number;
  sinT: number;
  sx: number;
  sy: number;
  sr: number;
  /** One cell's width and height in body units. */
  px: number;
  py: number;
  /** A per-body number, so no two nebulae or constellations are the same. */
  seed: number;
  calm: boolean;
  /** How this body differs from others of its kind (looks.ts); the
      portraits read it, and draw their kind's usual body without it. */
  look?: Look;
};

export type BodyFn = (nx: number, ny: number, id: number, f: Frame, o: Cell) => boolean;

export const hash = (i: number, e = 0) => {
  const s = Math.sin(i * 12.9898 + e * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

const set = (o: Cell, c: string, k: number, a: number) => {
  o.c = c;
  o.k = k;
  o.a = a;
  return true;
};

const STROKES = ["-", "\\", "|", "/"];
export const strokeAt = (ang: number) => {
  const a = ((ang % Math.PI) + Math.PI) % Math.PI;
  return STROKES[Math.round(a / (Math.PI / 4)) % 4];
};

const inScan = (nx: number, ny: number, f: Frame) =>
  f.sr > 0 && (nx - f.sx) ** 2 + (ny - f.sy) ** 2 < f.sr * f.sr;

const pick = (set: string[], id: number, f: Frame, rate = 0.6) =>
  set[
    Math.floor(
      hash(id + 7, f.calm ? 0 : Math.floor(f.t * rate + hash(id, 1) * 3)) * set.length,
    )
  ];

/* Light comes from the upper left, for every body that is lit. */
const SUN = [-0.62, 0.42, 0.66];

/* ------------------------------------------------------------------ Earth */

const OCEAN = ["·", "-", "~", "≈"];
const LAND = [".", ",", ":", ";", "+"];
const CLOUD = ["'", "`", "°", "o"];

const earth: BodyFn = (nx, ny, id, f, o) => {
  const d2 = nx * nx + ny * ny;
  if (d2 > 1.16) return false;
  if (d2 > 1) {
    return hash(id, f.calm ? 0 : Math.floor(f.t * 2)) < 0.5
      ? set(o, "·", 3, 0.5)
      : false;
  }
  const nz = Math.sqrt(1 - d2);
  const sx = nx;
  const sy = -ny;
  const sz = nz;
  const lambert = sx * SUN[0] + sy * SUN[1] + sz * SUN[2];
  const ty = sy * f.cosT - sz * f.sinT;
  const tz = sy * f.sinT + sz * f.cosT;
  const ox = sx * f.cosY + tz * f.sinY;
  const oz = -sx * f.sinY + tz * f.cosY;
  const oy = ty;
  const lat = Math.asin(Math.max(-1, Math.min(1, oy)));
  const lon = Math.atan2(ox, oz);

  if (inScan(nx, ny, f)) {
    const latL = Math.abs(((lat * 12) / Math.PI) % 1);
    const lonL = Math.abs(((lon * 12) / Math.PI) % 1);
    const onLat = latL < 0.08 || latL > 0.92;
    const onLon = lonL < 0.05 || lonL > 0.95;
    if (onLat || onLon) return set(o, onLat && onLon ? "+" : onLat ? "-" : "|", 2, 1);
  }

  const b = Math.max(0, lambert * 1.05 + 0.08);
  const isLand = fbm3(ox * 1.7 + 11, oy * 1.7 + 3, oz * 1.7 + 7) > 0.54;
  const drift = f.t * 0.018;
  const cloud = fbm3(
    ox * 3.2 + Math.cos(drift) * 2,
    oy * 3.6,
    oz * 3.2 + Math.sin(drift) * 2,
    3,
  );
  if (cloud > 0.6 && b > 0.08) {
    const i = Math.min(
      CLOUD.length - 1,
      Math.floor(((cloud - 0.6) / 0.25) * CLOUD.length),
    );
    return set(o, CLOUD[i], 6, 0.85);
  }
  if (lambert < 0.04) {
    if (isLand) {
      if (hash(Math.round(lon * 60) * 97 + Math.round(lat * 60), 3) > 0.9) {
        const tw = f.calm ? 1 : 0.5 + 0.5 * Math.sin(f.t * 2 + id);
        return set(o, tw > 0.5 ? "*" : "·", 5, 0.95);
      }
      return hash(id, 1) < 0.3 ? set(o, ".", 3, 0.45) : false;
    }
    return hash(id, 2) < 0.16 ? set(o, "·", 0, 0.9) : false;
  }
  if (isLand) {
    const i = Math.min(LAND.length - 1, Math.floor(b * LAND.length));
    return set(o, LAND[i], b < 0.35 ? 3 : 4, b < 0.35 ? 0.55 : 0.85);
  }
  const i = Math.min(OCEAN.length - 1, Math.floor(b * OCEAN.length));
  return set(o, OCEAN[i], b < 0.3 ? 0 : b < 0.65 ? 1 : 2, 0.95);
};

/* ----------------------------------------------------------------- Planet */

/**
 * A banded world for projects: lit from the same sun as the Earth, turning,
 * and, for most of them, ringed. The ring passes behind the planet at the
 * top and in front of it at the bottom.
 */
const planet: BodyFn = (nx, ny, id, f, o) => {
  const ringed = hash(f.seed, 97) > 0.3;
  const tilt = -0.32 + hash(f.seed, 5) * 0.2;
  const c = Math.cos(tilt);
  const s = Math.sin(tilt);
  const rx = nx * c + ny * s;
  const ry = -nx * s + ny * c;
  const er = Math.hypot(rx, ry / 0.26);
  const onRing =
    ringed &&
    er > 1.3 &&
    er < 2.05 &&
    Math.sin(er * 26 + f.seed) > -0.55 &&
    Math.abs(er - 1.72) > 0.035;
  const ringGlyph = () => {
    const b = 1 - Math.abs(er - 1.65) / 0.45;
    return set(o, b > 0.6 ? "=" : b > 0.3 ? "-" : "·", b > 0.6 ? 4 : 3, 0.45 + b * 0.5);
  };

  const d2 = nx * nx + ny * ny;
  if (d2 > 1) {
    if (onRing) return ringGlyph();
    if (d2 < 1.12) return hash(id, 3) < 0.5 ? set(o, "·", 3, 0.45) : false;
    return false;
  }
  /* The near half of the ring crosses in front of the disc. */
  if (onRing && ry > 0) return ringGlyph();

  const nz = Math.sqrt(1 - d2);
  const lambert = nx * SUN[0] - ny * SUN[1] + nz * SUN[2];
  const lat = -ny;
  const lon = Math.atan2(nx, nz) + (f.calm ? 0 : f.t * 0.08);
  const band =
    Math.sin(
      lat * (7 + hash(f.seed, 2) * 5) + fbm3(lon * 1.2, lat * 3, f.seed, 3) * 3.2,
    ) *
      0.5 +
    0.5;

  if (inScan(nx, ny, f)) {
    const q = lat * 10;
    if (Math.abs(q - Math.round(q)) < 0.14) return set(o, "-", 2, 1);
  }
  if (lambert < 0.02) return hash(id, 4) < 0.12 ? set(o, "·", 0, 0.8) : false;
  const b = Math.min(1, lambert * 1.1 + 0.05);
  const v = b * (0.55 + band * 0.45);
  const ch = v > 0.72 ? "=" : v > 0.5 ? "≈" : v > 0.3 ? "~" : v > 0.15 ? "-" : "·";
  const k = band > 0.66 ? (v > 0.6 ? 4 : 3) : band > 0.33 ? 2 : 1;
  return set(o, ch, k, 0.45 + v * 0.55);
};

/* -------------------------------------------------------------------- Sun */

/**
 * A star for professional experience, drawn as what a star is: a sphere of
 * light. A white-hot centre cooling to gold at the limb, a clean round edge,
 * a slow boil of granulation across the face, and a soft corona that fades
 * evenly into space. The renderer lays a warm glow underneath (see
 * render.ts), which is what makes it read as light rather than as type.
 */
const DISC = ["·", ":", "+", "*", "*"];

const sun: BodyFn = (nx, ny, id, f, o) => {
  const r = Math.hypot(nx, ny);
  if (r > 1.9) return false;
  const tt = f.calm ? 0 : f.t;

  if (r <= 1) {
    const mu = Math.sqrt(1 - r * r);
    /* Limb darkening: the edge is cooler and dimmer than the centre. */
    const limb = 0.35 + 0.65 * Math.pow(mu, 0.55);
    const lon = Math.atan2(nx, mu) + tt * 0.05;
    const lat = Math.asin(-ny);
    const cl = Math.cos(lat);
    const gran = fbm3(
      cl * Math.sin(lon) * 6 + f.seed,
      Math.sin(lat) * 6,
      cl * Math.cos(lon) * 6 + tt * 0.1,
      2,
    );
    if (inScan(nx, ny, f)) {
      const q = gran * 10;
      if (Math.abs(q - Math.round(q)) < 0.12) return set(o, "~", 4, 1);
    }
    const b = limb * (0.8 + (gran - 0.5) * 0.9);
    const i = Math.max(0, Math.min(DISC.length - 1, Math.floor(b * DISC.length)));
    /* Colour runs white at the centre, through near-white, to gold. */
    const k = b > 0.82 ? 6 : b > 0.62 ? 4 : b > 0.45 ? 5 : 3;
    return set(o, DISC[i], k, Math.min(1, 0.55 + b * 0.5));
  }

  /* A thin bright rim right at the edge. */
  if (r < 1 + f.px * 0.9) return set(o, "·", 5, 0.9);

  /* The corona: even all the way round, gently breathing, with faint
     streamers so it is never a perfect disc. */
  const ang = Math.atan2(ny, nx);
  const breathe = 1 + 0.12 * Math.sin(tt * 0.6);
  const streak = 0.75 + 0.25 * Math.sin(ang * 6 + f.seed * 7 + tt * 0.05);
  const I = Math.exp(-(r - 1) * 3.1) * streak * breathe;
  if (hash(id, 19) < I * 0.85) {
    return set(
      o,
      I > 0.55 ? ":" : "·",
      I > 0.55 ? 5 : I > 0.25 ? 4 : 3,
      0.35 + I * 0.6,
    );
  }
  if (inScan(nx, ny, f) && hash(id, 17) < 0.25) {
    return set(o, strokeAt(ang), 2, 0.8);
  }
  return false;
};

/* ----------------------------------------------------------------- Nebula */

const GAS = [
  [".", "'", "`"],
  [":", "·", ","],
  [";", "~", "-"],
  ["=", "+", "≈"],
];

const nebula: BodyFn = (nx, ny, id, f, o) => {
  const r2 = nx * nx + ny * ny;
  if (r2 > 2.1) return false;
  const r = Math.sqrt(r2);
  const sw = 0.55 * Math.sin(r * 2.6 - f.t * 0.12) * Math.exp(-r2 * 0.6);
  const cs = Math.cos(sw);
  const sn = Math.sin(sw);
  const x = nx * cs - ny * sn;
  const y = nx * sn + ny * cs;
  const d = fbm3(x * 1.45 + 3.1 + f.seed * 7, y * 1.45 + 1.7, f.t * 0.035, 4);
  const fall = Math.exp(-r2 * 0.95);
  const v = (d - 0.36) * 2.5 * fall + 0.18 * fall * fall;

  const hs = hash(id, 11);
  if (hs > 0.993 && v > 0.1) {
    const tw = f.calm ? 1 : 0.55 + 0.45 * Math.sin(f.t * 1.7 + id);
    return set(o, hs > 0.998 ? "*" : "+", 6, tw);
  }
  if (inScan(nx, ny, f) && v > 0.04) {
    const q = v * 9;
    if (Math.abs(q - Math.round(q)) < 0.1) return set(o, "~", 4, 0.95);
    return hash(id, 5) < 0.5 ? set(o, "·", 1, 0.4) : false;
  }
  if (v < 0.06) return hash(id, 3) < 0.03 && r < 1.3 ? set(o, ".", 1, 0.5) : false;
  const tier = v < 0.2 ? 0 : v < 0.38 ? 1 : v < 0.58 ? 2 : 3;
  const k = tier === 0 ? 1 : tier === 1 ? 2 : tier === 2 ? 3 : v > 0.8 ? 5 : 4;
  return set(o, pick(GAS[tier], id, f), k, 0.5 + tier * 0.15);
};

/* ------------------------------------------------------------- Black hole */

/**
 * For education: the deepest gravity. Drawn the way the real thing looks: a
 * perfectly black shadow; a bright, thin photon ring; the far side of the
 * accretion disk bent up over the top (and faintly under the bottom) into a
 * smooth halo of light; and the near side of the disk, a flat bright band,
 * crossing in front. The side of the disk turning toward us is brighter.
 * The renderer paints a warm glow underneath and blacks out the shadow.
 */
const RS = 0.3;
const TILT = 0.1;

const blackhole: BodyFn = (nx, ny, id, f, o) => {
  const r = Math.hypot(nx, ny);
  if (r > 2.1) return false;
  const tt = f.calm ? 0 : f.t;
  const ang = Math.atan2(ny, nx);
  const dop = (c: number) => 1 + 0.5 * -c;

  /* The near side of the disk: flat, thin, crossing in front. */
  const v = ny / TILT;
  const rr = Math.hypot(nx, v);
  const behind = ny < 0 && r < RS * 1.2;
  if (rr > RS * 1.1 && rr < 2 && !behind) {
    const heat = Math.pow(Math.max(0, 1 - (rr - RS) / 1.7), 1.5);
    const bands = 0.75 + 0.25 * Math.sin(rr * 24 - tt * 0.8);
    const b = heat * dop(nx / Math.max(rr, 0.3)) * bands * Math.min(1, (2 - rr) / 0.35);
    if (b > 0.06) {
      if (b > 0.95) return set(o, "=", 6, 1);
      if (b > 0.6) return set(o, "=", 5, 0.95);
      if (b > 0.32) return set(o, "-", 5, 0.85);
      if (b > 0.14) return set(o, "-", 3, 0.7);
      return hash(id, 4) < 0.6 ? set(o, "·", 2, 0.55) : false;
    }
  }

  if (r < RS) return false;

  /* The photon ring. */
  if (r < RS + 0.03) return false;

  /* The lensed halo: smooth, isotropic glyphs, brightest at the inner edge,
     fuller over the top than under the bottom. */
  if (r < 0.95) {
    const k = Math.max(0, 1 - (r - RS) / 0.65);
    const top = ny < 0 ? 1 : 0.5;
    const shimmer = 0.85 + 0.15 * Math.sin(ang * 10 - tt * 1.4 + r * 16);
    const b = Math.pow(k, 1.4) * top * dop(Math.cos(ang)) * shimmer;
    if (b > 0.05 && hash(id, 13) < 0.3 + b) {
      if (b > 0.75) return set(o, "*", 6, 1);
      if (b > 0.5) return set(o, "+", 5, 0.95);
      if (b > 0.28) return set(o, ":", 4, 0.85);
      return set(o, "·", 3, 0.7);
    }
  }

  if (inScan(nx, ny, f)) {
    const q = Math.log(r) * 7;
    if (Math.abs(q - Math.round(q)) < 0.1) return set(o, "·", 2, 0.9);
  }

  if (r < 1.7 && hash(id, 31) < 0.04 * (1.7 - r)) return set(o, "·", 2, 0.45);
  return false;
};

/* ---------------------------------------------------------- Constellation */

type Figure = {
  nodes: { x: number; y: number; m: number }[];
  edges: [number, number][];
};
const figures = new Map<number, Figure>();

/** A figure per seed: a winding chain of stars with a few cross-links. */
function figureFor(seed: number): Figure {
  const hit = figures.get(seed);
  if (hit) return hit;
  const r = mulberry32(Math.floor(seed * 1e6) + 17);
  const n = 9 + Math.floor(r() * 3);
  const nodes: Figure["nodes"] = [];
  let ang = r() * Math.PI * 2;
  let x = -0.9;
  let y = (r() - 0.5) * 0.6;
  for (let i = 0; i < n; i++) {
    nodes.push({ x, y, m: i === 0 ? 1 : 0.35 + r() * 0.65 });
    ang += (r() - 0.5) * 1.8;
    x = Math.max(-1.4, Math.min(1.4, x + 0.3 + r() * 0.14));
    y = Math.max(-1.1, Math.min(1.1, y + Math.sin(ang) * 0.6));
  }
  /* The brightest star is the one everything else hangs from. */
  const top = Math.floor(n / 2 + (r() - 0.5) * 3);
  nodes[top].m = 1.25;
  const edges: [number, number][] = [];
  for (let i = 0; i < n - 1; i++) edges.push([i, i + 1]);
  edges.push([top, Math.max(0, top - 3)]);
  edges.push([top, Math.min(n - 1, top + 3)]);
  const fig = { nodes, edges };
  figures.set(seed, fig);
  return fig;
}

/**
 * For leadership: separate stars joined into one shape. Every star has a
 * glow; the brightest carry diffraction spikes; every line is always drawn,
 * with light travelling along it; the brightest star sends ripples out
 * through the figure; and a band of the Milky Way runs behind it all.
 */
const constellation: BodyFn = (nx, ny, id, f, o) => {
  const tt = f.calm ? 0 : f.t;
  const fig = figureFor(f.seed);

  for (let k = 0; k < fig.nodes.length; k++) {
    const nd = fig.nodes[k];
    const dx = (nx - nd.x) / f.px;
    const dy = (ny - nd.y) / f.py;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    const d = Math.hypot(dx, dy * 1.7);
    const tw = 0.82 + 0.18 * Math.sin(tt * 1.4 + k * 1.7);
    if (adx < 0.5 && ady < 0.5) return set(o, nd.m > 0.7 ? "*" : "+", 6, tw);
    if (nd.m > 0.7) {
      const spike = 2 + nd.m * 5;
      if (ady < 0.5 && adx < spike) {
        return set(o, "-", adx < spike / 2 ? 6 : 4, (1 - adx / spike) * tw);
      }
      if (adx < 0.5 && ady < spike * 0.5) {
        return set(o, "|", ady < spike / 4 ? 6 : 4, (1 - ady / (spike * 0.5)) * tw);
      }
    }
    /* The glow: a soft ring of dots, larger for brighter stars. */
    const halo = 1.3 + nd.m * 1.6;
    if (d < halo && hash(id, 9 + k) < 0.75 * (1 - d / halo)) return set(o, "·", 4, 0.7);
  }

  for (const [a, b] of fig.edges) {
    const n0 = fig.nodes[a];
    const n1 = fig.nodes[b];
    const dx = n1.x - n0.x;
    const dy = n1.y - n0.y;
    const len2 = dx * dx + dy * dy;
    const s0 = Math.max(0, Math.min(1, ((nx - n0.x) * dx + (ny - n0.y) * dy) / len2));
    const d = Math.hypot(nx - (n0.x + dx * s0), ny - (n0.y + dy * s0));
    if (d < Math.max(f.px, f.py) * 0.5) {
      /* A pulse of light travels each line, once every few seconds. */
      const pulse = s0 - ((tt * 0.35 + a * 0.29) % 1.6);
      const on = pulse < 0 && pulse > -0.2;
      return set(o, strokeAt(Math.atan2(dy, dx)), on ? 4 : 2, on ? 1 : 0.7);
    }
  }

  const top = fig.nodes.reduce((a, b) => (b.m > a.m ? b : a));
  const rd = Math.hypot(nx - top.x, (ny - top.y) * 1.1);
  for (let q = 0; q < 3; q++) {
    const rr = ((tt * 0.08 + q / 3) % 1) * 2.2;
    if (Math.abs(rd - rr) < f.px * 0.6 && hash(id, 40 + q) < 0.75 * (1 - rr / 2.2)) {
      return set(o, "·", 3, 0.8 * (1 - rr / 2.2));
    }
  }

  if (inScan(nx, ny, f) && hash(id, 21) > 0.93) {
    return set(o, hash(id, 22) > 0.7 ? "+" : "·", 4, 0.9);
  }

  /* The Milky Way: a soft diagonal band of faint stars and dust behind. */
  const band = Math.abs(ny * 0.8 + nx * 0.45 + 0.1 * Math.sin(nx * 2 + f.seed * 9));
  const dust = fbm3(nx * 2.2 + f.seed * 5, ny * 2.2, 0.3, 3);
  const density = Math.exp(-band * band * 6) * (0.35 + dust);
  if (hash(id, 23) < density * 0.22) {
    const bright = hash(id, 24);
    return set(
      o,
      bright > 0.92 ? "+" : bright > 0.7 ? ":" : ".",
      bright > 0.92 ? 3 : 1,
      0.5 + bright * 0.3,
    );
  }
  if (hash(id, 25) > 0.996) return set(o, ".", 3, 0.7);
  return false;
};

export const BODIES: Record<BodyId, BodyFn> = {
  earth,
  planet,
  sun,
  nebula,
  blackhole,
  constellation,
};

/** How far each body reaches, in body units. */
export const EXTENT: Record<BodyId, number> = {
  earth: 1.1,
  planet: 2.1,
  sun: 1.9,
  nebula: 1.45,
  blackhole: 2.1,
  constellation: 2.1,
};
