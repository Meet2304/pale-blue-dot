/**
 * The deep sky's light, measured off the main thread (cosmos.ts,
 * buildSky). It is a few hundred milliseconds of noise sums, the same every
 * visit: worked out here it never takes a frame from the page, however soon
 * the visitor scrolls out to it.
 */
import { buildSky } from "./cosmos";

self.onmessage = () => {
  const sky = buildSky();
  (self as unknown as Worker).postMessage(sky, [
    sky.I.buffer,
    sky.top.buffer,
    sky.col.buffer,
    sky.kind.buffer,
    sky.dust.buffer,
    sky.ph.buffer,
  ]);
};
