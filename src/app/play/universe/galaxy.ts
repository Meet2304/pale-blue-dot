import { fbm3 } from "../systems/lab/noise";
import { hash } from "./bodies";

/**
 * The galaxy behind the map, drawn once into an offscreen canvas in the same
 * character grid as everything else: a warm core, two spiral arms seen at an
 * angle, dark dust lanes along their inner edges, pink knots where stars are
 * forming, and a deep field of stars in front and behind.
 *
 * Earth is not at the centre. It sits out in an arm, which is where it is.
 */

export type GalaxyImage = {
  canvas: HTMLCanvasElement;
  /** The world rectangle the image covers. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

type Opts = {
  /** World rectangle to cover, and the zoom it is drawn at (px per unit). */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  z: number;
  dpr: number;
  /** Galaxy centre and radius, in world units. */
  cx: number;
  cy: number;
  radius: number;
  font: string;
};

const RAMP = [".", "·", ":", ";", "+", "*"];
const CORE = "#ffdcb0";
const ARM = "#c9d6ff";
const DUST = "#8f86a8";
const KNOT = "#ff9fc8";
const FIELD = "#e6ebf5";

export function renderGalaxy(o: Opts): GalaxyImage {
  const wpx = (o.x1 - o.x0) * o.z;
  const hpx = (o.y1 - o.y0) * o.z;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(wpx * o.dpr);
  canvas.height = Math.ceil(hpx * o.dpr);
  const g = canvas.getContext("2d");
  if (!g) return { canvas, ...o };
  g.setTransform(o.dpr, 0, 0, o.dpr, 0, 0);

  const cw = 6;
  const ch = 10;
  const cols = Math.ceil(wpx / cw);
  const rows = Math.ceil(hpx / ch);

  /* Buckets by colour and brightness, so each fillStyle is set once. */
  const buckets = new Map<string, { x: number[]; y: number[]; c: string[] }>();
  const put = (color: string, lvl: number, x: number, y: number, c: string) => {
    const key = `${color}|${lvl}`;
    let b = buckets.get(key);
    if (!b) buckets.set(key, (b = { x: [], y: [], c: [] }));
    b.x.push(x);
    b.y.push(y);
    b.c.push(c);
  };

  const tilt = -0.42;
  const incl = 0.58;
  const pitch = 0.3;
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);

  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const X = (gx + 0.5) * cw;
      const Y = (gy + 0.5) * ch;
      const id = gx * 131 + gy * 977;
      const wx = o.x0 + X / o.z - o.cx;
      const wy = o.y0 + Y / o.z - o.cy;

      /* Into the galaxy's own plane: unrotate, then undo the inclination. */
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

      /* Star-forming knots, pink, scattered along the arms. */
      if (arm > 0.55 && r > 0.12 && r < 0.95 && n > 0.62 && hash(id, 71) < 0.5) {
        put(KNOT, 2, X, Y, n > 0.68 ? "+" : ":");
        continue;
      }
      if (d > 0.03 && hash(id, 7) < Math.min(0.72, d * 1.9)) {
        /* Jitter the ramp per cell, so dense regions read as a crowd of
           stars rather than as rows of type. */
        const jitter = (hash(id, 8) - 0.5) * 2.4;
        const i = Math.max(0, Math.min(RAMP.length - 1, Math.floor(d * 4.5 + jitter)));
        const lvl = Math.max(0, Math.min(3, Math.floor(d * 3.2 + jitter * 0.6)));
        put(r < 0.2 ? CORE : dust > 0.35 ? DUST : ARM, lvl, X, Y, RAMP[i]);
        continue;
      }
      /* The deep field: faint stars everywhere, a few bright ones. */
      const hs = hash(id, 9);
      if (hs > 0.985)
        put(FIELD, hs > 0.998 ? 3 : hs > 0.993 ? 1 : 0, X, Y, hs > 0.998 ? "+" : ".");
    }
  }

  g.font = o.font;
  g.textAlign = "center";
  g.textBaseline = "middle";
  for (const [key, b] of buckets) {
    const [color, lvl] = key.split("|");
    g.fillStyle = color;
    g.globalAlpha = [0.28, 0.45, 0.65, 0.9][Number(lvl)];
    for (let j = 0; j < b.x.length; j++) g.fillText(b.c[j], b.x[j], b.y[j]);
  }
  g.globalAlpha = 1;

  /* A soft glow under the core, so the centre reads as light, not text. */
  const ccx = (o.cx - o.x0) * o.z;
  const ccy = (o.cy - o.y0) * o.z;
  const rr = o.radius * o.z * 0.42;
  const grad = g.createRadialGradient(ccx, ccy, 0, ccx, ccy, rr);
  grad.addColorStop(0, "rgba(255,220,176,0.3)");
  grad.addColorStop(0.4, "rgba(255,210,170,0.08)");
  grad.addColorStop(1, "rgba(255,220,176,0)");
  g.globalCompositeOperation = "lighter";
  g.fillStyle = grad;
  g.fillRect(ccx - rr, ccy - rr, rr * 2, rr * 2);
  g.globalCompositeOperation = "source-over";

  return { canvas, x0: o.x0, y0: o.y0, x1: o.x1, y1: o.y1 };
}
