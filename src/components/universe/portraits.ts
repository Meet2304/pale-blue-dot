import type { BodyFn, BodyId, Cell } from "./bodies";
import { BODIES, EXTENT, hash, strokeAt } from "./bodies";
import { fbm3 } from "./noise";

/**
 * Portraits: the bodies drawn large and in detail, for the work menu, where
 * each has to say what it is with no map around it. The map keeps its own
 * renderers (bodies.ts), tuned to read at a distance; these use the same
 * glyphs and colours on a much finer grid, and add what makes each body
 * recognisable up close:
 *
 * - the star: the map's own (bodies.ts), with its warm glow, which Meet
 *   preferred to a more detailed portrait;
 * - the nebula: filaments of gas, dark lanes of dust, an irregular edge, and
 *   young stars shining out of it;
 * - the planet: a banded giant with a storm, rings with a gap in them, the
 *   rings' shadow across the disc, and a small moon;
 * - the constellation: a star chart of a figure everyone knows (the Plough),
 *   stars sized by brightness, joined by lines, over faint coordinate lines
 *   and the Milky Way;
 * - the black hole: drawn to feel enormous, its disk running off the edges
 *   of the frame, the far side lensed up over the shadow, the near side
 *   crossing in front of it, and the starlight behind bent into arcs.
 *
 * Each portrait has light under and over its glyphs (glows, diffraction
 * spikes), drawn on the canvas like the map's glows.
 *
 * Colour tiers, as in bodies.ts: 0 deep, 1 dim, 2 accent, 3 soft,
 * 4 near-white, 5 warm, 6 white.
 */

export type PortraitId = Exclude<BodyId, "earth">;

export type Light = (
  g: CanvasRenderingContext2D,
  o: {
    cx: number;
    cy: number;
    R: number;
    colors: string[];
    alpha: number;
    t: number;
    calm: boolean;
  },
) => void;

export type Portrait = {
  fn: BodyFn;
  /** The furthest a glyph can fall, in body radii. */
  extent: number;
  /** How far the body visibly reaches, across and down, for sizing it. */
  reach: [number, number];
  under?: Light;
  over?: Light;
  /** For a black hole: how strongly it bends the starlight behind it, as
      an Einstein radius in body radii. */
  lens?: number;
  /** Let the map's renderer lay its own light under the glyphs. */
  mapLight?: boolean;
  /** A fixed glyph cell width, in px, instead of one scaled to the body. */
  cell?: number;
};

const set = (o: Cell, c: string, k: number, a: number) => {
  o.c = c;
  o.k = k;
  o.a = a;
  return true;
};

const scanning = (nx: number, ny: number, f: Parameters<BodyFn>[3]) =>
  f.sr > 0 && (nx - f.sx) ** 2 + (ny - f.sy) ** 2 < f.sr * f.sr;

const smooth = (a: number, b: number, x: number) => {
  const k = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

const pick = (set: string[], id: number, t: number, calm: boolean, rate = 0.5) =>
  set[
    Math.floor(
      hash(id + 7, calm ? 0 : Math.floor(t * rate + hash(id, 1) * 3)) * set.length,
    )
  ];

const rgba = (hex: string, a: number) => {
  const v = parseInt(hex.slice(1), 16);
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`;
};

/* A point of light with four diffraction spikes, as a telescope sees a
   bright star. */
function sparkle(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  a: number,
) {
  const glow = g.createRadialGradient(x, y, 0, x, y, size);
  glow.addColorStop(0, rgba("#ffffff", a));
  glow.addColorStop(0.18, rgba(color, a * 0.55));
  glow.addColorStop(1, rgba(color, 0));
  g.fillStyle = glow;
  g.fillRect(x - size, y - size, size * 2, size * 2);
  g.lineWidth = 1;
  for (const [dx, dy] of [
    [1, 0],
    [0, 1],
  ]) {
    const len = size * 2.2;
    const grad = g.createLinearGradient(
      x - dx * len,
      y - dy * len,
      x + dx * len,
      y + dy * len,
    );
    grad.addColorStop(0, rgba(color, 0));
    grad.addColorStop(0.5, rgba("#ffffff", a * 0.9));
    grad.addColorStop(1, rgba(color, 0));
    g.strokeStyle = grad;
    g.beginPath();
    g.moveTo(x - dx * len, y - dy * len);
    g.lineTo(x + dx * len, y + dy * len);
    g.stroke();
  }
}

/* --------------------------------------------------------------- Nebula */

const GAS = [
  [".", "'", "`"],
  [":", "·", ","],
  [";", "~", "-"],
  ["=", "+", "≈"],
  ["≈", "=", "*"],
];

/* The young stars the gas is lit by, in body units, with brightness. */
const NEBULA_STARS: [number, number, number][] = [
  [-0.24, 0.02, 1],
  [0.62, -0.34, 0.7],
  [-0.86, 0.4, 0.55],
  [0.34, 0.5, 0.5],
  [0.05, -0.55, 0.42],
];

/* The gas field is the costly part (five layers of noise a cell), and it
   drifts slowly, so it is worked out four times a second and kept; the
   stars in it, the scanner and the glyphs still change every frame. */
let gasKey = "";
const gas = new Map<number, [number, number, number]>();

function gasAt(nx: number, ny: number, id: number, f: Parameters<BodyFn>[3]) {
  const key = `${f.px.toFixed(5)}|${f.seed}|${f.calm ? 0 : Math.floor(f.t * 4)}`;
  if (key !== gasKey) {
    gasKey = key;
    gas.clear();
  }
  const hit = gas.get(id);
  if (hit) return hit;
  const tt = f.calm ? 0 : Math.floor(f.t * 4) / 4;
  const s = f.seed * 7;
  let out: [number, number, number] = [0, 0, 0];
  /* An irregular edge: clouds, not a disc. */
  const edge =
    Math.hypot(nx / 1.5, ny / 1.1) + (fbm3(nx * 1.3 + s, ny * 1.3, 9.1, 3) - 0.5) * 1.1;
  if (edge < 1.35) {
    /* The gas is pushed around by itself (a domain warp): that is what
       draws it out into filaments and lanes rather than blobs. */
    const wx = fbm3(nx * 1.2 + s, ny * 1.2 + 2.3, tt * 0.015, 3) - 0.5;
    const wy = fbm3(nx * 1.2 + 5.7, ny * 1.2 + s, tt * 0.015 + 3.3, 3) - 0.5;
    const px = nx + wx * 1.8;
    const py = ny + wy * 1.8;
    const d = fbm3(px * 2 + s, py * 2, 1.1, 4);
    const ridge = 1 - Math.abs(2 * fbm3(px * 3 + 3, py * 3 + s, 4.2, 4) - 1);
    const fil = ridge ** 8;
    const dust = smooth(0.47, 0.57, fbm3(px * 2.4 + 11, py * 2.4 + s, 6.6, 3));
    const env = smooth(1.35, 0.15, edge);
    const core = Math.exp(-((nx + 0.24) ** 2 + (ny - 0.02) ** 2) * 3.5);
    const v = env * ((d - 0.48) * 3.6 + fil * 1.2 + core * 0.7) * (1 - 0.95 * dust);
    out = [v, fil, core];
  }
  gas.set(id, out);
  return out;
}

const nebula: BodyFn = (nx, ny, id, f, o) => {
  const [v, fil, core] = gasAt(nx, ny, id, f);
  if (v <= 0.04) return false;

  const hs = hash(id, 11);
  if (hs > 0.995 && v > 0.25) {
    const tw = f.calm ? 1 : 0.55 + 0.45 * Math.sin(f.t * 1.7 + id);
    return set(o, hs > 0.9985 ? "*" : "+", 6, tw);
  }
  if (scanning(nx, ny, f)) {
    const q = v * 10;
    if (Math.abs(q - Math.round(q)) < 0.1) return set(o, "~", 4, 0.95);
    return hash(id, 5) < 0.4 ? set(o, "·", 1, 0.4) : false;
  }
  /* The faintest gas is a haze, drawn sparsely. */
  if (v < 0.1) return hash(id, 6) < 0.3 ? set(o, ".", 0, 0.45) : false;
  const tier = v < 0.22 ? 0 : v < 0.4 ? 1 : v < 0.6 ? 2 : v < 0.85 ? 3 : 4;
  /* Filaments are drawn as waves, a step brighter, so the eye follows
     them; the heart of the cloud, where the young stars are, runs warm. */
  if (fil > 0.6 && tier >= 1)
    return set(o, "~", Math.min(4, tier + 1), 0.7 + tier * 0.07);
  const k = tier >= 3 && core > 0.55 ? 5 : tier;
  return set(o, pick(GAS[tier], id, f.t, f.calm), k, 0.5 + tier * 0.12);
};

const nebulaUnder: Light = (g, { cx, cy, R, colors, alpha }) => {
  for (const [x, y, rad, k, a] of [
    [-0.24, 0.02, 1.2, 2, 0.34],
    [0.55, -0.3, 0.8, 2, 0.18],
    [-0.75, 0.35, 0.75, 1, 0.26],
    [0.3, 0.45, 0.6, 2, 0.1],
  ] as const) {
    const x0 = cx + x * R;
    const y0 = cy + y * R;
    const gr = g.createRadialGradient(x0, y0, 0, x0, y0, rad * R);
    gr.addColorStop(0, rgba(colors[k], a * alpha));
    gr.addColorStop(1, rgba(colors[k], 0));
    g.fillStyle = gr;
    g.fillRect(x0 - rad * R, y0 - rad * R, rad * R * 2, rad * R * 2);
  }
};

const nebulaOver: Light = (g, { cx, cy, R, colors, alpha, t, calm }) => {
  NEBULA_STARS.forEach(([x, y, m], i) => {
    const tw = calm ? 1 : 0.8 + 0.2 * Math.sin(t * (1.1 + i * 0.3) + i);
    sparkle(
      g,
      cx + x * R,
      cy + y * R,
      (4 + m * 9) * Math.min(1.4, R / 90),
      colors[3],
      tw * alpha * (0.5 + m * 0.5),
    );
  });
};

/* --------------------------------------------------------------- Planet */

const RING_IN = 1.32;
const RING_OUT = 2.2;
const GAP = 1.82;
const FLAT = 0.24;
const TILT = -0.3;

const planet: BodyFn = (nx, ny, id, f, o) => {
  const tt = f.calm ? 0 : f.t;
  const c = Math.cos(TILT);
  const s = Math.sin(TILT);
  const rx = nx * c + ny * s;
  const ry = -nx * s + ny * c;
  const er = Math.hypot(rx, ry / FLAT);
  const ringAt = (e: number) =>
    e > RING_IN && e < RING_OUT && Math.abs(e - GAP) > 0.055 && Math.sin(e * 30) > -0.7;
  const ringGlyph = () => {
    const b = (1 - Math.abs(er - 1.6) / 0.62) * (er < GAP ? 1 : 0.75);
    /* The planet's shadow falls across the far side of the rings. */
    const shade = ry < 0 && rx > 0 && rx < 1 ? 0.35 : 1;
    const v = Math.max(0, b) * shade;
    return set(o, v > 0.6 ? "=" : v > 0.3 ? "-" : "·", v > 0.6 ? 3 : 2, 0.4 + v * 0.55);
  };

  /* A small moon, on its own slow orbit. */
  const ma = 2.4 + tt * 0.05;
  const mx = Math.cos(ma) * 2.05;
  const my = Math.sin(ma) * 0.45 - 0.62;
  const md = Math.hypot(nx - mx, ny - my);
  if (md < 0.13) {
    const lit = (-(nx - mx) * 0.62 - (ny - my) * 0.42) / 0.13;
    return set(o, lit > 0.2 ? "+" : lit > -0.3 ? ":" : "·", lit > 0 ? 4 : 2, 0.9);
  }

  const d2 = nx * nx + ny * ny;
  if (d2 > 1) {
    if (ringAt(er)) return ringGlyph();
    if (d2 < 1.1 && nx - ny < 0.3)
      return hash(id, 3) < 0.55 ? set(o, "·", 3, 0.5) : false;
    return false;
  }
  /* The near half of the rings crosses in front of the disc. */
  if (ry > 0 && ringAt(er)) return ringGlyph();

  const nz = Math.sqrt(1 - d2);
  const lambert = nx * -0.62 - ny * 0.42 + nz * 0.66;
  const lat = -ny;
  const lon = Math.atan2(nx, nz) + tt * 0.06;
  const turb = fbm3(lon * 1.5, lat * 4, f.seed, 3);
  const zone = Math.sin(lat * 11 + turb * 3.4) * 0.5 + 0.5;

  if (scanning(nx, ny, f)) {
    const q = lat * 11;
    if (Math.abs(q - Math.round(q)) < 0.14) return set(o, "-", 2, 1);
  }
  if (lambert < 0.02) return hash(id, 4) < 0.1 ? set(o, "·", 0, 0.8) : false;

  /* The storm: an oval that turns with the planet. */
  const sl = Math.atan2(Math.sin(lon - 0.7), Math.cos(lon - 0.7));
  const storm = Math.hypot(sl / 0.3, (lat + 0.34) / 0.12);
  const ringShadow = ringAt(Math.hypot(rx, (ry - 0.12) / FLAT)) && ry < 0.2;
  let b = Math.min(1, lambert * 1.1 + 0.05);
  if (ringShadow) b *= 0.4;
  if (storm < 1) {
    return set(o, storm > 0.7 ? "o" : storm > 0.35 ? "~" : ":", 5, 0.55 + b * 0.45);
  }
  const v = b * (0.5 + zone * 0.5);
  const ch = v > 0.72 ? "=" : v > 0.5 ? "≈" : v > 0.3 ? "~" : v > 0.15 ? "-" : "·";
  const k = zone > 0.66 ? (v > 0.6 ? 4 : 3) : zone > 0.33 ? 2 : v > 0.3 ? 2 : 1;
  return set(o, ch, k, 0.45 + v * 0.55);
};

const planetUnder: Light = (g, { cx, cy, R, colors, alpha }) => {
  const gr = R * 1.5;
  const grad = g.createRadialGradient(cx - R * 0.3, cy - R * 0.25, R * 0.2, cx, cy, gr);
  grad.addColorStop(0, rgba(colors[3], 0.16 * alpha));
  grad.addColorStop(1, rgba(colors[2], 0));
  g.fillStyle = grad;
  g.fillRect(cx - gr, cy - gr, gr * 2, gr * 2);
};

/* --------------------------------------------------------- Constellation */

/* The Plough (the Big Dipper), in body units, with each star's brightness:
   the figure most people can find in the sky. */
const PLOUGH: [number, number, number][] = [
  [-1.4, 0.34, 0.95], // Alkaid
  [-0.88, 0.06, 0.8], // Mizar
  [-0.46, 0.0, 1], // Alioth
  [0.02, 0.06, 0.45], // Megrez
  [0.12, 0.58, 0.72], // Phecda
  [0.9, 0.5, 0.76], // Merak
  [0.96, -0.1, 0.98], // Dubhe
];
const PLOUGH_LINES: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [6, 3],
];
/* Alcor, Mizar's faint companion. */
const ALCOR: [number, number] = [-0.8, -0.06];

/* The chart's coordinate lines: circles of declination around a pole
   below the figure, and hour lines running out from it. */
const POLE: [number, number] = [0.1, 3.4];

const constellation: BodyFn = (nx, ny, id, f, o) => {
  const tt = f.calm ? 0 : f.t;
  const cell = Math.max(f.px, f.py);

  for (let k = 0; k < PLOUGH.length; k++) {
    const [x, y, m] = PLOUGH[k];
    const dx = (nx - x) / f.px;
    const dy = (ny - y) / f.py;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
      const tw = 0.85 + 0.15 * Math.sin(tt * 1.3 + k * 1.9);
      return set(o, m > 0.7 ? "*" : "+", 6, tw);
    }
    const d = Math.hypot(dx, dy * 1.7);
    const halo = 1.2 + m * 2.2;
    if (d < halo && hash(id, 9 + k) < 0.8 * (1 - d / halo)) return set(o, "·", 4, 0.75);
  }
  if (Math.abs(nx - ALCOR[0]) < f.px * 0.5 && Math.abs(ny - ALCOR[1]) < f.py * 0.5) {
    return set(o, "·", 6, 0.8);
  }

  for (const [a, b] of PLOUGH_LINES) {
    const [x0, y0] = PLOUGH[a];
    const [x1, y1] = PLOUGH[b];
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len2 = dx * dx + dy * dy;
    const s0 = Math.max(0, Math.min(1, ((nx - x0) * dx + (ny - y0) * dy) / len2));
    const d = Math.hypot(nx - (x0 + dx * s0), ny - (y0 + dy * s0));
    /* Lines stop short of the stars, as on a chart. */
    const clear = 0.06 / Math.sqrt(len2);
    if (d < cell * 0.5 && s0 > clear && s0 < 1 - clear) {
      const pulse = s0 - ((tt * 0.3 + a * 0.23) % 1.5);
      const on = pulse < 0 && pulse > -0.18;
      return set(o, strokeAt(Math.atan2(dy, dx)), on ? 4 : 3, on ? 1 : 0.8);
    }
  }

  if (scanning(nx, ny, f) && hash(id, 21) > 0.9) {
    return set(o, hash(id, 22) > 0.7 ? "+" : "·", 4, 0.9);
  }

  /* The chart's grid, dotted and faint. */
  const px = nx - POLE[0];
  const py = ny - POLE[1];
  const rp = Math.hypot(px, py);
  const ring = (rp - 2.4) / 0.62;
  if (Math.abs(ring - Math.round(ring)) * 0.62 < cell * 0.45 && hash(id, 27) < 0.5) {
    return set(o, "·", 1, 0.5);
  }
  const hour = (Math.atan2(px, -py) / Math.PI) * 7;
  if (
    Math.abs(hour - Math.round(hour)) * rp * (Math.PI / 7) < cell * 0.45 &&
    hash(id, 28) < 0.4
  ) {
    return set(o, "·", 1, 0.45);
  }

  /* The Milky Way behind, a soft band of dust and faint stars. */
  const band = Math.abs(
    ny * 0.85 - nx * 0.5 - 0.5 + 0.12 * Math.sin(nx * 2 + f.seed * 9),
  );
  const dust = fbm3(nx * 2.4 + f.seed * 5, ny * 2.4, 0.3, 3);
  const density = Math.exp(-band * band * 5) * (0.3 + dust);
  if (hash(id, 23) < density * 0.28) {
    const bright = hash(id, 24);
    return set(
      o,
      bright > 0.93 ? "+" : bright > 0.7 ? ":" : ".",
      bright > 0.93 ? 4 : 1,
      0.45 + bright * 0.35,
    );
  }
  return false;
};

const constellationOver: Light = (g, { cx, cy, R, colors, alpha, t, calm }) => {
  const scale = Math.min(1.4, R / 80);
  PLOUGH.forEach(([x, y, m], i) => {
    const tw = calm ? 1 : 0.85 + 0.15 * Math.sin(t * 1.3 + i * 1.9);
    if (m > 0.7)
      sparkle(
        g,
        cx + x * R,
        cy + y * R,
        (3 + m * 6) * scale,
        colors[3],
        tw * alpha * 0.8,
      );
  });
};

/* ----------------------------------------------------------- Black hole */

/**
 * Drawn to feel as large as it is. The accretion disk is too big for the
 * frame and runs off both edges; its gas streams round in turbulent bands,
 * far brighter on the side turning toward us. The far side of the disk is
 * lensed up over the shadow into a full arc, and under it into a thin one.
 * A bright photon ring sits on the shadow's edge, a fainter one just
 * outside. The starlight behind is bent too (see `lens`): stars near the
 * hole are pushed outward and stretched into arcs, so the gravity shows in
 * the sky itself.
 */
const RS = 0.36;

const blackhole: BodyFn = (nx, ny, id, f, o) => {
  const r = Math.hypot(nx, ny);
  if (r > 3.4) return false;
  const tt = f.calm ? 0 : f.t;
  const ang = Math.atan2(ny, nx);
  /* Doppler beaming: the side of the disk coming toward us (the left) is
     much brighter than the side going away. */
  const beam = (c: number) => Math.max(0.25, 1 - 0.75 * c);

  /* The near side of the disk: thin, flaring a little with distance,
     crossing in front of everything. */
  const rr = Math.hypot(nx, ny / (0.085 + 0.025 * Math.abs(nx)));
  /* Over the top half it hides behind the shadow; the lower half passes
     in front, right across it, which is the black hole's signature. */
  const behind = ny < 0 && r < RS * 1.25;
  const inner = ny >= 0 ? RS * 0.2 : RS * 1.15;
  if (rr > inner && rr < 3.3 && !behind) {
    const heat = Math.pow(Math.max(0, 1 - Math.max(0, rr - RS) / 3), 1.5);
    const swirl = fbm3(nx * 2.5 - tt * 0.18 * Math.sign(nx || 1), rr * 3, tt * 0.05, 2);
    const bands = 0.6 + 0.4 * Math.sin(rr * 20 - tt * 1.1 + swirl * 5);
    const b =
      heat * beam(nx / Math.max(rr, 0.3)) * bands * Math.min(1, (3.3 - rr) / 0.6);
    if (b > 0.05) {
      if (b > 0.95) return set(o, "=", 6, 1);
      if (b > 0.62) return set(o, "=", 5, 0.95);
      if (b > 0.36) return set(o, "-", 5, 0.88);
      if (b > 0.17) return set(o, "-", 3, 0.75);
      return hash(id, 4) < 0.65 ? set(o, "·", 2, 0.6) : false;
    }
  }

  if (r < RS + 0.03) return false;

  /* The far side of the disk, lensed: a broad arc over the shadow and a
     thin one under it. Its light flows round the hole, so it is drawn in
     strokes along the flow. */
  const top = ny < 0;
  const width = top ? 0.78 : 0.2;
  const k = Math.max(0, 1 - (r - RS) / width);
  if (k > 0) {
    const flow = 0.62 + 0.38 * Math.sin(ang * 7 - tt * 1.4 + (r - RS) * 22);
    const b = Math.pow(k, 1.15) * (top ? 1 : 0.8) * beam(Math.cos(ang)) * flow;
    if (b > 0.05 && hash(id, 13) < 0.6 + b) {
      const glyph = b > 0.5 ? strokeAt(ang + Math.PI / 2) : b > 0.28 ? ":" : "·";
      return set(
        o,
        glyph,
        b > 0.72 ? 6 : b > 0.45 ? 5 : b > 0.25 ? 4 : 3,
        0.55 + b * 0.45,
      );
    }
  }

  /* The second photon ring: faint, just outside the first. */
  if (Math.abs(r - RS * 1.16) < f.px * 0.6 && hash(id, 33) < 0.7) {
    return set(o, strokeAt(ang + Math.PI / 2), 4, 0.6);
  }

  if (scanning(nx, ny, f)) {
    const q = Math.log(r) * 7;
    if (Math.abs(q - Math.round(q)) < 0.1) return set(o, "·", 2, 0.9);
  }
  return false;
};

const blackholeUnder: Light = (g, { cx, cy, R, colors, alpha, t, calm }) => {
  const pulse = calm ? 1 : 0.92 + 0.08 * Math.sin(t * 0.7);
  /* The disk's glow: wide and flat, like the disk. */
  g.save();
  const gr = R * 3.4;
  const grad = g.createRadialGradient(cx, cy, 0, cx, cy, gr);
  grad.addColorStop(0, rgba(colors[5], 0.34 * alpha * pulse));
  grad.addColorStop(0.25, rgba(colors[5], 0.14 * alpha));
  grad.addColorStop(1, rgba(colors[5], 0));
  g.translate(cx, cy);
  g.scale(1, 0.3);
  g.translate(-cx, -cy);
  g.fillStyle = grad;
  g.fillRect(cx - gr, cy - gr, gr * 2, gr * 2);
  g.restore();
  /* The lensed light hugging the shadow, fuller over the top. */
  g.save();
  const halo = g.createRadialGradient(cx, cy, R * RS, cx, cy, R * 1.3);
  halo.addColorStop(0, rgba("#ffe6c0", 0.55 * alpha * pulse));
  halo.addColorStop(0.18, rgba(colors[5], 0.24 * alpha));
  halo.addColorStop(1, rgba(colors[5], 0));
  g.translate(cx, cy);
  g.scale(1, 0.92);
  g.translate(-cx, -cy);
  g.fillStyle = halo;
  g.fillRect(cx - R * 1.3, cy - R * 1.3, R * 2.6, R * 2.6);
  g.restore();
  /* The shadow: nothing comes back from inside it. */
  g.fillStyle = `rgba(0,0,0,${alpha})`;
  g.beginPath();
  g.arc(cx, cy, R * RS, 0, Math.PI * 2);
  g.fill();
};

/* The photon ring: a thin circle of light with a bloom, right at the edge
   of the shadow, brightest on the side coming toward us. */
const blackholeOver: Light = (g, { cx, cy, R, colors, alpha }) => {
  g.save();
  const ring = g.createLinearGradient(cx - R * RS, cy, cx + R * RS, cy);
  ring.addColorStop(0, rgba("#ffffff", alpha));
  ring.addColorStop(1, rgba("#ffe6c0", 0.6 * alpha));
  g.strokeStyle = ring;
  g.lineWidth = Math.max(1.2, R * 0.014);
  g.shadowColor = rgba(colors[5], alpha);
  g.shadowBlur = R * 0.12;
  g.beginPath();
  g.arc(cx, cy, R * (RS + 0.012), 0, Math.PI * 2);
  g.stroke();
  g.restore();
};

export const PORTRAITS: Record<PortraitId, Portrait> = {
  /* The star is the map's own, as it was in the first version of this
     menu: Meet preferred it to a more detailed portrait. */
  sun: {
    fn: BODIES.sun,
    extent: EXTENT.sun,
    reach: [1.9, 1.9],
    mapLight: true,
    cell: 4.6,
  },
  nebula: {
    fn: nebula,
    extent: 2.2,
    reach: [1.55, 1.2],
    under: nebulaUnder,
    over: nebulaOver,
  },
  planet: { fn: planet, extent: 2.8, reach: [2.3, 1.45], under: planetUnder },
  constellation: {
    fn: constellation,
    extent: 2.4,
    reach: [1.6, 1.05],
    over: constellationOver,
  },
  blackhole: {
    fn: blackhole,
    extent: 3.4,
    reach: [1.25, 1.05],
    under: blackholeUnder,
    over: blackholeOver,
    lens: 0.75,
  },
};
