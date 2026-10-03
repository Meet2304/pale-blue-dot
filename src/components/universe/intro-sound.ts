/**
 * The opening's sound, synthesised with the Web Audio API: no files to load,
 * nothing to license.
 *
 * Modelled on the "text being written" ticks in OpenAI's "Refreshed." film,
 * which Meet asked for, by measuring them rather than sampling them: a very
 * short burst of a pure 1.3 kHz tone, swelling and fading within 5 ms, over
 * a faint low ring near 190 Hz. Every tick is the same sound; the rhythm
 * carries it. The ticks follow the text as it loads (intro-timeline.ts), so
 * the pauses between words are silent.
 *
 * The whole run of ticks is scheduled up front on the audio clock, which is
 * sample-accurate, rather than fired frame by frame from the animation: the
 * rhythm is then identical on every visit, however the frames fall.
 *
 * Browsers only let a page make sound after the visitor has interacted with
 * it, so the opening first asks for a click or a key and calls `unlock` in
 * that gesture. If the audio still isn't running when the text begins,
 * nothing is scheduled at all, so no ticks can pile up and fire late.
 */

import { getMuted } from "@/lib/sound-pref";

import { whenIdle } from "./helpers";

export type IntroSound = {
  /**
   * Schedule ticks at `times` (ms from `lead` ms from now), each placed at
   * `pans[i]`, -1 (left) to 1 (right). Returns false if sound can't play.
   */
  play: (times: number[], pans: number[], lead: number) => boolean;
  /** Silence anything still to come, at once. */
  stop: () => void;
  /** Release the audio device once the last tick has rung out. */
  close: () => void;
  /**
   * Whether sound can already play without a gesture: the browser said so,
   * or this page has been interacted with.
   */
  allowed: () => Promise<boolean>;
  /**
   * Start the audio device. Call it inside a click or key handler: that
   * gesture is what lets the browser play sound. Resolves once it runs, or
   * fails to.
   */
  unlock: () => Promise<void>;
};

const silent: IntroSound = {
  play: () => false,
  stop() {},
  close() {},
  allowed: () => Promise.resolve(true),
  unlock: () => Promise.resolve(),
};

type Policy = { getAutoplayPolicy?: (type: "audiocontext") => string };
type Activation = { userActivation?: { hasBeenActive: boolean } };

/* The tick's envelope: a smooth swell and fade over 5 ms, so the tick is
   about six cycles of a pure tone. A sharp attack instead would make it a
   broadband click, harsher than the reference. */
const TICK_MS = 5;
const TICK_SHAPE = Float32Array.from({ length: 48 }, (_, i) => {
  const x = i / 47;
  return 0.6 * Math.sin(Math.PI * x) ** 2 * (1 - 0.35 * x);
});

const tick = (ctx: AudioContext, out: GainNode, at: number, pan: number) => {
  const place = ctx.createStereoPanner();
  place.pan.value = pan;
  place.connect(out);

  /* The tick itself. */
  const tone = ctx.createOscillator();
  const toneEnv = ctx.createGain();
  tone.frequency.value = 1300;
  toneEnv.gain.value = 0;
  toneEnv.gain.setValueCurveAtTime(TICK_SHAPE, at, TICK_MS / 1000);
  tone.connect(toneEnv).connect(place);
  tone.start(at);
  tone.stop(at + TICK_MS / 1000 + 0.005);

  /* The body under it: a faint low ring that lingers a little. */
  const body = ctx.createOscillator();
  const bodyEnv = ctx.createGain();
  body.frequency.value = 190;
  bodyEnv.gain.setValueAtTime(0, at + 0.002);
  bodyEnv.gain.linearRampToValueAtTime(0.08, at + 0.004);
  bodyEnv.gain.exponentialRampToValueAtTime(0.0001, at + 0.026);
  body.connect(bodyEnv).connect(place);
  body.start(at);
  body.stop(at + 0.03);
  body.onended = () => place.disconnect();
};

export function createIntroSound(): IntroSound {
  if (
    typeof window === "undefined" ||
    typeof AudioContext === "undefined" ||
    getMuted()
  ) {
    return silent;
  }

  let ctx: AudioContext | null = null;
  let out: GainNode | null = null;
  let end = 0;
  let closed = false;
  const open = () => {
    if (closed || ctx) return;
    ctx = new AudioContext();
    ctx.resume().catch(() => {});
    /* A gentle compressor keeps a quick run of ticks from ever clipping. */
    out = ctx.createGain();
    out.gain.value = 0.5;
    const limit = ctx.createDynamicsCompressor();
    limit.threshold.value = -14;
    limit.ratio.value = 4;
    out.connect(limit).connect(ctx.destination);
  };
  /* Opening the audio device is slow (tens of ms): it waits for the first
     quiet moment after the page has come up, which is long before the
     text begins. */
  const cancelOpen = whenIdle(open, 400);

  /* Ask the browser itself: open the device and see whether it starts.
     Where it is allowed to (a page already clicked on, a reload after a
     click, a site Chrome trusts), it runs within a few ms; where it isn't,
     it stays suspended until a gesture. */
  const allowed = async () => {
    if ((navigator as Navigator & Activation).userActivation?.hasBeenActive)
      return true;
    if (
      (navigator as Navigator & Policy).getAutoplayPolicy?.("audiocontext") ===
      "allowed"
    )
      return true;
    open();
    const c = ctx as AudioContext | null;
    if (!c) return false;
    await Promise.race([
      c.resume().catch(() => {}),
      new Promise<void>((r) => setTimeout(r, 150)),
    ]);
    return c.state === "running";
  };

  const unlock = () => {
    open();
    const c = ctx as AudioContext | null;
    if (!c || c.state === "running") return Promise.resolve();
    /* Never wait long: the opening goes on with or without sound. */
    return Promise.race([
      c.resume().catch(() => {}),
      new Promise<void>((r) => setTimeout(r, 300)),
    ]);
  };

  const play = (times: number[], pans: number[], lead: number) => {
    const c = ctx;
    const o = out;
    if (!c || !o || c.state !== "running") return false;
    /* The screen shows a frame a little after it is drawn, and the speakers
       play a sample a little after it is scheduled; take the audio's own
       delay off so each tick lands with its glyph. */
    const delay = c.outputLatency || c.baseLatency || 0;
    const base = c.currentTime + Math.max(0, lead / 1000 - delay);
    times.forEach((t, i) => tick(c, o, base + t / 1000, pans[i] ?? 0));
    end = base + (times[times.length - 1] ?? 0) / 1000;
    return true;
  };

  const stop = () => {
    if (!ctx || !out) return;
    const now = ctx.currentTime;
    out.gain.cancelScheduledValues(now);
    out.gain.setTargetAtTime(0, now, 0.008);
    end = now;
  };

  const close = () => {
    closed = true;
    cancelOpen();
    const c = ctx;
    if (!c) return;
    const wait = Math.max(0, end - c.currentTime) * 1000 + 200;
    window.setTimeout(() => c.close().catch(() => {}), wait);
  };

  return { play, stop, close, allowed, unlock };
}

/**
 * The tick for a press: the opening's tick, held a little longer (about
 * 12 ms of the same 1.3 kHz tone over a ring of the same low note) so it
 * still reads under the music, and on a quick run of presses.
 */
const PRESS_SHAPE = Float32Array.from({ length: 64 }, (_, i) => {
  const x = i / 63;
  return 0.9 * Math.sin(Math.PI * x) ** 2 * (1 - 0.3 * x);
});

const press = (ctx: AudioContext, out: GainNode, at: number) => {
  const tone = ctx.createOscillator();
  const toneEnv = ctx.createGain();
  tone.frequency.value = 1300;
  toneEnv.gain.value = 0;
  toneEnv.gain.setValueCurveAtTime(PRESS_SHAPE, at, 0.012);
  tone.connect(toneEnv).connect(out);
  tone.start(at);
  tone.stop(at + 0.02);

  const body = ctx.createOscillator();
  const bodyEnv = ctx.createGain();
  body.frequency.value = 190;
  bodyEnv.gain.setValueAtTime(0, at + 0.002);
  bodyEnv.gain.linearRampToValueAtTime(0.3, at + 0.006);
  bodyEnv.gain.exponentialRampToValueAtTime(0.0001, at + 0.07);
  body.connect(bodyEnv).connect(out);
  body.start(at);
  body.stop(at + 0.08);
};

/**
 * The same tick for a press: one, played the moment it is asked for, a little
 * lower than the opening's so it stays in the background. The audio device
 * opens on the first press (a gesture, so the browser allows it) and stays
 * open for the rest of the visit. If the browser has suspended it since
 * (an idle tab, a phone call, Safari's "interrupted"), the tick waits for
 * it to resume rather than being scheduled into a stopped clock and lost.
 */
export function createClickSound(): { ping: () => void; unlock: () => void } {
  let ctx: AudioContext | null = null;
  let out: GainNode | null = null;
  const sound = (c: AudioContext, o: GainNode) => press(c, o, c.currentTime + 0.002);
  /* Open the device, if it isn't, and hand back what the tick needs. */
  const open = () => {
    if (typeof AudioContext === "undefined") return null;
    if (!ctx || ctx.state === "closed") {
      ctx = new AudioContext();
      out = ctx.createGain();
      out.gain.value = 1;
      /* A run of quick presses must not clip. */
      const limit = ctx.createDynamicsCompressor();
      limit.threshold.value = -14;
      limit.ratio.value = 4;
      out.connect(limit).connect(ctx.destination);
    }
    return out ? ([ctx, out] as const) : null;
  };
  return {
    /* On the first gesture of any kind, so the device is already running
       by the time something is pressed. */
    unlock() {
      const o = open();
      if (o && o[0].state !== "running") o[0].resume().catch(() => {});
    },
    ping() {
      const o = open();
      if (!o) return;
      const [c, out] = o;
      if (c.state === "running") sound(c, out);
      else
        c.resume().then(
          () => sound(c, out),
          () => {},
        );
    },
  };
}
