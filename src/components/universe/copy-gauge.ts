/**
 * Whether copying a WebGL canvas into a 2D canvas is cheap here.
 *
 * The GPU layers (glyph-gl.ts, dither-gl.ts) draw into a WebGL canvas and
 * copy the result into the page's 2D canvas. In Chrome that copy stays on
 * the GPU and costs nothing on the main thread (0.1 ms). In Firefox the 2D
 * canvas can live in main memory, and then each copy reads the pixels back
 * from the GPU and blocks for 10 to 40 ms, far more than it saves. There is
 * no way to ask which it is. Two tests stand in for the question:
 *   - Firefox (Gecko) defers the readback to later in its frame, where it
 *     can't be timed, and was two to three times slower with the GPU
 *     layers than without them: there the CPU always draws (`copiesWell`);
 *   - elsewhere a readback, if there is one (Chrome without its GPU, say),
 *     is synchronous, so the call itself takes that long. Each layer times
 *     its first copies and, if they are slow, steps aside for its CPU path
 *     for the rest of the visit.
 */

/** False where copying out of WebGL is known to cost more than it saves. */
export const copiesWell = () =>
  typeof CSS === "undefined" || !CSS.supports("-moz-appearance", "none");

/* How many copies are timed before deciding, and the median that counts
   as slow: well above a GPU copy, well below a readback. */
const SAMPLES = 12;
const SLOW_MS = 3;

export type CopyGauge = {
  /** Time one copy. */
  time(copy: () => void): void;
  /** True once the copies have been found slow. */
  readonly slow: boolean;
};

export function copyGauge(): CopyGauge {
  const times: number[] = [];
  let slow = false;
  return {
    time(copy) {
      if (times.length >= SAMPLES) {
        copy();
        return;
      }
      const t = performance.now();
      copy();
      times.push(performance.now() - t);
      if (times.length === SAMPLES) {
        const sorted = [...times].sort((a, b) => a - b);
        slow = sorted[SAMPLES >> 1] > SLOW_MS;
      }
    },
    get slow() {
      return slow;
    },
  };
}
