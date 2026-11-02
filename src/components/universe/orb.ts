/**
 * Light for the characters: what makes a body set in type read as a lit
 * orb, standing in front of the sky, rather than as type on a page. Every
 * canvas that draws a body uses it: the universe (universe-canvas.tsx), a
 * work page's portrait (body-portrait.tsx), the bar's panels
 * (kind-art.tsx) and the journey's globe (journey.tsx).
 *
 *   - The ramp: characters from the faintest mark to the densest, so a
 *     cell's light is told by how much ink it holds, and a sphere's shading
 *     reads as tone.
 *   - A shadow under a sphere: a dark disc, soft at its rim, so the stars
 *     behind it stop at its limb and its night side is night, not sky.
 *   - A glow over all of it: the canvas's own light, gathered at a quarter
 *     and a sixteenth of its size and laid back over it additively, a tight
 *     bloom and a wide one, the way light spills in a lens, and only round
 *     what's bright. The gathering halves the picture step by step (each
 *     step one drawImage, on the GPU), so the thin strokes of the
 *     characters are averaged, not skipped, and don't sparkle as they
 *     move.
 */

/** From the faintest mark to the densest. */
export const RAMP = ["·", ":", "+", "*", "x", "#", "%", "@"];

/** The ramp's character for a light from 0 to 1. */
export const rampAt = (v: number) =>
  RAMP[Math.max(0, Math.min(RAMP.length - 1, Math.floor(v * RAMP.length)))];

export const smoothstep = (a: number, b: number, x: number) => {
  const k = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

/**
 * The dark under a sphere of radius R at (cx, cy): nearly opaque to just
 * inside its limb, then soft, so its edge is light falling off, never a
 * line. On the night side the sphere simply ends in the dark.
 */
export function shadeSphere(
  g: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  R: number,
  alpha: number,
) {
  if (alpha <= 0.01 || R < 4) return;
  const edge = R * 1.02;
  const grad = g.createRadialGradient(cx, cy, 0, cx, cy, edge);
  grad.addColorStop(0, `rgba(1,2,5,${0.95 * alpha})`);
  grad.addColorStop(0.9, `rgba(1,2,5,${0.93 * alpha})`);
  grad.addColorStop(1, "rgba(1,2,5,0)");
  g.fillStyle = grad;
  g.beginPath();
  g.arc(cx, cy, edge, 0, Math.PI * 2);
  g.fill();
}

/** A canvas's light, gathered: the chain of halved copies. */
export type Glow = {
  steps: { c: HTMLCanvasElement; g: CanvasRenderingContext2D | null }[];
  ready: boolean;
};

export const createGlow = (): Glow => ({ steps: [], ready: false });

/* Four halvings: a half, a quarter, an eighth, a sixteenth. */
const STEPS = 4;

/**
 * Gather the light of `src` (the region sx, sy, sw, sh, in its pixels)
 * into the glow. Call it when what's drawn changes; shed it every frame.
 */
export function gatherGlow(
  glow: Glow,
  src: HTMLCanvasElement,
  sx = 0,
  sy = 0,
  sw = src.width,
  sh = src.height,
) {
  if (sw < 16 || sh < 16) {
    glow.ready = false;
    return;
  }
  let from: CanvasImageSource = src;
  let fx = sx;
  let fy = sy;
  let fw = sw;
  let fh = sh;
  for (let i = 0; i < STEPS; i++) {
    const w = Math.max(1, Math.ceil(fw / 2));
    const h = Math.max(1, Math.ceil(fh / 2));
    if (!glow.steps[i]) {
      const c = document.createElement("canvas");
      glow.steps[i] = { c, g: c.getContext("2d") };
    }
    const step = glow.steps[i];
    if (!step.g) {
      glow.ready = false;
      return;
    }
    if (step.c.width !== w || step.c.height !== h) {
      step.c.width = w;
      step.c.height = h;
    } else step.g.clearRect(0, 0, w, h);
    step.g.imageSmoothingEnabled = true;
    step.g.imageSmoothingQuality = "medium";
    step.g.drawImage(from, fx, fy, fw, fh, 0, 0, w, h);
    from = step.c;
    fx = 0;
    fy = 0;
    fw = w;
    fh = h;
  }
  /* Only highlights spill: each level the glow is shed from is multiplied
     by itself, so a bright cell keeps most of its light and a dim one
     almost none, as a lens blooms only round what's bright. */
  for (const i of [1, 3]) {
    const { c, g } = glow.steps[i];
    if (!g) continue;
    g.globalCompositeOperation = "multiply";
    g.drawImage(c, 0, 0);
    g.globalCompositeOperation = "source-over";
  }
  glow.ready = true;
}

/**
 * Lay the gathered light over `g`, additively, over the region it came
 * from (dx, dy, dw, dh, in g's pixels): a tight bloom from the quarter and
 * a wide one from the sixteenth.
 */
export function shedGlow(
  g: CanvasRenderingContext2D,
  glow: Glow,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  strength = 1,
) {
  if (!glow.ready || strength <= 0.01) return;
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = "lighter";
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = "high";
  const tight = glow.steps[1].c;
  const wide = glow.steps[3].c;
  g.globalAlpha = Math.min(1, 0.6 * strength);
  g.drawImage(tight, 0, 0, tight.width, tight.height, dx, dy, dw, dh);
  g.globalAlpha = Math.min(1, 0.8 * strength);
  g.drawImage(wide, 0, 0, wide.width, wide.height, dx, dy, dw, dh);
  g.restore();
}
