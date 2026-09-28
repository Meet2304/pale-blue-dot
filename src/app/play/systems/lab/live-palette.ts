import { hexToRgb } from "../engine";

export type RGB = [number, number, number];

/**
 * A palette that eases toward whatever the ref currently holds. Canvases call
 * `tick()` once per frame; it returns true while colours are still moving, so
 * a canvas can rebuild any cached fill styles only when it needs to.
 */
export function livePalette(ref: { current: string[] }) {
  let live: RGB[] = ref.current.map(hexToRgb);
  const css = (c: RGB, a = 1) =>
    a >= 1
      ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`
      : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  return {
    get: () => live,
    css,
    tick(rate = 0.06) {
      const target = ref.current.map(hexToRgb);
      let delta = 0;
      live = live.map((c, i) =>
        c.map((v, k) => {
          const nv = v + (target[i][k] - v) * rate;
          delta += Math.abs(target[i][k] - nv);
          return nv;
        }),
      ) as RGB[];
      return delta > 1;
    },
  };
}

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const smooth = (k: number) => k * k * (3 - 2 * k);
export const hash = (i: number, e = 0) => {
  const s = Math.sin(i * 12.9898 + e * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

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
