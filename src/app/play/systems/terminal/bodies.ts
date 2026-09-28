import { fbm3 } from "../lab/noise";

/**
 * The five bodies of the Terminal system, each drawn one character cell at a
 * time. Every renderer takes a cell's position in body units (the body's
 * radius is 1, y points down) and fills `o` with a glyph, a colour tier and
 * an alpha, or returns false for an empty cell.
 *
 * Colour tiers: 0 deep, 1 dim, 2 accent, 3 soft, 4 near-white (the accent's
 * five-stop ramp), 5 warm (city lights, the hottest gas), 6 white.
 *
 * Each body also answers the scanner: when a cell is inside the cursor's scan
 * radius, the body shows the structure underneath instead of its surface.
 */

export type BodyId = "earth" | "nebula" | "blackhole" | "star" | "constellation";

export type Cell = { c: string; k: number; a: number };

export type Frame = {
  t: number;
  /** Earth's spin and tilt, precomputed. */
  cosY: number;
  sinY: number;
  cosT: number;
  sinT: number;
  /** Scanner centre and radius in body units; r = 0 when there is no scan. */
  sx: number;
  sy: number;
  sr: number;
  /** One character cell's width in body units, for line thickness. */
  px: number;
  calm: boolean;
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
/** A stroke laid along an angle (screen space, y down). */
export const strokeAt = (ang: number) => {
  const a = ((ang % Math.PI) + Math.PI) % Math.PI;
  return STROKES[Math.round(a / (Math.PI / 4)) % 4];
};

const inScan = (nx: number, ny: number, f: Frame) =>
  f.sr > 0 && (nx - f.sx) ** 2 + (ny - f.sy) ** 2 < f.sr * f.sr;

/** Stable glyph choice for a cell, re-rolled on the cell's own slow clock. */
const pick = (set: string[], id: number, f: Frame, rate = 0.6) =>
  set[
    Math.floor(
      hash(id + 7, f.calm ? 0 : Math.floor(f.t * rate + hash(id, 1) * 3)) * set.length,
    )
  ];

/* ------------------------------------------------------------------ Earth */

const OCEAN = ["·", "-", "~", "≈"];
const LAND = [".", ",", ":", ";", "+"];
const CLOUD = ["'", "`", "°", "o"];
const SUN = [-0.62, 0.42, 0.66];

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
  /* A slow swirl, strongest in the middle, so the gas turns. */
  const sw = 0.55 * Math.sin(r * 2.6 - f.t * 0.12) * Math.exp(-r2 * 0.6);
  const cs = Math.cos(sw);
  const sn = Math.sin(sw);
  const x = nx * cs - ny * sn;
  const y = nx * sn + ny * cs;
  const d = fbm3(x * 1.45 + 3.1, y * 1.45 + 1.7, f.t * 0.035, 4);
  const fall = Math.exp(-r2 * 0.95);
  const v = (d - 0.36) * 2.5 * fall + 0.18 * fall * fall;

  /* Newborn stars embedded in the gas. */
  const hs = hash(id, 11);
  if (hs > 0.993 && v > 0.1) {
    const tw = f.calm ? 1 : 0.55 + 0.45 * Math.sin(f.t * 1.7 + id);
    return set(o, hs > 0.998 ? "*" : "+", 6, tw);
  }
  if (inScan(nx, ny, f) && v > 0.04) {
    /* Density contours: the shape of the cloud, drawn as isolines. */
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

const RS = 0.3;
const DISK_B = 0.2;

const blackhole: BodyFn = (nx, ny, id, f, o) => {
  const r = Math.hypot(nx, ny);
  if (r > 1.5) return false;
  const u = nx;
  const v = ny / DISK_B;
  const rr = Math.hypot(u, v);
  const spin = f.calm ? 0 : f.t;

  /* The disk, seen nearly edge-on; its far half is hidden behind the hole. */
  if (rr > 0.44 && rr < 1.32 && !(ny < 0 && r < RS * 1.08)) {
    const ang = Math.atan2(v, u);
    const heat = 1 - (rr - 0.44) / 0.88;
    const dop = 1 + 0.6 * (-u / rr);
    const streak = 0.62 + 0.38 * Math.sin(ang * 7 - (spin * 1.4) / rr + rr * 9);
    const edge = Math.min(1, (rr - 0.44) / 0.08, (1.32 - rr) / 0.2);
    const b = heat * dop * streak * edge;
    if (b < 0.08) return hash(id, 4) < 0.25 ? set(o, "·", 1, 0.5) : false;
    if (b > 1) return set(o, "=", 6, 1);
    if (b > 0.65) return set(o, "=", 5, 0.95);
    if (b > 0.35) return set(o, "-", 4, 0.85);
    return set(o, "~", 3, 0.7);
  }
  if (r < RS) return false;

  /* The photon ring: light that orbited once before escaping. */
  if (Math.abs(r - 0.33) < 0.022) return set(o, "o", 6, 0.95);

  /* The far side of the disk, lensed up and over the shadow. */
  if (ny < 0.06 && r > 0.37 && r < 0.66) {
    /* Brightest just outside the ring, thinning outward, so it reads as a
       halo of bent light rather than a solid band. */
    const k = Math.max(0, 1 - (r - 0.37) / 0.29);
    const dop = 1 + 0.5 * (-nx / r);
    const up = Math.min(1, (0.06 - ny) / 0.25);
    const b =
      k * k * dop * up * (0.75 + 0.25 * Math.sin(Math.atan2(ny, nx) * 9 - spin * 2));
    if (hash(id, 13) < b * 1.2) {
      const ch = b > 0.7 ? "=" : b > 0.35 ? "-" : "·";
      return set(o, ch, b > 0.7 ? 6 : b > 0.35 ? 4 : 3, Math.min(1, 0.45 + b));
    }
    return false;
  }
  /* And the thin image of its underside, below. */
  if (ny > 0.1 && r > 0.35 && r < 0.41) {
    return hash(id, 14) < 0.7 ? set(o, "-", 3, 0.55) : false;
  }

  if (inScan(nx, ny, f)) {
    /* The gravity well: equal-potential rings, closer together near the hole. */
    const q = Math.log(r) * 7;
    if (Math.abs(q - Math.round(q)) < 0.12) return set(o, "·", 2, 0.9);
    return false;
  }
  /* A faint glow of hot dust around it. */
  return hash(id, 6) < 0.05 * (1.5 - r) ? set(o, ".", 1, 0.45) : false;
};

/* ------------------------------------------------------------ Star system */

const ORBITS = [
  { a: 0.46, w: 0.55, p: 0.4 },
  { a: 0.74, w: 0.34, p: 2.3 },
  { a: 1.02, w: 0.22, p: 4.1 },
  { a: 1.3, w: 0.15, p: 5.4 },
];
const FLAT = 0.36;

const star: BodyFn = (nx, ny, id, f, o) => {
  const r = Math.hypot(nx, ny);
  if (r > 1.45) return false;
  const tt = f.calm ? 0 : f.t;

  /* Planets, in front of or behind the star. */
  for (let k = 0; k < ORBITS.length; k++) {
    const ob = ORBITS[k];
    const th = tt * ob.w + ob.p;
    const px = Math.cos(th) * ob.a;
    const py = Math.sin(th) * ob.a * FLAT;
    const d = Math.hypot(nx - px, (ny - py) * 1.3);
    if (d < f.px * (1.05 + k * 0.2)) {
      const behind = Math.sin(th) < 0 && Math.hypot(px, py) < 0.3;
      if (!behind) return set(o, "O", 6, 1);
    }
  }

  if (r < 0.08) return set(o, "*", 6, 1);
  if (r < 0.36) {
    const v = (0.36 - r) / 0.28;
    const fl = f.calm ? 0.5 : hash(id, Math.floor(f.t * 8));
    if (fl > 1 - v * 0.9) {
      const ch = v > 0.7 ? "*" : v > 0.45 ? "+" : v > 0.2 ? ":" : "·";
      return set(o, ch, v > 0.6 ? 5 : 4, 0.5 + v * 0.5);
    }
  }

  const eR = Math.hypot(nx, ny / FLAT);
  const scanning = inScan(nx, ny, f);
  /* Distance to each orbit in screen terms: the ellipse is flattened, so
     divide by its gradient or the top and bottom of every orbit vanish. */
  const grad = Math.hypot(nx / eR, ny / (FLAT * FLAT * eR)) || 1;
  for (const ob of ORBITS) {
    if (Math.abs(eR - ob.a) / grad < f.px * 0.6) {
      const ang = Math.atan2(ny / FLAT, nx);
      const th = tt * ob.w + ob.p;
      /* A trail behind each planet, fading over half a turn. */
      let lag = th - ang;
      lag = ((lag % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      if (lag < 1.4) return set(o, "-", 3, 0.9 - lag * 0.45);
      if (scanning) return set(o, strokeAt(Math.atan2(ny, nx) + Math.PI / 2), 2, 0.95);
      const dash = (ang * ob.a * 9) / Math.PI;
      return dash - Math.floor(dash) < 0.6 ? set(o, "·", 2, 0.75) : false;
    }
  }
  return hash(id, 8) < 0.012 ? set(o, ".", 1, 0.5) : false;
};

/* ---------------------------------------------------------- Constellation */

const NODES: [number, number][] = [
  [-1.05, 0.28],
  [-0.62, -0.12],
  [-0.2, 0.05],
  [0.1, -0.52],
  [0.52, -0.25],
  [0.98, -0.62],
  [0.42, 0.32],
  [0.02, 0.72],
  [0.95, 0.55],
];
const EDGES: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [4, 6],
  [6, 7],
  [6, 8],
  [2, 7],
];

const constellation: BodyFn = (nx, ny, id, f, o) => {
  const tt = f.calm ? 0 : f.t;
  for (let k = 0; k < NODES.length; k++) {
    const d = Math.hypot(nx - NODES[k][0], (ny - NODES[k][1]) * 1.25);
    if (d < f.px * 0.75) return set(o, "*", 6, 0.75 + 0.25 * Math.sin(tt * 1.3 + k));
    if (d < f.px * 1.7 && hash(id, 9) < 0.6) return set(o, "·", 4, 0.6);
  }
  for (const [a, b] of EDGES) {
    const [x0, y0] = NODES[a];
    const [x1, y1] = NODES[b];
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len2 = dx * dx + dy * dy;
    const s = Math.max(0, Math.min(1, ((nx - x0) * dx + (ny - y0) * dy) / len2));
    const d = Math.hypot(nx - (x0 + dx * s), ny - (y0 + dy * s));
    if (d < f.px * 0.55) {
      /* Light travels along each line. */
      const m = s * Math.sqrt(len2) * 9 - tt * 0.9;
      if (m - Math.floor(m) < 0.72) return set(o, strokeAt(Math.atan2(dy, dx)), 2, 0.9);
      return false;
    }
  }
  /* The scanner reveals the faint members that make up the shape. */
  if (inScan(nx, ny, f) && hash(id, 21) > 0.955) {
    return set(o, hash(id, 22) > 0.7 ? "+" : "·", 4, 0.9);
  }
  return hash(id, 23) < 0.01 && Math.hypot(nx, ny) < 1.4 ? set(o, ".", 1, 0.5) : false;
};

export const BODIES: Record<BodyId, BodyFn> = {
  earth,
  nebula,
  blackhole,
  star,
  constellation,
};

/** How far each body reaches, in body units, for the loop bounds. */
export const EXTENT: Record<BodyId, number> = {
  earth: 1.1,
  nebula: 1.45,
  blackhole: 1.4,
  star: 1.45,
  constellation: 1.2,
};

/** Glyphs the scan wave writes as it passes. */
export const WAVE = [":", ";", "-", "=", "+", "×", "/", "\\", "|", "~", "*"];
