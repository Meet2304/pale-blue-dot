import type { BodyFn } from "./bodies";
import { rampAt } from "./orb";

/**
 * A supernova going off again, as both of the site's supernovae do: the
 * award's chapter on the home page (universe-canvas.tsx) and the head of
 * the award's own page (nova.tsx). A shockwave of characters runs out from
 * the core, and the core flashes white. It happens every ten seconds or so
 * while it's on screen, a moment after it arrives.
 */

/** How often it goes off, in ms, and how long after arriving the first. */
export const NOVA_EVERY = 10000;
export const NOVA_FIRST = 1500;
/** How fast a wave runs out (radii a second) and how long it lasts (s). */
export const WAVE_SPEED = 1.5;
export const WAVE_LIFE = 1.15;

/**
 * Where in its cycle a supernova is, `ms` after it came on screen: the
 * seconds since it last went off, while that burst is still running;
 * otherwise -1.
 */
export function burstAge(ms: number) {
  if (ms < NOVA_FIRST) return -1;
  const age = ((ms - NOVA_FIRST) % NOVA_EVERY) / 1000;
  return age < WAVE_LIFE ? age : -1;
}

/** The white of the core's flash, `age` seconds into a burst: 0 to 1. */
export const flashAt = (age: number) => (age < 0 ? 0 : Math.exp(-age * 3.2));

/* A cell on a wave's front, drawn dense and bright, fading as the wave
   runs out; `ages` in seconds. */
function onWave(nx: number, ny: number, ages: number[], o: Parameters<BodyFn>[4]) {
  const r = Math.hypot(nx, ny);
  for (const age of ages) {
    const off = Math.abs(r - (0.12 + age * WAVE_SPEED));
    if (off < 0.075) {
      const v = (1 - off / 0.075) * (1 - age / WAVE_LIFE);
      o.c = rampAt(0.45 + v * 0.5);
      o.k = v > 0.5 ? 6 : 4;
      o.a = Math.min(1, 0.4 + v);
      return true;
    }
  }
  return false;
}

/** The body, crossed by its waves. */
export function withWaves(fn: BodyFn, ages: number[]): BodyFn {
  if (!ages.length) return fn;
  return (nx, ny, id, f, o) => onWave(nx, ny, ages, o) || fn(nx, ny, id, f, o);
}

/**
 * The waves alone, to draw over a body already drawn: cheap, since most
 * cells are off them and the body's own cells aren't worked out again.
 */
export const waveCells =
  (ages: number[]): BodyFn =>
  (nx, ny, _id, _f, o) =>
    onWave(nx, ny, ages, o);

/** The core's flash: white-hot, added over the body's light. */
export function drawFlash(
  g: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  R: number,
  k: number,
) {
  if (k <= 0.01) return;
  const r = R * (0.35 + k * 0.45);
  const core = g.createRadialGradient(cx, cy, 0, cx, cy, r);
  core.addColorStop(0, `rgba(255,255,255,${0.75 * k})`);
  core.addColorStop(0.3, `rgba(255,255,255,${0.25 * k})`);
  core.addColorStop(1, "rgba(255,255,255,0)");
  g.save();
  g.globalCompositeOperation = "lighter";
  g.fillStyle = core;
  g.fillRect(cx - r, cy - r, r * 2, r * 2);
  g.restore();
}
