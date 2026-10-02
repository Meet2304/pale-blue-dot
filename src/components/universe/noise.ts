/**
 * Small, dependency-free 3D value noise. Good enough for continents, clouds
 * and turbulence, and cheap enough to run a few thousand times a frame.
 */

const PERM = new Uint8Array(512);
{
  const p = Array.from({ length: 256 }, (_, i) => i);
  let seed = 1337;
  for (let i = 255; i > 0; i--) {
    seed = (seed * 16807) % 2147483647;
    const j = seed % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
}

const fade = (t: number) => t * t * (3 - 2 * t);
const val = (x: number, y: number, z: number) =>
  PERM[(PERM[(PERM[x & 255] + y) & 511] + z) & 511] / 255;

function noise3(x: number, y: number, z: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = fade(x - xi);
  const yf = fade(y - yi);
  const zf = fade(z - zi);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const x0 = xi & 255;
  const y0 = yi & 255;
  const z0 = zi & 255;
  const x1 = (xi + 1) & 255;
  const y1 = (yi + 1) & 255;
  const z1 = (zi + 1) & 255;
  return lerp(
    lerp(
      lerp(val(x0, y0, z0), val(x1, y0, z0), xf),
      lerp(val(x0, y1, z0), val(x1, y1, z0), xf),
      yf,
    ),
    lerp(
      lerp(val(x0, y0, z1), val(x1, y0, z1), xf),
      lerp(val(x0, y1, z1), val(x1, y1, z1), xf),
      yf,
    ),
    zf,
  );
}

/** Fractal sum, normalised to roughly 0..1. */
export function fbm3(x: number, y: number, z: number, octaves = 4) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += noise3(x * freq, y * freq, z * freq) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
}
