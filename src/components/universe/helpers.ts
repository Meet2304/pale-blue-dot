/**
 * The small, dependency-free helpers the universe draws with. They began life
 * in the `play` branch's design-system explorations and moved here when the
 * universe became the home page.
 */

/** A seeded random stream, so every visit draws the same sky. */
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

/** Size a canvas to its box at a capped device pixel ratio. */
export function fit(canvas: HTMLCanvasElement, maxDpr = 2) {
  const box = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  const w = Math.max(1, box.width);
  const h = Math.max(1, box.height);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  return { w, h, dpr };
}

/**
 * OKLCH to sRGB hex, clamped into gamut.
 *
 * The kinds of work are defined in OKLCH (perceptual lightness, chroma, hue)
 * rather than picked as hex by feel: only then are they equally bright to the
 * eye, so any one of them can be swapped without the page going out of
 * balance.
 */
export function oklch(l: number, c: number, h: number): string {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
  return (
    "#" +
    lin
      .map((v) => {
        const g = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
        const byte = Math.round(Math.min(1, Math.max(0, g)) * 255);
        return byte.toString(16).padStart(2, "0");
      })
      .join("")
  );
}
