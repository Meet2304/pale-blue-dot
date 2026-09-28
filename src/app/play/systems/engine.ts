/**
 * The particle engine every design system shares.
 *
 * One idea, five renderings: a fixed population of particles that morphs
 * between shapes (the dot, a nebula, a ring, a galaxy, a name, a constellation).
 * What changes from system to system is how a particle is drawn and how it
 * travels, never what it is. That is the point of a design system built from
 * particles: the dot, the nebula and the wordmark are made of the same matter.
 *
 * Coordinates are in "units": 1 unit is 90% of half the shorter side of the
 * canvas, centred on the field's focus point.
 */

export type ShapeId =
  "dot" | "nebula" | "ring" | "spiral" | "name" | "constellation" | "gradient";

export type RenderMode = "glow" | "bit" | "halftone" | "glyph" | "stipple";
export type MorphStyle = "swirl" | "stepped" | "straight" | "flow";

export type FieldConfig = {
  mode: RenderMode;
  count: number;
  morph: MorphStyle;
  /** Travel time of one particle, in ms. */
  duration: number;
  /** Largest per-particle delay, in ms. */
  stagger: number;
  /** Random delays scatter the move; radial ones re-form the shape from its centre out. */
  staggerBy: "random" | "radial";
  /** Idle drift amplitude, in units. */
  drift: number;
  /** Background, then inks from faintest to brightest, as hex. */
  bg: string;
  inks: string[];
  /** Grid cell in CSS px, for the grid-based renderers. */
  cell?: number;
  /** Tone-mapping gain for grid renderers: higher is brighter. */
  gain?: number;
  /** Fade applied each frame, 0..1, for renderers that leave trails. */
  trail?: number;
  /** The CSS custom property holding the font used to write the name. */
  nameFontVar?: string;
  nameWeight?: number;
  /** A monospace font variable, for the glyph renderer. */
  monoFontVar?: string;
};

export type Shape = { xy: Float32Array; hue: Float32Array };

/* ------------------------------------------------------------------------- */
/* Randomness                                                                */
/* ------------------------------------------------------------------------- */

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(r: () => number) {
  let u = 0;
  while (u === 0) u = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
}

/* ------------------------------------------------------------------------- */
/* Shapes                                                                    */
/* ------------------------------------------------------------------------- */

const NODES: [number, number][] = [
  [-0.95, 0.35],
  [-0.55, -0.1],
  [-0.2, 0.05],
  [0.12, -0.42],
  [0.48, -0.2],
  [0.85, -0.55],
  [0.4, 0.3],
  [0.05, 0.62],
  [0.9, 0.5],
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

/** Where each point of the name comes from, sampled once per font and size. */
function textPoints(text: string, font: string, weight: number): [number, number][] {
  const c = document.createElement("canvas");
  c.width = 1800;
  c.height = 420;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return [[0, 0]];
  let size = 300;
  g.font = `${weight} ${size}px ${font}`;
  const fit = 1700 / g.measureText(text).width;
  if (fit < 1) size *= fit;
  g.font = `${weight} ${size}px ${font}`;
  g.fillStyle = "#fff";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, 900, 210);
  const data = g.getImageData(0, 0, c.width, c.height).data;
  const pts: [number, number][] = [];
  for (let y = 0; y < c.height; y += 2) {
    for (let x = 0; x < c.width; x += 2) {
      if (data[(y * c.width + x) * 4 + 3] > 127) pts.push([x - 900, y - 210]);
    }
  }
  let w = 1;
  for (const p of pts) w = Math.max(w, Math.abs(p[0]) * 2);
  /* Store the measured half-width as the last entry, so callers can scale. */
  pts.push([w, 0]);
  return pts;
}

const textCache = new Map<string, [number, number][]>();

export function sampleShape(
  id: ShapeId,
  n: number,
  opts: { halfW: number; seed: number; text?: string; font?: string; weight?: number },
): Shape {
  const r = mulberry32(opts.seed);
  const xy = new Float32Array(n * 2);
  const hue = new Float32Array(n);
  const put = (i: number, x: number, y: number, h: number) => {
    xy[i * 2] = x;
    xy[i * 2 + 1] = y;
    hue[i] = h < 0 ? 0 : h > 1 ? 1 : h;
  };

  switch (id) {
    case "dot": {
      /* A tight core and a faint halo: the dot seen through a camera. */
      for (let i = 0; i < n; i++) {
        const halo = r() < 0.16;
        const s = halo ? 0.075 : 0.017;
        const x = gauss(r) * s;
        const y = gauss(r) * s;
        put(i, x, y, halo ? 0.35 : 0.1 + Math.hypot(x, y) * 4);
      }
      break;
    }
    case "nebula": {
      const blobs = [
        { x: -0.42, y: -0.08, sx: 0.36, sy: 0.2, w: 0.3, h: 0.15 },
        { x: 0.28, y: 0.1, sx: 0.32, sy: 0.24, w: 0.3, h: 0.55 },
        { x: 0.02, y: -0.28, sx: 0.2, sy: 0.12, w: 0.16, h: 0.8 },
        { x: -0.12, y: 0.32, sx: 0.28, sy: 0.1, w: 0.14, h: 0.4 },
        { x: 0.05, y: 0.02, sx: 0.09, sy: 0.07, w: 0.1, h: 0.95 },
      ];
      const total = blobs.reduce((a, b) => a + b.w, 0);
      for (let i = 0; i < n; i++) {
        if (r() < 0.05) {
          put(i, (r() - 0.5) * 3, (r() - 0.5) * 2, 0.5);
          continue;
        }
        let pick = r() * total;
        let b = blobs[0];
        for (const bl of blobs) {
          pick -= bl.w;
          if (pick <= 0) {
            b = bl;
            break;
          }
        }
        let x = b.x + gauss(r) * b.sx;
        let y = b.y + gauss(r) * b.sy;
        /* A gentle twist, so the cloud reads as turbulent rather than as a
           stack of ovals. */
        const d = Math.hypot(x, y);
        const a = 0.9 / (d + 0.35);
        const cx = Math.cos(a * 0.35);
        const sx = Math.sin(a * 0.35);
        [x, y] = [x * cx - y * sx, x * sx + y * cx];
        put(i, x, y, b.h + gauss(r) * 0.08);
      }
      break;
    }
    case "ring": {
      for (let i = 0; i < n; i++) {
        const k = r();
        const a = r() * Math.PI * 2;
        if (k < 0.12) {
          put(i, gauss(r) * 0.05, gauss(r) * 0.05, 1);
        } else if (k < 0.2) {
          const rad = 0.82 + gauss(r) * 0.08;
          put(i, Math.cos(a) * rad, Math.sin(a) * rad * 0.9, 0.2);
        } else {
          const rad = 0.55 + gauss(r) * (0.035 + 0.025 * Math.sin(a * 3));
          put(
            i,
            Math.cos(a) * rad,
            Math.sin(a) * rad * 0.9,
            0.45 + 0.35 * Math.sin(a * 2),
          );
        }
      }
      break;
    }
    case "spiral": {
      for (let i = 0; i < n; i++) {
        if (r() < 0.16) {
          put(i, gauss(r) * 0.11, gauss(r) * 0.08, 1);
          continue;
        }
        const arm = r() < 0.5 ? 0 : Math.PI;
        const t = Math.pow(r(), 0.7);
        const rad = 0.08 + t * 0.95;
        const th = arm + t * 5.2 + gauss(r) * 0.22 * (1 - t * 0.4);
        put(i, Math.cos(th) * rad, Math.sin(th) * rad * 0.62, 1 - t);
      }
      break;
    }
    case "constellation": {
      for (let i = 0; i < n; i++) {
        if (r() < 0.32) {
          const [x, y] = NODES[Math.floor(r() * NODES.length)];
          put(i, x + gauss(r) * 0.016, y + gauss(r) * 0.016, 1);
        } else {
          const [a, b] = EDGES[Math.floor(r() * EDGES.length)];
          const t = r();
          const x = NODES[a][0] + (NODES[b][0] - NODES[a][0]) * t;
          const y = NODES[a][1] + (NODES[b][1] - NODES[a][1]) * t;
          put(i, x + gauss(r) * 0.005, y + gauss(r) * 0.005, 0.35);
        }
      }
      break;
    }
    case "name": {
      const key = `${opts.text}|${opts.font}|${opts.weight}`;
      let pts = textCache.get(key);
      if (!pts) {
        pts = textPoints(opts.text ?? "", opts.font ?? "serif", opts.weight ?? 400);
        textCache.set(key, pts);
      }
      const halfW = pts[pts.length - 1][0] / 2;
      const count = pts.length - 1;
      const targetHalf = Math.min(1.5, opts.halfW * 0.86);
      const s = targetHalf / halfW;
      for (let i = 0; i < n; i++) {
        const [px, py] = pts[Math.floor(r() * count)];
        const x = (px + (r() - 0.5) * 2) * s;
        put(i, x, (py + (r() - 0.5) * 2) * s, 0.5 + x / (targetHalf * 2));
      }
      break;
    }
    case "gradient": {
      /* For texture swatches: density rises left to right across the frame. */
      const hw = opts.halfW * 0.98;
      let i = 0;
      while (i < n) {
        const x = (r() * 2 - 1) * hw;
        const y = (r() * 2 - 1) * 1.08;
        const p = Math.pow((x / hw + 1) / 2, 1.6);
        if (r() < p) put(i++, x, y, (x / hw + 1) / 2);
      }
      break;
    }
  }
  return { xy, hue };
}

/* ------------------------------------------------------------------------- */
/* Rendering helpers                                                         */
/* ------------------------------------------------------------------------- */

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const v = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

/** Colour along the ink ramp, t in 0..1. */
export function rampColor(inks: [number, number, number][], t: number) {
  if (inks.length === 1) return inks[0];
  const f = Math.min(0.9999, Math.max(0, t)) * (inks.length - 1);
  const i = Math.floor(f);
  const k = f - i;
  const a = inks[i];
  const b = inks[i + 1];
  return [
    a[0] + (b[0] - a[0]) * k,
    a[1] + (b[1] - a[1]) * k,
    a[2] + (b[2] - a[2]) * k,
  ] as [number, number, number];
}

/** The classic 8×8 ordered-dither threshold map. */
export const BAYER8 = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6,
  38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49,
  17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
];

/** Splat screen-space points into a grid, bilinearly, then box-blur it. */
export function densityGrid(
  sx: Float32Array,
  sy: Float32Array,
  n: number,
  cell: number,
  gw: number,
  gh: number,
  out: Float32Array,
  blur: number,
  tmp: Float32Array,
  only?: Uint8Array,
) {
  out.fill(0);
  for (let i = 0; i < n; i++) {
    if (only && !only[i]) continue;
    const gx = sx[i] / cell - 0.5;
    const gy = sy[i] / cell - 0.5;
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const fx = gx - x0;
    const fy = gy - y0;
    for (let dy = 0; dy < 2; dy++) {
      const y = y0 + dy;
      if (y < 0 || y >= gh) continue;
      const wy = dy ? fy : 1 - fy;
      for (let dx = 0; dx < 2; dx++) {
        const x = x0 + dx;
        if (x < 0 || x >= gw) continue;
        out[y * gw + x] += wy * (dx ? fx : 1 - fx);
      }
    }
  }
  for (let pass = 0; pass < blur; pass++) {
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        const i = y * gw + x;
        const l = x > 0 ? out[i - 1] : out[i];
        const rr = x < gw - 1 ? out[i + 1] : out[i];
        tmp[i] = (l + out[i] * 2 + rr) / 4;
      }
    }
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        const i = y * gw + x;
        const u = y > 0 ? tmp[i - gw] : tmp[i];
        const d = y < gh - 1 ? tmp[i + gw] : tmp[i];
        out[i] = (u + tmp[i] * 2 + d) / 4;
      }
    }
  }
}
