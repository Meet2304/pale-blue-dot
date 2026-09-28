import {
  BODIES,
  EXTENT,
  WAVE,
  hash,
  type BodyId,
  type Cell,
  type Frame,
} from "./bodies";

/**
 * Draw one body, or the transition between two, into a character grid.
 *
 * The transition is a scan wave: a ring travels outward from the body's
 * centre. Behind it, cells already show the new body in the new colours;
 * ahead of it, the old body in the old colours; on it, a band of glyphs is
 * still being decided. It is the terminal's way of redrawing a world.
 */

export type Side = { body: BodyId; colors: string[] };

const LEVELS = 4;
const BUCKETS = 2 * 7 * LEVELS;
const bx: number[][] = Array.from({ length: BUCKETS }, () => []);
const by: number[][] = Array.from({ length: BUCKETS }, () => []);
const bc: string[][] = Array.from({ length: BUCKETS }, () => []);
const cell: Cell = { c: "", k: 0, a: 0 };

/** Where the wave has reached, in fractions of the body's extent. */
export const WAVE_SPAN = 1.25;
const BAND = 0.14;

export function drawBodyGrid(
  g: CanvasRenderingContext2D,
  opts: {
    w: number;
    h: number;
    cx: number;
    cy: number;
    R: number;
    cw: number;
    ch: number;
    frame: Frame;
    from: Side;
    to: Side;
    /** 0..WAVE_SPAN while a transition runs; anything else draws `to` alone. */
    wave: number;
    font: string;
    alpha?: number;
  },
) {
  const { w, h, cx, cy, R, cw, ch, frame, from, to, wave, font } = opts;
  const alpha = opts.alpha ?? 1;
  const moving = wave >= 0 && wave < WAVE_SPAN;
  const reach = Math.max(EXTENT[to.body], moving ? EXTENT[from.body] : 0) * R;

  for (let b = 0; b < BUCKETS; b++) {
    bx[b].length = 0;
    by[b].length = 0;
    bc[b].length = 0;
  }

  const gy0 = Math.max(0, Math.floor((cy - reach) / ch));
  const gy1 = Math.min(Math.ceil(h / ch), Math.ceil((cy + reach) / ch));
  const gx0 = Math.max(0, Math.floor((cx - reach) / cw));
  const gx1 = Math.min(Math.ceil(w / cw), Math.ceil((cx + reach) / cw));
  const span = 1.5;
  const tick = Math.floor(frame.t * 24);

  for (let gy = gy0; gy < gy1; gy++) {
    for (let gx = gx0; gx < gx1; gx++) {
      const X = (gx + 0.5) * cw;
      const Y = (gy + 0.5) * ch;
      const nx = (X - cx) / R;
      const ny = (Y - cy) / R;
      const id = gx * 131 + gy * 977;
      let side = 1;
      if (moving) {
        const rn = Math.hypot(nx, ny) / span;
        if (rn > wave) side = 0;
        else if (rn > wave - BAND) {
          /* On the wavefront: undecided glyphs, brightest at the leading edge. */
          const front = 1 - (wave - rn) / BAND;
          if (hash(id, tick) < 0.35 + front * 0.5) {
            const b = (1 * 7 + (front > 0.6 ? 6 : 4)) * LEVELS + (LEVELS - 1);
            bx[b].push(X);
            by[b].push(Y);
            bc[b].push(WAVE[Math.floor(hash(id + 3, tick) * WAVE.length)]);
          }
          continue;
        }
      }
      const s = side ? to : from;
      if (!BODIES[s.body](nx, ny, id, frame, cell)) continue;
      const lvl = Math.min(
        LEVELS - 1,
        Math.max(0, Math.floor(cell.a * LEVELS - 0.001)),
      );
      const b = (side * 7 + cell.k) * LEVELS + lvl;
      bx[b].push(X);
      by[b].push(Y);
      bc[b].push(cell.c);
    }
  }

  g.font = font;
  g.textAlign = "center";
  g.textBaseline = "middle";
  for (let b = 0; b < BUCKETS; b++) {
    if (!bx[b].length) continue;
    const lvl = b % LEVELS;
    const k = Math.floor(b / LEVELS) % 7;
    const side = Math.floor(b / (LEVELS * 7));
    g.fillStyle = (side ? to : from).colors[k];
    g.globalAlpha = ((lvl + 1) / LEVELS) * alpha;
    const xs = bx[b];
    const ys = by[b];
    const cs = bc[b];
    for (let j = 0; j < xs.length; j++) g.fillText(cs[j], xs[j], ys[j]);
  }
  g.globalAlpha = 1;
}

/** A frame for the renderers, with Earth's spin and tilt precomputed. */
export function makeFrame(
  t: number,
  yaw: number,
  tilt: number,
  scan: { x: number; y: number; r: number } | null,
  px: number,
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
    calm,
  };
}

/** The seven colours a side draws with: the accent ramp, warm, white. */
export const colorsFor = (ramp: string[]) => [...ramp, "#ffd08a", "#ffffff"];
