import { mulberry32 } from "./helpers";
import { fbm3 } from "./noise";

/**
 * The deep sky around the pale blue dot: what the camera finds when it pulls
 * all the way back from Earth.
 *
 *   - along the bottom, cliffs of dust with lit edges and pillars rising out
 *     of them, and glowing gas streaming up off them into the dark;
 *   - above them, a young cluster of hot blue stars that lights the cliffs;
 *   - a grand spiral galaxy looming over the dot, a smaller one far off, a
 *     galaxy seen edge on with its dust lane, a few ellipticals, a ring
 *     nebula, a globular cluster;
 *   - a cloud of hydrogen in the upper left, and a deep field of faint, far
 *     galaxies and stars behind everything;
 *   - and Earth, one pale blue point, in a dark pocket of its own.
 *
 * Nothing turns. The sky is alive the way the terminal is: every character
 * re-decides itself on its own slow clock, the gas breathes in patches, the
 * dithered glow under the characters sparkles, and the stars twinkle. And it
 * answers the visitor's pointer, without ever showing it (see "The stir").
 *
 * The whole of it fades out towards a soft oval edge, so that from far
 * enough away it is one patch of light in the dark: everything so far, and
 * the void around it.
 *
 * The light is measured once into a texture over a fixed patch of the world
 * (Earth at the origin, in Earth radii), a few rows a frame so building it
 * never stalls the page. Every frame, two layers read it through the camera:
 * an ordered dither of the glow, on a fine screen grid, and characters, on
 * the terminal's grid, their glyph chosen by the same dither.
 */

/* The patch of sky the texture covers, in world units, and its resolution. */
const X0 = -1000;
const Y0 = -800;
const X1 = 1000;
const Y1 = 900;
const STEP = 4;
const COLS = Math.ceil((X1 - X0) / STEP);
const ROWS = Math.ceil((Y1 - Y0) / STEP);

/* Every colour the sky is drawn in. */
const PALETTE = [
  "#7d6fc9", // 0 violet: the faint outer gas
  "#62d0c4", // 1 teal: ionised oxygen
  "#a8c6ff", // 2 ice: galaxy arms, hot young stars
  "#ff88b2", // 3 rose: hydrogen
  "#ffb36d", // 4 amber: the lit edges of the dust
  "#ffe4b8", // 5 cream: galaxy cores
  "#f5f7ff", // 6 white
  "#b35a3c", // 7 ember: the dust itself, faintly lit from behind
];
const RGB = PALETTE.map((hex) => {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255] as const;
});

/* What a cell is made of, which sets its glyphs. */
const GAS = 0;
const LIGHT = 1;
const DUST = 2;
/* Per kind, per level, the glyphs a cell may show; which one it shows is
   re-decided on its own clock, so dense gas never settles into stripes. */
const RAMPS = [
  [["."], ["·", "."], [":", "·"], ["~", ":", "-"], ["~", "≈", ";"], ["≈", "=", "~"]],
  [["."], ["·"], [":", "·"], ["+", ":"], ["*", "+"], ["*"]],
  [["."], [",", "."], ["·", ","], [":", ";"], [";", ":"], [";"]],
];
const GLYPH_ALPHA = [0.24, 0.36, 0.5, 0.66, 0.82, 1];

/* A 4 × 4 Bayer matrix: the ordered dither both layers share. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(
  (v) => (v + 0.5) / 16,
);

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a: number, b: number, v: number) => {
  const k = clamp01((v - a) / (b - a));
  return k * k * (3 - 2 * k);
};

type Star = {
  x: number;
  y: number;
  b: number;
  rate: number;
  p: number;
  tint: number;
  /** A draw of its own, 0 to 1: far out, only the stars below a bound show. */
  r: number;
  /** How far in from the sky's soft edge it is, 0 to 1. */
  w: number;
};
type Flare = { x: number; y: number; m: number; tint: number; p: number };

export type Cosmos = {
  /** Summed light per texel. */
  I: Float32Array;
  /** The brightest single source per texel, which decides its colour. */
  top: Float32Array;
  col: Uint8Array;
  kind: Uint8Array;
  /** How much dust sits in front, 0 to 1: it hides what is behind. */
  dust: Float32Array;
  /** Where each patch of gas is in its slow breath, in 64ths of a turn. */
  ph: Uint8Array;
  /** Rows of gas measured so far; objects go in once all are. */
  built: number;
  /** When the texture was finished (ms), for a soft first appearance. */
  readyAt: number;
  stars: Star[];
  flares: Flare[];
  dither: { canvas: HTMLCanvasElement; img: ImageData } | null;
  /** The glow and the characters, drawn together offscreen (see drawCosmos). */
  layer: {
    canvas: HTMLCanvasElement;
    g: CanvasRenderingContext2D;
    at: number;
    key: string;
  } | null;
  stir: Stir;
};

export function createCosmos(): Cosmos {
  const n = COLS * ROWS;
  const rnd = mulberry32(23);
  const stars: Star[] = [];
  const tints = (r: number) => (r < 0.7 ? 6 : r < 0.85 ? 2 : r < 0.95 ? 5 : 3);

  /* The deep field. */
  for (let i = 0; i < 2600; i++) {
    stars.push({
      x: X0 + rnd() * (X1 - X0),
      y: Y0 + rnd() * (Y1 - Y0),
      b: 0.18 + Math.pow(rnd(), 3) * 0.8,
      rate: 0.5 + rnd() * 2,
      p: rnd() * Math.PI * 2,
      tint: tints(rnd()),
      r: 0,
      w: 1,
    });
  }
  const gauss = () =>
    Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
  /* A globular cluster: an old, dense ball of stars. */
  for (let i = 0; i < 240; i++) {
    stars.push({
      x: GLOBULAR.x + gauss() * GLOBULAR.s,
      y: GLOBULAR.y + gauss() * GLOBULAR.s,
      b: 0.3 + rnd() * 0.55,
      rate: 0.6 + rnd() * 1.6,
      p: rnd() * Math.PI * 2,
      tint: rnd() < 0.7 ? 5 : 6,
      r: 0,
      w: 1,
    });
  }
  /* The young cluster over the cliffs: few stars, hot and bright. */
  for (let i = 0; i < 34; i++) {
    stars.push({
      x: YOUNG.x + gauss() * YOUNG.s,
      y: YOUNG.y + gauss() * YOUNG.s * 0.8,
      b: 0.55 + rnd() * 0.45,
      rate: 0.8 + rnd() * 2,
      p: rnd() * Math.PI * 2,
      tint: rnd() < 0.65 ? 2 : 6,
      r: 0,
      w: 1,
    });
  }
  /* The star at the heart of the ring nebula. */
  stars.push({ x: RING.x, y: RING.y, b: 0.9, rate: 1.1, p: 0, tint: 6, r: 0, w: 1 });
  /* The brightest are the last to drop out far away. */
  for (const st of stars) {
    st.r = rnd() * (1.2 - st.b * 0.6);
    st.w = islandAt(st.x, st.y);
  }

  return {
    I: new Float32Array(n),
    top: new Float32Array(n),
    col: new Uint8Array(n),
    kind: new Uint8Array(n),
    dust: new Float32Array(n),
    ph: new Uint8Array(n),
    built: 0,
    readyAt: 0,
    stars,
    flares: FLARES.map((f, i) => ({ ...f, p: i * 1.9 })),
    dither: null,
    layer: null,
    stir: createStir(),
  };
}

/* ------------------------------------------------------------ The layout */

/* The sky's soft oval edge: 1 well inside it, 0 at the texture's rim. */
const islandAt = (x: number, y: number) =>
  1 - smooth(0.72, 1, Math.hypot(x / 1000, (y - 50) / 850));

/* Where everything is, in Earth radii from Earth. On a wide screen the view
   is about 1000 across, Earth sits right of centre, and the copy takes the
   left third, so the left is kept quiet. */
const GLOBULAR = { x: -215, y: 75, s: 10 };
const YOUNG = { x: 175, y: 92, s: 30 };
const RING = { x: 262, y: 30, R: 15 };

/* Foreground stars bright enough to show the telescope's spikes. */
const FLARES = [
  { x: 214, y: 84, m: 1, tint: 2 },
  { x: 128, y: 128, m: 0.62, tint: 6 },
  { x: -118, y: -64, m: 0.55, tint: 5 },
  { x: -12, y: -262, m: 0.45, tint: 6 },
  { x: -282, y: -152, m: 0.7, tint: 5 },
  { x: -395, y: 248, m: 0.55, tint: 2 },
  { x: 86, y: 232, m: 0.5, tint: 6 },
  { x: 330, y: -250, m: 0.6, tint: 2 },
];

type Spiral = {
  x: number;
  y: number;
  R: number;
  pa: number;
  incl: number;
  pitch: number;
  seed: number;
  gain: number;
};
const SPIRALS: Spiral[] = [
  { x: 195, y: -178, R: 168, pa: -0.46, incl: 0.5, pitch: 0.31, seed: 1.3, gain: 1 },
  { x: -335, y: -255, R: 44, pa: 1.1, incl: 0.78, pitch: 0.36, seed: 4.1, gain: 0.55 },
];
const EDGE_ON = { x: -165, y: -212, L: 44, pa: 0.34 };
const ELLIPTICALS = [
  { x: -62, y: -126, R: 11, e: 0.72, pa: 0.5, gain: 0.8 },
  { x: -430, y: 175, R: 18, e: 0.6, pa: -0.3, gain: 0.5 },
  { x: 318, y: -92, R: 7, e: 0.8, pa: 1.2, gain: 0.6 },
];

/* The cliffs: a ridge along the bottom, with pillars rising out of it. */
const PILLARS = [
  { x: -150, h: 55, w: 30 },
  { x: 58, h: 112, w: 20 },
  { x: 118, h: 48, w: 26 },
  { x: 236, h: 92, w: 17 },
  { x: 350, h: 140, w: 15 },
];

function ridgeAt(x: number, y: number) {
  let r = 188 + 62 * Math.sin(x / 250 + 0.7) + 22 * Math.sin(x / 91 + 2);
  /* It sinks away on the left, under the copy. */
  if (x < -260) r += (-260 - x) * 0.45;
  const xs = x + 9 * Math.sin(y * 0.06);
  for (const p of PILLARS) r -= p.h * Math.exp(-(((xs - p.x) / p.w) ** 2));
  return r + (fbm3(x * 0.014, y * 0.014, 4.2, 3) - 0.5) * 58;
}

/* ------------------------------------------------------------- Measuring */

/**
 * Measure a few more rows of the sky, for at most `budget` ms. Returns true
 * once the texture is finished.
 */
export function buildCosmos(c: Cosmos, budget: number, now: number) {
  if (c.readyAt) return true;
  const start = performance.now();
  while (c.built < ROWS) {
    gasRow(c, c.built++);
    if (performance.now() - start > budget) return false;
  }
  for (const sp of SPIRALS) splatSpiral(c, sp);
  splatEdgeOn(c);
  for (const el of ELLIPTICALS) splatElliptical(c, el);
  splatRing(c);
  splatGlobularGlow(c);
  splatDeepField(c);
  c.readyAt = now;
  return true;
}

function gasRow(c: Cosmos, row: number) {
  const y = Y0 + (row + 0.5) * STEP;
  for (let col = 0; col < COLS; col++) {
    const x = X0 + (col + 0.5) * STEP;
    const i = row * COLS + col;

    /* Fade out towards the soft oval edge, so it never ends in a line. */
    const edge = islandAt(x, y);
    /* Earth sits in a dark pocket, so the dot is never lost in the glow. */
    const pocket = 0.2 + 0.8 * smooth(22, 95, Math.hypot(x, y));

    const qx = fbm3(x * 0.004, y * 0.004, 1.1, 2);
    const qy = fbm3(x * 0.004 + 5.2, y * 0.004 + 1.3, 1.1, 2);
    const n = fbm3(x * 0.0062 + qx * 2.4, y * 0.0062 + qy * 2.4, 2.7, 4);
    /* Filaments: the ridges of a second, finer noise, warped the same way. */
    const fil = Math.pow(
      1 - Math.abs(2 * fbm3(x * 0.011 + qx * 3, y * 0.011 + qy * 3, 6.6, 4) - 1),
      7,
    );
    const hueN = fbm3(x * 0.005, y * 0.005, 7.3, 2);

    const d = y - ridgeAt(x, y);
    let best = 0;
    let col_ = 0;
    let kind = GAS;
    let sum = 0;
    let dust = 0;

    if (d > 0) {
      /* Inside the dust: dark, but faintly lit from behind. */
      dust = smooth(0, 26, d);
      const glow = 0.13 * Math.exp(-d / 70) * (0.45 + n);
      sum += glow;
      best = glow;
      col_ = 7;
      kind = DUST;
    }
    /* The lit edge, brightest where the young stars look down on it. */
    const rimN = fbm3(x * 0.03, y * 0.03, 5.5, 3);
    const lit = 0.7 + 0.6 * Math.exp(-(((x - YOUNG.x) / 260) ** 2));
    const rim = Math.exp(-((d / 8) ** 2)) * (0.35 + rimN * 1.1) * lit;
    if (rim > 0.02) {
      sum += rim;
      if (rim > best) {
        best = rim;
        col_ = rim > 0.85 ? 5 : 4;
        kind = GAS;
      }
    }
    if (d < 0) {
      const u = -d;
      /* Gas streaming up off the cliffs, then the wide glow above. */
      const steam =
        Math.exp(-u / 38) *
        Math.max(0, fbm3(x * 0.026, y * 0.075, 6.1, 3) - 0.42) *
        2.4 *
        lit;
      /* Right above the ridge is the steam's; the wide glow starts higher. */
      const gas =
        Math.exp(-u / 230) *
        smooth(0, 45, u) *
        (Math.max(0, n - 0.4) * 2.2 + fil * 0.75 * smooth(0.3, 0.55, n));
      sum += steam + gas;
      if (steam > best) {
        best = steam;
        col_ = hueN > 0.5 ? 4 : 3;
        kind = GAS;
      }
      if (gas > best) {
        best = gas;
        const hp = u / 300 + (hueN - 0.5) * 0.9;
        col_ =
          Math.hypot(x - YOUNG.x, y - YOUNG.y) < 110 && n > 0.55
            ? 2
            : hp < 0.14
              ? 3
              : hp < 0.72
                ? 1
                : 0;
        kind = GAS;
      }
    }

    /* A cloud of hydrogen in the upper left, thin and wide. */
    const e = ((x + 390) / 360) ** 2 + ((y + 300) / 220) ** 2;
    if (e < 5) {
      const n2 = fbm3(x * 0.007 + qx * 3, y * 0.007 + qy * 3, 9.1, 4);
      const ha =
        Math.exp(-e) *
        (Math.max(0, n2 - 0.52) * 1.1 + fil * 0.6 * smooth(0.4, 0.62, n2));
      sum += ha;
      if (ha > best) {
        best = ha;
        col_ = 3;
        kind = GAS;
      }
    }

    const k = edge * pocket;
    c.I[i] = Math.min(1.5, sum * k);
    c.top[i] = best * k;
    c.col[i] = col_;
    c.kind[i] = kind;
    c.dust[i] = dust;
    c.ph[i] = Math.floor(fbm3(x * 0.01, y * 0.01, 3.3, 2) * 192) & 63;
  }
}

/** Add a source's light to the texture over a box, behind the dust. */
function splat(
  c: Cosmos,
  x: number,
  y: number,
  reach: number,
  at: (x: number, y: number) => number,
  colour: (x: number, y: number, v: number) => number,
) {
  const c0 = Math.max(0, Math.floor((x - reach - X0) / STEP));
  const c1 = Math.min(COLS - 1, Math.ceil((x + reach - X0) / STEP));
  const r0 = Math.max(0, Math.floor((y - reach - Y0) / STEP));
  const r1 = Math.min(ROWS - 1, Math.ceil((y + reach - Y0) / STEP));
  for (let row = r0; row <= r1; row++) {
    const wy = Y0 + (row + 0.5) * STEP;
    for (let col = c0; col <= c1; col++) {
      const wx = X0 + (col + 0.5) * STEP;
      const i = row * COLS + col;
      const v = at(wx, wy) * (1 - 0.92 * c.dust[i]) * islandAt(wx, wy);
      if (v < 0.01) continue;
      c.I[i] = Math.min(1.5, c.I[i] + v);
      if (v > c.top[i]) {
        c.top[i] = v;
        c.col[i] = colour(wx, wy, v);
        c.kind[i] = LIGHT;
      }
    }
  }
}

/* A frame for a source: position along and across its long axis. */
const frame = (x: number, y: number, o: { x: number; y: number; pa: number }) => {
  const dx = x - o.x;
  const dy = y - o.y;
  const cs = Math.cos(o.pa);
  const sn = Math.sin(o.pa);
  return [dx * cs + dy * sn, -dx * sn + dy * cs] as const;
};

function splatSpiral(c: Cosmos, g: Spiral) {
  const tp = Math.tan(g.pitch);
  const at = (x: number, y: number) => {
    const [a, b] = frame(x, y, g);
    const u = a / g.R;
    const v = b / g.incl / g.R;
    const r = Math.hypot(u, v);
    if (r > 1.3) return 0;
    const th = Math.atan2(v, u);
    const phase = th - Math.log(Math.max(r, 0.03)) / tp;
    const arm = Math.pow(0.5 + 0.5 * Math.cos(2 * phase), 3);
    const lane = Math.pow(0.5 + 0.5 * Math.cos(2 * (phase + 0.45)), 7);
    const n = fbm3(u * 6 + g.seed, v * 6, 1.3, 3);
    const bulge = Math.exp(-((r / 0.09) ** 2)) * 1.05;
    const disk =
      Math.exp(-r / 0.5) * (0.04 + 1.5 * arm) * (0.5 + n) * smooth(1.3, 0.95, r);
    const dust = lane * Math.exp(-r / 0.6) * 0.55 * (r > 0.12 ? 1 : 0);
    const knot = arm > 0.6 && r > 0.15 && r < 0.9 && n > 0.63 ? (n - 0.63) * 4 : 0;
    return Math.max(0, bulge + disk - dust + knot) * g.gain;
  };
  const colour = (x: number, y: number, v: number) => {
    const [a, b] = frame(x, y, g);
    const r = Math.hypot(a / g.R, b / g.incl / g.R);
    const n = fbm3((a / g.R) * 6 + g.seed, (b / g.incl / g.R) * 6, 1.3, 3);
    if (r < 0.16) return v > 0.95 ? 6 : 5;
    if (n > 0.66 && r < 0.9) return 3;
    return v > 0.95 ? 6 : 2;
  };
  splat(c, g.x, g.y, g.R * 1.3, at, colour);
}

function splatEdgeOn(c: Cosmos) {
  const g = EDGE_ON;
  splat(
    c,
    g.x,
    g.y,
    g.L * 1.2,
    (x, y) => {
      const [a, b] = frame(x, y, g);
      const u = a / g.L;
      const v = b / g.L;
      const disk = Math.exp(-Math.abs(v) / 0.05) * Math.exp(-Math.abs(u) * 2.4) * 1.1;
      const bulge = Math.exp(-(u * u + (v / 0.6) ** 2) / 0.014) * 1.1;
      const lane =
        1 - 0.9 * Math.exp(-((v / 0.014) ** 2)) * (Math.abs(u) < 0.85 ? 1 : 0);
      return (disk + bulge) * lane * 0.85;
    },
    (x, y) => {
      const [a] = frame(x, y, g);
      return Math.abs(a / g.L) < 0.18 ? 5 : 4;
    },
  );
}

function splatElliptical(
  c: Cosmos,
  g: { x: number; y: number; R: number; e: number; pa: number; gain: number },
) {
  splat(
    c,
    g.x,
    g.y,
    g.R * 2.4,
    (x, y) => {
      const [a, b] = frame(x, y, g);
      const r = Math.hypot(a, b / g.e) / g.R;
      return Math.exp(-r * 2.4) * 1.2 * g.gain;
    },
    (_x, _y, v) => (v > 0.45 ? 5 : 4),
  );
}

function splatRing(c: Cosmos) {
  const g = RING;
  splat(
    c,
    g.x,
    g.y,
    g.R * 1.6,
    (x, y) => {
      const r = Math.hypot(x - g.x, (y - g.y) / 0.84) / g.R;
      const n = fbm3(x * 0.2, y * 0.2, 8.8, 2);
      const ring = Math.exp(-(((r - 0.72) / 0.17) ** 2)) * (0.7 + 0.6 * n);
      const inner = Math.exp(-((r / 0.5) ** 2)) * 0.32;
      const halo = Math.exp(-(((r - 1.1) / 0.18) ** 2)) * 0.18;
      return ring + inner + halo;
    },
    (x, y) => {
      const r = Math.hypot(x - g.x, (y - g.y) / 0.84) / g.R;
      return r < 0.64 ? 1 : 3;
    },
  );
}

function splatGlobularGlow(c: Cosmos) {
  const g = GLOBULAR;
  splat(
    c,
    g.x,
    g.y,
    g.s * 3.5,
    (x, y) => Math.exp(-((Math.hypot(x - g.x, y - g.y) / g.s) ** 2) * 0.8) * 0.5,
    () => 5,
  );
}

/* Faint, far galaxies: small smudges everywhere, most of them reddened by
   the distance their light has come. */
function splatDeepField(c: Cosmos) {
  const rnd = mulberry32(41);
  for (let i = 0; i < 130; i++) {
    const x = X0 + 120 + rnd() * (X1 - X0 - 240);
    const y = Y0 + 120 + rnd() * (Y1 - Y0 - 240);
    const s = 2 + Math.pow(rnd(), 2) * 6;
    const e = 0.3 + rnd() * 0.7;
    const pa = rnd() * Math.PI;
    const gain = 0.35 + rnd() * 0.5;
    const tone = rnd();
    const colour = tone < 0.55 ? 4 : tone < 0.8 ? 5 : 2;
    if (Math.hypot(x, y) < 90) continue;
    const o = { x, y, pa };
    splat(
      c,
      x,
      y,
      s * 2.5,
      (wx, wy) => {
        const [a, b] = frame(wx, wy, o);
        return Math.exp(-((Math.hypot(a, b / e) / s) ** 2) * 1.6) * gain;
      },
      () => colour,
    );
  }
}

/* --------------------------------------------------------------- Drawing */

/* Reused buckets: colour × glyph level. */
const BUCKETS = PALETTE.length * GLYPH_ALPHA.length;
const bx: number[][] = Array.from({ length: BUCKETS }, () => []);
const by: number[][] = Array.from({ length: BUCKETS }, () => []);
const bc: string[][] = Array.from({ length: BUCKETS }, () => []);

export type CosmosCam = { x: number; y: number; z: number; ax: number; ay: number };

type Box = { x0: number; y0: number; x1: number; y1: number };

export function drawCosmos(
  g: CanvasRenderingContext2D,
  c: Cosmos,
  o: {
    cam: CosmosCam;
    w: number;
    h: number;
    t: number;
    dt: number;
    now: number;
    alpha: number;
    calm: boolean;
    narrow: boolean;
    mono: string;
    dpr: number;
    /** The camera's zoom against the sky's own framing: below 1 is further out. */
    far: number;
    /** Where the visitor's pointer is over the canvas, if it is. */
    pointer: { x: number; y: number; in: boolean };
  },
) {
  if (!c.readyAt) return;
  const alpha = o.alpha * (o.calm ? 1 : clamp01((o.now - c.readyAt) / 900));
  if (alpha < 0.01) return;
  stirStep(c, o);

  /* The glow and the characters are the costly part, and they change only
     a few times a second (a cell re-decides every 1.4 s or more, the
     sparkle ticks three times a second). So they are drawn offscreen, and
     redrawn whole when the camera moves or every 80 ms. In between, only
     the patch the visitor is stirring is redrawn, every frame, so the sky
     answers the pointer at full speed. The stars and the spikes are cheap,
     and twinkle smoothly, so they are drawn every frame. */
  const { cam, w, h, dpr } = o;
  const key = `${w}x${h}@${dpr} ${cam.x.toFixed(2)},${cam.y.toFixed(2)},${cam.z.toFixed(4)}`;
  if (!c.layer) {
    const canvas = document.createElement("canvas");
    const lg = canvas.getContext("2d");
    if (!lg) return;
    c.layer = { canvas, g: lg, at: -1e9, key: "" };
  }
  const L = c.layer;
  const s = c.stir;
  const whole = { x0: 0, y0: 0, x1: w, y1: h };
  let dirty: Box | null = null;
  if (L.key !== key || (!o.calm && o.now - L.at > 80)) {
    const pw = Math.round(w * dpr);
    const ph = Math.round(h * dpr);
    if (L.canvas.width !== pw || L.canvas.height !== ph) {
      L.canvas.width = pw;
      L.canvas.height = ph;
    }
    dirty = whole;
    L.key = key;
    L.at = o.now;
  } else {
    /* Once the stir has settled (the pointer still, fully arrived, no
       wake), it changes nothing the whole redraws don't already draw. */
    const box = s.settled && s.drawn === s.box ? null : union(s.box, s.drawn);
    if (box) {
      /* On whole cells of both grids, so no glyph or dot is cut in two. */
      const D = ditherSize(o);
      const ux = lcm(o.narrow ? 6 : 7, D);
      const uy = lcm(o.narrow ? 10 : 12, D);
      dirty = {
        x0: Math.max(0, Math.floor(box.x0 / ux) * ux),
        y0: Math.max(0, Math.floor(box.y0 / uy) * uy),
        x1: Math.min(Math.ceil(w / ux) * ux, Math.ceil(box.x1 / ux) * ux),
        y1: Math.min(Math.ceil(h / uy) * uy, Math.ceil(box.y1 / uy) * uy),
      };
      if ((dirty.x1 - dirty.x0) * (dirty.y1 - dirty.y0) > w * h * 0.6) dirty = whole;
    }
  }
  if (dirty) {
    const lg = L.g;
    lg.save();
    lg.setTransform(dpr, 0, 0, dpr, 0, 0);
    lg.beginPath();
    lg.rect(dirty.x0, dirty.y0, dirty.x1 - dirty.x0, dirty.y1 - dirty.y0);
    lg.clip();
    lg.clearRect(dirty.x0, dirty.y0, dirty.x1 - dirty.x0, dirty.y1 - dirty.y0);
    drawDither(lg, c, o, dirty);
    drawGlyphs(lg, c, o, dirty);
    lg.restore();
    s.drawn = s.box;
  }
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = alpha;
  g.drawImage(L.canvas, 0, 0);
  g.restore();
  drawStars(g, c, o, alpha);
  drawFlares(g, c, o, alpha);
}

type DrawOpts = Parameters<typeof drawCosmos>[2];

const ditherSize = (o: DrawOpts) => (o.narrow ? 2 : o.w > 1800 ? 4 : 3);
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const lcm = (a: number, b: number) => (a * b) / gcd(a, b);
const union = (a: Box | null, b: Box | null): Box | null =>
  !a
    ? b
    : !b
      ? a
      : {
          x0: Math.min(a.x0, b.x0),
          y0: Math.min(a.y0, b.y0),
          x1: Math.max(a.x1, b.x1),
          y1: Math.max(a.y1, b.y1),
        };

const nearest = (wx: number, wy: number) => {
  const ix = Math.round((wx - X0) / STEP - 0.5);
  const iy = Math.round((wy - Y0) / STEP - 0.5);
  if (ix < 0 || iy < 0 || ix >= COLS || iy >= ROWS) return -1;
  return iy * COLS + ix;
};

/* A quick integer hash to 0..1: cheap enough for every dot, every frame. */
const ihash = (x: number, y: number, e: number) => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(e, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/* The breath of every patch of gas this frame, by phase. */
const BREATH = new Float32Array(64);
const breathe = (t: number, amp: number, calm: boolean) => {
  for (let k = 0; k < 64; k++)
    BREATH[k] = calm ? 1 : 1 + amp * Math.sin(t * 0.45 + (k * Math.PI) / 32);
};

/* ------------------------------------------------------------- The stir */

/*
 * The visitor's attention, as a field the sky feels but never shows. The
 * pointer is followed with some weight (it lags, then settles), and where
 * it rests the sky leans towards it: the gas gathers a little light, its
 * characters stir faster, the dither thickens, and the stars, the
 * characters and the glow are bent a few pixels outward, the way light
 * bends around a mass. Moving leaves a wake that stirs the characters and
 * fades within two seconds. There is no mark at the pointer and no
 * outline: only the sky, answering. Off under reduced motion.
 */
const STIR_CELL = 24;
const STIR_R = 130;
/* How far, at most, the stir bends characters and glow (px). */
const LENS = 7;

export type Stir = {
  /** Where the attention is (the pointer, followed with weight). */
  x: number;
  y: number;
  /** How present it is, 0 to 1: it gathers and ebbs, never switches. */
  on: number;
  /** The wake, on a coarse screen grid. */
  f: Float32Array;
  cols: number;
  rows: number;
  /** Where the stir reaches this frame, and where it was last drawn. */
  box: Box | null;
  drawn: Box | null;
  /** Nothing is changing: the pointer is still and there is no wake. */
  settled: boolean;
};

const createStir = (): Stir => ({
  x: 0,
  y: 0,
  on: 0,
  f: new Float32Array(0),
  cols: 0,
  rows: 0,
  box: null,
  drawn: null,
  settled: true,
});

function stirStep(c: Cosmos, o: DrawOpts) {
  const s = c.stir;
  const cols = Math.ceil(o.w / STIR_CELL) + 1;
  const rows = Math.ceil(o.h / STIR_CELL) + 1;
  if (s.cols !== cols || s.rows !== rows) {
    s.f = new Float32Array(cols * rows);
    s.cols = cols;
    s.rows = rows;
  }
  const p = o.pointer;
  const live = !o.calm && p.in;
  const dt = Math.max(o.dt, 1e-3);
  const was = { x: s.x, y: s.y, on: s.on };
  if (live) {
    /* It arrives where the pointer is, then follows it with weight. */
    if (s.on < 0.02) {
      s.x = p.x;
      s.y = p.y;
    }
    const k = 1 - Math.exp(-dt * 5);
    const nx = s.x + (p.x - s.x) * k;
    const ny = s.y + (p.y - s.y) * k;
    const speed = Math.hypot(nx - s.x, ny - s.y) / dt;
    const amt = Math.min(1, speed / 900) * Math.min(1, dt * 7);
    if (amt > 0.003) {
      /* The wake: a soft stamp at each step of the way. */
      const cx = nx / STIR_CELL;
      const cy = ny / STIR_CELL;
      for (
        let gy = Math.max(0, Math.floor(cy - 3));
        gy <= Math.min(rows - 1, cy + 3);
        gy++
      )
        for (
          let gx = Math.max(0, Math.floor(cx - 3));
          gx <= Math.min(cols - 1, cx + 3);
          gx++
        ) {
          const d2 = (gx - cx) ** 2 + (gy - cy) ** 2;
          const i = gy * cols + gx;
          s.f[i] = Math.min(1, s.f[i] + amt * Math.exp(-d2 / 2.6));
        }
    }
    s.x = nx;
    s.y = ny;
  }
  s.on += ((live ? 1 : 0) - s.on) * (1 - Math.exp(-dt * (live ? 2.5 : 1.5)));
  if (s.on < 0.005) s.on = 0;

  const decay = Math.exp(-dt * 2.2);
  let c0 = cols;
  let c1 = -1;
  let r0 = rows;
  let r1 = -1;
  for (let i = 0; i < s.f.length; i++) {
    if (!s.f[i]) continue;
    const v = s.f[i] * decay;
    s.f[i] = v < 0.03 ? 0 : v;
    if (!s.f[i]) continue;
    const gx = i % cols;
    const gy = (i - gx) / cols;
    if (gx < c0) c0 = gx;
    if (gx > c1) c1 = gx;
    if (gy < r0) r0 = gy;
    if (gy > r1) r1 = gy;
  }
  const wake =
    c1 < 0
      ? null
      : {
          x0: (c0 - 1) * STIR_CELL,
          y0: (r0 - 1) * STIR_CELL,
          x1: (c1 + 2) * STIR_CELL,
          y1: (r1 + 2) * STIR_CELL,
        };
  /* Past 1.7 radii the stir is under a twentieth: nothing to redraw. */
  const reach = STIR_R * 1.7 + LENS;
  const here =
    s.on > 0
      ? { x0: s.x - reach, y0: s.y - reach, x1: s.x + reach, y1: s.y + reach }
      : null;
  const box = union(here, wake);
  const moved =
    Math.abs(s.x - was.x) + Math.abs(s.y - was.y) > 0.25 ||
    Math.abs(s.on - was.on) > 0.004;
  s.settled = !moved && !wake;
  /* Keep the same box while settled, so drawCosmos can tell nothing moved. */
  if (!s.settled || !s.box) s.box = box;
}

/* The stir at a screen point: how much (0 to 1) and how far it is bent. */
const stirred = { e: 0, ox: 0, oy: 0 };
function stirAt(s: Stir, X: number, Y: number) {
  stirred.e = 0;
  stirred.ox = 0;
  stirred.oy = 0;
  const b = s.box;
  if (!b || X < b.x0 || X > b.x1 || Y < b.y0 || Y > b.y1) return stirred;
  let e = 0;
  if (s.on > 0) {
    const dx = X - s.x;
    const dy = Y - s.y;
    const r2 = (dx * dx + dy * dy) / (STIR_R * STIR_R);
    if (r2 < 2.9) {
      const gauss = Math.exp(-r2);
      e = s.on * gauss * 0.75;
      /* Bent outward by r·e^(−r²): most at 0.7 of the radius (LENS px),
         not at all at the centre. */
      const push = (LENS * 2.33 * gauss * s.on) / STIR_R;
      stirred.ox = dx * push;
      stirred.oy = dy * push;
    }
  }
  const fx = X / STIR_CELL - 0.5;
  const fy = Y / STIR_CELL - 0.5;
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  if (ix >= 0 && iy >= 0 && ix < s.cols - 1 && iy < s.rows - 1) {
    const tx = fx - ix;
    const ty = fy - iy;
    const i = iy * s.cols + ix;
    const f = s.f;
    const a = f[i] + (f[i + 1] - f[i]) * tx;
    const bb = f[i + s.cols] + (f[i + s.cols + 1] - f[i + s.cols]) * tx;
    e += (a + (bb - a) * ty) * 0.8;
  }
  stirred.e = Math.min(1, e);
  return stirred;
}

/* ---------------------------------------------------------- The layers */

/*
 * Both layers walk a screen grid and read the texture through the camera.
 * For each point they take the light between the four texels around it
 * (bilinear), and the colour of one of those four, picked by the point's
 * dither threshold: where two colours meet, the edge is dithered too,
 * rather than stepping along the texture's squares. The walk is inlined
 * and does no trigonometry per point, since it runs for every dot, every
 * frame.
 */

/**
 * The glow, as an ordered dither on a fine grid: each dot is on or off, in
 * one of a few strengths, like a print. The faint glow is a sparse scatter
 * of dots, the bright a dense one. Every dot's threshold wavers a little on
 * its own clock, so the glow sparkles rather than sits.
 */
function drawDither(g: CanvasRenderingContext2D, c: Cosmos, o: DrawOpts, area: Box) {
  const D = ditherSize(o);
  const gw = Math.ceil(o.w / D);
  const gh = Math.ceil(o.h / D);
  if (!c.dither || c.dither.img.width !== gw || c.dither.img.height !== gh) {
    const canvas = c.dither?.canvas ?? document.createElement("canvas");
    canvas.width = gw;
    canvas.height = gh;
    c.dither = { canvas, img: new ImageData(gw, gh) };
  }
  const { canvas, img } = c.dither;
  const data = img.data;
  const px0 = Math.max(0, Math.floor(area.x0 / D));
  const py0 = Math.max(0, Math.floor(area.y0 / D));
  const px1 = Math.min(gw, Math.ceil(area.x1 / D));
  const py1 = Math.min(gh, Math.ceil(area.y1 / D));
  if (px1 <= px0 || py1 <= py0) return;
  for (let py = py0; py < py1; py++)
    data.fill(0, (py * gw + px0) * 4, (py * gw + px1) * 4);
  const { cam, t, calm } = o;
  const I = c.I;
  const s = c.stir;
  const scale = D / cam.z / STEP;
  const fx0 = (cam.x - (cam.ax * o.w) / cam.z - X0) / STEP - 0.5 + scale * 0.5;
  const fy0 = (cam.y - (cam.ay * o.h) / cam.z - Y0) / STEP - 0.5 + scale * 0.5;
  const LV = [0, 0.13 * 255, 0.25 * 255, 0.4 * 255];
  const tick = calm ? 0 : Math.floor(t * 3);
  breathe(t, 0.2, calm);
  for (let py = py0; py < py1; py++) {
    const brow = (py & 3) * 4;
    const Y = (py + 0.5) * D;
    for (let px = px0; px < px1; px++) {
      /* Under the stir, the glow is read from a little further in, so it
         appears bent outward, and it thickens. */
      const st = stirAt(s, (px + 0.5) * D, Y);
      const fx = fx0 + (px - st.ox / D) * scale;
      const fy = fy0 + (py - st.oy / D) * scale;
      const ix = Math.floor(fx);
      const iy = Math.floor(fy);
      if (ix < 0 || ix >= COLS - 1 || iy < 0 || iy >= ROWS - 1) continue;
      const tx = fx - ix;
      const ty = fy - iy;
      const i0 = iy * COLS + ix;
      const a = I[i0] + (I[i0 + 1] - I[i0]) * tx;
      const b = I[i0 + COLS] + (I[i0 + COLS + 1] - I[i0 + COLS]) * tx;
      const v0 = a + (b - a) * ty;
      if (v0 < 0.03) continue;
      const thr = BAYER[brow + (px & 3)];
      const i = i0 + (tx > thr ? 1 : 0) + (ty > 1 - thr ? COLS : 0);
      const v = v0 * BREATH[c.ph[i]] * (1 + st.e * 0.7);
      const wob = calm
        ? 0
        : (ihash(px, py, tick + ((px * 7 + py * 13) & 3)) - 0.5) * 0.3 * (1 + st.e * 2);
      /* A gentle curve, so faint glow stays a sparse scatter. */
      const q = Math.min(3, Math.floor(v * (0.45 + 0.55 * v) * 3.1 + thr + wob));
      if (q <= 0) continue;
      const rgb = RGB[c.col[i]];
      const k = (py * gw + px) * 4;
      data[k] = rgb[0];
      data[k + 1] = rgb[1];
      data[k + 2] = rgb[2];
      data[k + 3] = LV[q];
    }
  }
  canvas.getContext("2d")?.putImageData(img, 0, 0, px0, py0, px1 - px0, py1 - py0);
  const smoothing = g.imageSmoothingEnabled;
  g.imageSmoothingEnabled = false;
  g.drawImage(
    canvas,
    px0,
    py0,
    px1 - px0,
    py1 - py0,
    px0 * D,
    py0 * D,
    (px1 - px0) * D,
    (py1 - py0) * D,
  );
  g.imageSmoothingEnabled = smoothing;
}

/**
 * The structure, as characters on the terminal's grid. A cell's glyph is
 * its light, dithered by the same matrix, and re-decided on the cell's own
 * slow clock; faster, and a little brighter, where the visitor stirs it.
 */
function drawGlyphs(g: CanvasRenderingContext2D, c: Cosmos, o: DrawOpts, area: Box) {
  const cw = o.narrow ? 6 : 7;
  const ch = o.narrow ? 10 : 12;
  const gx0 = Math.max(0, Math.floor(area.x0 / cw));
  const gy0 = Math.max(0, Math.floor(area.y0 / ch));
  const gx1 = Math.min(Math.ceil(o.w / cw), Math.ceil(area.x1 / cw));
  const gy1 = Math.min(Math.ceil(o.h / ch), Math.ceil(area.y1 / ch));
  const { cam, t, calm } = o;
  const I = c.I;
  const s = c.stir;
  const sx = cw / cam.z / STEP;
  const sy = ch / cam.z / STEP;
  const fx0 = (cam.x - (cam.ax * o.w) / cam.z - X0) / STEP - 0.5 + sx * 0.5;
  const fy0 = (cam.y - (cam.ay * o.h) / cam.z - Y0) / STEP - 0.5 + sy * 0.5;
  for (let b = 0; b < BUCKETS; b++) {
    bx[b].length = 0;
    by[b].length = 0;
    bc[b].length = 0;
  }
  breathe(t, 0.18, calm);
  const levels = GLYPH_ALPHA.length;
  for (let gy = gy0; gy < gy1; gy++) {
    const fy = fy0 + gy * sy;
    const iy = Math.floor(fy);
    if (iy < 0 || iy >= ROWS - 1) continue;
    const ty = fy - iy;
    const row = iy * COLS;
    const Y = (gy + 0.5) * ch;
    for (let gx = gx0; gx < gx1; gx++) {
      const fx = fx0 + gx * sx;
      const ix = Math.floor(fx);
      if (ix < 0 || ix >= COLS - 1) continue;
      const tx = fx - ix;
      const i0 = row + ix;
      const a = I[i0] + (I[i0 + 1] - I[i0]) * tx;
      const b0 = I[i0 + COLS] + (I[i0 + COLS + 1] - I[i0 + COLS]) * tx;
      const X = (gx + 0.5) * cw;
      const st = stirAt(s, X, Y);
      const v = (a + (b0 - a) * ty) * (1 + st.e * 0.8) + st.e * 0.05;
      if (v < 0.07) continue;
      const thr = BAYER[(gy & 3) * 4 + (gx & 3)];
      const i = i0 + (tx > thr ? 1 : 0) + (ty > 1 - thr ? COLS : 0);
      /* Each cell re-decides itself every 1.4 to 4 s, at its own moments,
         and several times faster under the stir. */
      let jitter = 0;
      let pickAt = 0;
      if (!calm) {
        const epoch = Math.floor(
          (t * (1 + st.e * 5)) / (1.4 + ihash(gx, gy, 3) * 2.6) + ihash(gx, gy, 5) * 7,
        );
        jitter = (ihash(gx, gy, epoch) - 0.5) * (0.8 + st.e * 0.6);
        pickAt = epoch + 91;
      }
      const q = v * BREATH[c.ph[i]] * 5 + (thr - 0.5) + jitter;
      const lvl = Math.min(levels, Math.floor(q));
      if (lvl < 1) continue;
      const b = c.col[i] * levels + lvl - 1;
      bx[b].push(X + st.ox);
      by[b].push(Y + st.oy);
      const set = RAMPS[c.kind[i]][lvl - 1];
      bc[b].push(
        set.length === 1 ? set[0] : set[Math.floor(ihash(gx, gy, pickAt) * set.length)],
      );
    }
  }
  g.font = `${o.narrow ? 9.5 : 11}px ${o.mono}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  for (let b = 0; b < BUCKETS; b++) {
    const xs = bx[b];
    if (!xs.length) continue;
    g.fillStyle = PALETTE[Math.floor(b / levels)];
    g.globalAlpha = GLYPH_ALPHA[b % levels];
    const ys = by[b];
    const cs = bc[b];
    for (let j = 0; j < xs.length; j++) g.fillText(cs[j], xs[j], ys[j]);
  }
  g.globalAlpha = 1;
}

const STAR_ALPHA = [0.3, 0.5, 0.75, 1];

/* The stars. Further out than the sky's framing, the faint ones drop out
   first, so the sky gathers into a patch of light rather than a blur. */
function drawStars(g: CanvasRenderingContext2D, c: Cosmos, o: DrawOpts, alpha: number) {
  const { cam, t, calm } = o;
  const keep = o.far >= 1 ? 2 : o.far * 1.3 + 0.04;
  for (let b = 0; b < BUCKETS; b++) {
    bx[b].length = 0;
    by[b].length = 0;
    bc[b].length = 0;
  }
  for (const st of c.stars) {
    if (st.r > keep) continue;
    let X = cam.ax * o.w + (st.x - cam.x) * cam.z;
    let Y = cam.ay * o.h + (st.y - cam.y) * cam.z;
    if (X < -12 || Y < -12 || X > o.w + 12 || Y > o.h + 12) continue;
    const i = nearest(st.x, st.y);
    const hidden = i < 0 ? 0 : c.dust[i];
    const tw = calm ? 0.85 : 0.55 + 0.45 * Math.sin(t * st.rate + st.p);
    const sr = stirAt(c.stir, X, Y);
    X += sr.ox * 1.3;
    Y += sr.oy * 1.3;
    const v = st.b * st.w * tw * (1 - hidden * 0.95) * (1 + sr.e * 0.6);
    if (v < 0.08) continue;
    const lvl = v > 0.8 ? 3 : v > 0.55 ? 2 : v > 0.3 ? 1 : 0;
    const b = st.tint * 4 + lvl;
    bx[b].push(X);
    by[b].push(Y);
    bc[b].push(lvl === 3 ? "*" : lvl === 2 ? "+" : lvl === 1 ? "·" : ".");
  }
  g.font = `${o.narrow ? 9.5 : 11}px ${o.mono}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  for (let b = 0; b < PALETTE.length * 4; b++) {
    const xs = bx[b];
    if (!xs.length) continue;
    g.fillStyle = PALETTE[Math.floor(b / 4)];
    g.globalAlpha = STAR_ALPHA[b % 4] * alpha;
    const ys = by[b];
    const cs = bc[b];
    for (let j = 0; j < xs.length; j++) g.fillText(cs[j], xs[j], ys[j]);
  }
  g.globalAlpha = 1;
}

/* The brightest foreground stars, with the six long spikes and two short
   ones a segmented mirror gives them. Spikes are optics, not objects, so
   they keep their length as the camera closes in; far out, they shrink
   with the sky, so they never outshine it. */
function drawFlares(
  g: CanvasRenderingContext2D,
  c: Cosmos,
  o: DrawOpts,
  alpha: number,
) {
  const { cam, t, calm } = o;
  const scale = (o.narrow ? 0.7 : 1) * Math.sqrt(Math.min(1, o.far));
  g.lineWidth = 1;
  for (const f of c.flares) {
    let X = cam.ax * o.w + (f.x - cam.x) * cam.z;
    let Y = cam.ay * o.h + (f.y - cam.y) * cam.z;
    const L = (14 + 34 * f.m) * scale;
    if (X < -L || Y < -L || X > o.w + L || Y > o.h + L) continue;
    const sr = stirAt(c.stir, X, Y);
    X += sr.ox * 1.3;
    Y += sr.oy * 1.3;
    const tw = calm ? 1 : 0.82 + 0.18 * Math.sin(t * 1.3 + f.p);
    const a = alpha * tw * (1 + sr.e * 0.3);
    const [r, gg, b] = RGB[f.tint];
    const rgba = (k: number) => `rgba(${r},${gg},${b},${Math.min(1, k)})`;

    const glowR = (5 + 7 * f.m) * scale;
    const grad = g.createRadialGradient(X, Y, 0, X, Y, glowR);
    grad.addColorStop(0, rgba(0.55 * a));
    grad.addColorStop(0.3, rgba(0.16 * a));
    grad.addColorStop(1, rgba(0));
    g.fillStyle = grad;
    g.fillRect(X - glowR, Y - glowR, glowR * 2, glowR * 2);

    for (const [ang, len] of [
      [Math.PI / 2, L],
      [Math.PI / 6, L],
      [(5 * Math.PI) / 6, L],
      [0, L * 0.45],
    ] as const) {
      const dx = Math.cos(ang) * len;
      const dy = Math.sin(ang) * len;
      const sg = g.createLinearGradient(X - dx, Y - dy, X + dx, Y + dy);
      sg.addColorStop(0, rgba(0));
      sg.addColorStop(0.5, rgba(0.85 * a));
      sg.addColorStop(1, rgba(0));
      g.strokeStyle = sg;
      g.beginPath();
      g.moveTo(X - dx, Y - dy);
      g.lineTo(X + dx, Y + dy);
      g.stroke();
    }
    g.globalAlpha = Math.min(1, a);
    g.fillStyle = PALETTE[6];
    g.font = `${o.narrow ? 10 : 12}px ${o.mono}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("*", X, Y + 1);
    g.globalAlpha = 1;
  }
}
