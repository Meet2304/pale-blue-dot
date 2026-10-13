import {
  BODIES,
  EXTENT,
  type BodyFn,
  type BodyId,
  type Cell,
  type Frame,
} from "./bodies";
import { fillGlyphs } from "./glyph-gl";

/**
 * Draw one body into the character grid. The grid is absolute (cells sit at
 * multiples of the cell size), so bodies drawn at the same cell size share
 * one lattice, the way every character on a terminal does.
 */

const LEVELS = 4;
/* Room for two bodies' colours at once (7 tiers each): the work menu
   morphs one body into another in a single pass. */
const BUCKETS = 14 * LEVELS;
const bx: number[][] = Array.from({ length: BUCKETS }, () => []);
const by: number[][] = Array.from({ length: BUCKETS }, () => []);
const bc: string[][] = Array.from({ length: BUCKETS }, () => []);
const cell: Cell = { c: "", k: 0, a: 0 };

/**
 * A body's characters as last worked out, kept where the body itself is:
 * each cell's offset from its centre (in radii), glyph and bucket. Working
 * the characters out is the costly part of a body (a shading function per
 * cell), and they change on their own clock, a few times a second; the
 * camera moves every frame. So while the camera moves, the last cells are
 * carried along with the body, and worked out afresh only as often as they
 * would be if it were still.
 */
export type BodyCache = {
  at: number;
  R: number;
  nx: number[];
  ny: number[];
  c: string[];
  b: number[];
};

export const bodyCache = (): BodyCache => ({
  at: -1e9,
  R: 0,
  nx: [],
  ny: [],
  c: [],
  b: [],
});

/* How far beyond the screen the cells are worked out when they are kept,
   so a body sliding in has its edge ready. */
const MARGIN = 0.15;

export function drawBody(
  g: CanvasRenderingContext2D,
  body: BodyId,
  o: {
    w: number;
    h: number;
    cx: number;
    cy: number;
    R: number;
    cw: number;
    ch: number;
    frame: Frame;
    colors: string[];
    alpha: number;
    font: string;
    /** Draw with another renderer (the work menu's portraits). */
    fn?: BodyFn;
    extent?: number;
    /** The light under the glyphs and the photon ring; off when the
        caller draws its own. */
    light?: boolean;
    /** Keep the cells here, and reuse them while they are younger than
        `maxAge` ms (at `now`) and the body is near the same size. */
    cache?: BodyCache;
    now?: number;
    maxAge?: number;
  },
) {
  const { w, h, cx, cy, R, cw, ch, frame, colors, alpha, light = true } = o;
  const fn = o.fn ?? BODIES[body];
  const extent = o.extent ?? EXTENT[body];
  const reach = extent * R;
  if (cx + reach < 0 || cx - reach > w || cy + reach < 0 || cy - reach > h) return;

  /* Light under the glyphs: what makes a star read as light. */
  if (light && (body === "sun" || body === "blackhole")) {
    const hot = body === "sun";
    const gr = R * (hot ? 2.4 : 1.6);
    const grad = g.createRadialGradient(cx, cy, 0, cx, cy, gr);
    const c = colors[5];
    grad.addColorStop(0, withAlpha(hot ? "#fff6e0" : c, (hot ? 0.55 : 0.22) * alpha));
    grad.addColorStop(hot ? 0.3 : 0.35, withAlpha(c, (hot ? 0.28 : 0.12) * alpha));
    grad.addColorStop(1, withAlpha(c, 0));
    g.save();
    if (!hot) {
      /* The disk's glow is flat, like the disk. */
      g.translate(cx, cy);
      g.scale(1, 0.45);
      g.translate(-cx, -cy);
    }
    g.fillStyle = grad;
    g.fillRect(cx - gr, cy - gr, gr * 2, gr * 2);
    g.restore();
    if (!hot) {
      /* The lensed light: a ring of glow hugging the shadow. */
      const halo = g.createRadialGradient(cx, cy, R * 0.3, cx, cy, R * 0.95);
      halo.addColorStop(0, withAlpha("#ffe6c0", 0.5 * alpha));
      halo.addColorStop(0.18, withAlpha(c, 0.22 * alpha));
      halo.addColorStop(1, withAlpha(c, 0));
      g.fillStyle = halo;
      g.fillRect(cx - R, cy - R, R * 2, R * 2);
      g.fillStyle = `rgba(0,0,0,${alpha})`;
      g.beginPath();
      g.arc(cx, cy, R * 0.3, 0, Math.PI * 2);
      g.fill();
    }
  }

  for (let b = 0; b < BUCKETS; b++) {
    bx[b].length = 0;
    by[b].length = 0;
    bc[b].length = 0;
  }
  const keep = o.cache;
  const now = o.now ?? 0;
  if (keep && now - keep.at < (o.maxAge ?? 80) && Math.abs(R / keep.R - 1) < 0.2) {
    /* Carried along: the same cells, where the body is now. */
    const { nx, ny, c, b } = keep;
    for (let i = 0; i < nx.length; i++) {
      const X = cx + nx[i] * R;
      const Y = cy + ny[i] * R;
      if (X < -cw || Y < -ch || X > w + cw || Y > h + ch) continue;
      bx[b[i]].push(X);
      by[b[i]].push(Y);
      bc[b[i]].push(c[i]);
    }
  } else {
    const mx = keep ? w * MARGIN : 0;
    const my = keep ? h * MARGIN : 0;
    const gy0 = Math.max(Math.floor(-my / ch), Math.floor((cy - reach) / ch));
    const gy1 = Math.min(Math.ceil((h + my) / ch), Math.ceil((cy + reach) / ch));
    const gx0 = Math.max(Math.floor(-mx / cw), Math.floor((cx - reach) / cw));
    const gx1 = Math.min(Math.ceil((w + mx) / cw), Math.ceil((cx + reach) / cw));
    if (keep) {
      keep.at = now;
      keep.R = R;
      keep.nx.length = keep.ny.length = keep.c.length = keep.b.length = 0;
    }

    for (let gy = gy0; gy < gy1; gy++) {
      for (let gx = gx0; gx < gx1; gx++) {
        const X = (gx + 0.5) * cw;
        const Y = (gy + 0.5) * ch;
        const nx = (X - cx) / R;
        const ny = (Y - cy) / R;
        if (nx * nx + ny * ny > extent * extent) continue;
        if (!fn(nx, ny, gx * 131 + gy * 977, frame, cell)) continue;
        const lvl = Math.min(
          LEVELS - 1,
          Math.max(0, Math.floor(cell.a * LEVELS - 0.001)),
        );
        const b = cell.k * LEVELS + lvl;
        if (keep) {
          keep.nx.push(nx);
          keep.ny.push(ny);
          keep.c.push(cell.c);
          keep.b.push(b);
        }
        if (X < -cw || Y < -ch || X > w + cw || Y > h + ch) continue;
        bx[b].push(X);
        by[b].push(Y);
        bc[b].push(cell.c);
      }
    }
  }

  fillGlyphs(
    g,
    o.font,
    BUCKETS,
    (b) => colors[Math.floor(b / LEVELS)],
    (b) => (((b % LEVELS) + 1) / LEVELS) * alpha,
    bx,
    by,
    bc,
  );

  /* The photon ring, drawn as light: a thin circle with a bloom. */
  if (light && body === "blackhole" && R > 20) {
    g.save();
    g.strokeStyle = withAlpha("#fff4e2", 0.9 * alpha);
    g.lineWidth = Math.max(1, R * 0.012);
    g.shadowColor = withAlpha(colors[5], alpha);
    g.shadowBlur = R * 0.08;
    g.beginPath();
    g.arc(cx, cy, R * 0.315, 0, Math.PI * 2);
    g.stroke();
    g.restore();
  }
}

export function makeFrame(
  t: number,
  yaw: number,
  tilt: number,
  scan: { x: number; y: number; r: number } | null,
  px: number,
  py: number,
  seed: number,
  calm: boolean,
): Frame {
  return {
    t,
    cosY: Math.cos(yaw),
    sinY: Math.sin(yaw),
    cosT: Math.cos(tilt),
    sinT: Math.sin(tilt),
    sx: scan?.x ?? 0,
    sy: scan?.y ?? 0,
    sr: scan?.r ?? 0,
    px,
    py,
    seed,
    calm,
  };
}

function withAlpha(hex: string, a: number) {
  const v = parseInt(hex.slice(1), 16);
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`;
}
