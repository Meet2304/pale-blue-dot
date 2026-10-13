/**
 * Starts the deep sky's measuring in a worker (cosmos.worker.ts). Kept
 * apart from cosmos.ts, which the worker itself imports: a module that both
 * starts the worker and is bundled into it would make the worker its own
 * dependency.
 */
import { SKY_ROWS, type Cosmos, type Sky } from "./cosmos";

/* Written out in full, in one expression, so the bundler sees the worker
   and builds it as an entry of its own (with no extension: with one, it is
   copied as a plain file). A classic worker: the bundler's loader in it
   brings its chunks in with importScripts. */
const spawn = () => new Worker(new URL("./cosmos.worker", import.meta.url));

/* One worker a visit, however often the universe is opened. */
let measuring: Promise<Sky> | null = null;

/**
 * Measure the sky in a worker, and put it in `c` when it is done. Returns
 * false where a worker can't be had; the page's quiet moments measure it
 * then, as before.
 */
export function buildCosmosOffThread(c: Cosmos, onReady: () => void) {
  if (c.readyAt) {
    onReady();
    return true;
  }
  if (!measuring) {
    let worker: Worker;
    try {
      worker = spawn();
    } catch {
      return false;
    }
    measuring = new Promise<Sky>((resolve, reject) => {
      worker.onmessage = (e: MessageEvent<Sky>) => {
        resolve(e.data);
        worker.terminate();
      };
      worker.onerror = (e) => {
        e.preventDefault();
        worker.terminate();
        reject(new Error("sky worker"));
      };
      worker.postMessage(0);
    });
  }
  measuring.then(
    (sky) => {
      if (c.readyAt) return;
      Object.assign(c, sky);
      c.built = SKY_ROWS;
      c.readyAt = performance.now();
      onReady();
    },
    () => {
      measuring = null;
    },
  );
  return true;
}
