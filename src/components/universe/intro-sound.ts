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
 * it, so on most first visits this stays silent and the opening plays as
 * before. If the audio isn't running when the text begins, nothing is
 * scheduled at all, so no ticks can pile up and fire late.
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
};

const silent: IntroSound = { play: () => false, stop() {}, close() {} };

type Policy = { getAutoplayPolicy?: (type: "audiocontext") => string };

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

  /* Where the browser can say in advance that sound is blocked (Firefox),
     don't open the audio device at all. */
  const policy = (navigator as Navigator & Policy).getAutoplayPolicy?.("audiocontext");
  if (policy === "disallowed") return silent;

  /* Opening the audio device is slow (tens of ms): it waits for the first
     quiet moment after the page has come up, which is long before the
     text begins. */
  let ctx: AudioContext | null = null;
  let out: GainNode | null = null;
  let end = 0;
  let closed = false;
  const cancelOpen = whenIdle(() => {
    if (closed) return;
    ctx = new AudioContext();
    ctx.resume().catch(() => {});
    /* A gentle compressor keeps a quick run of ticks from ever clipping. */
    out = ctx.createGain();
    out.gain.value = 0.5;
    const limit = ctx.createDynamicsCompressor();
    limit.threshold.value = -14;
    limit.ratio.value = 4;
    out.connect(limit).connect(ctx.destination);
  }, 400);

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

  return { play, stop, close };
}

/**
 * The same tick for a press: one, played the moment it is asked for, a little
 * lower than the opening's so it stays in the background. The audio device
 * opens on the first press (a gesture, so the browser allows it) and stays
 * open for the rest of the visit. If the browser has suspended it since
 * (an idle tab, a phone call, Safari's "interrupted"), the tick waits for
 * it to resume rather than being scheduled into a stopped clock and lost.
 */
export function createClickSound(): { ping: () => void } {
  let ctx: AudioContext | null = null;
  let out: GainNode | null = null;
  const sound = (c: AudioContext, o: GainNode) => tick(c, o, c.currentTime + 0.003, 0);
  return {
    ping() {
      if (typeof AudioContext === "undefined") return;
      if (!ctx || ctx.state === "closed") {
        ctx = new AudioContext();
        out = ctx.createGain();
        out.gain.value = 0.7;
        out.connect(ctx.destination);
      }
      const c = ctx;
      const o = out;
      if (!o) return;
      if (c.state === "running") sound(c, o);
      else
        c.resume().then(
          () => sound(c, o),
          () => {},
        );
    },
  };
}
