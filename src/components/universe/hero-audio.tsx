"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

import { getMuted, setMuted, subscribeMuted } from "@/lib/sound-pref";

import s from "./universe.module.css";

/**
 * The site's music, and the switch that silences it.
 *
 * It starts once the opening is over and plays on for the rest of the visit.
 * Browsers refuse sound before the visitor has touched the page, so when the
 * first attempt is blocked it waits for the first tap, click or key and
 * starts then.
 *
 * The switch sits in the bottom-left corner, and what it was set to is
 * remembered for the next visit (sound-pref.ts). It silences every sound: the music, the clicks and the opening's ticks.
 */

const SRC = "/audio/soft-horizon.mp3";
const VOLUME = 0.5;
const FADE_IN = 2200;
const FADE_OUT = 700;
export function HeroAudio({ ready }: { ready: boolean }) {
  const muted = useSyncExternalStore(subscribeMuted, getMuted, () => false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRef = useRef(0);
  /* What the music should be doing right now, read by the gesture handler
     below without re-subscribing it. */
  const wantRef = useRef(false);
  const want = ready && !muted;

  /* The file, fetched while the opening plays so it is there when needed. */
  useEffect(() => {
    const audio = new Audio(SRC);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 0;
    audioRef.current = audio;
    return () => {
      cancelAnimationFrame(fadeRef.current);
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    wantRef.current = want;
    const audio = audioRef.current;
    if (!audio) return;

    const fadeTo = (to: number, ms: number, done?: () => void) => {
      cancelAnimationFrame(fadeRef.current);
      const from = audio.volume;
      const t0 = performance.now();
      const step = (now: number) => {
        /* A frame's timestamp can precede `t0` (it is the frame's start,
           not now), which would push the volume below 0 and throw. */
        const p = Math.max(0, Math.min(1, (now - t0) / ms));
        audio.volume = Math.max(0, Math.min(1, from + (to - from) * p));
        if (p < 1) fadeRef.current = requestAnimationFrame(step);
        else done?.();
      };
      fadeRef.current = requestAnimationFrame(step);
    };

    if (!want) {
      if (!audio.paused) fadeTo(0, FADE_OUT, () => audio.pause());
      return;
    }

    const start = () =>
      audio.play().then(
        () => {
          fadeTo(VOLUME, FADE_IN);
          return true;
        },
        () => false,
      );

    let off = () => {};
    start().then((ok) => {
      if (ok || !wantRef.current) return;
      /* Blocked: the first real gesture is the permission. */
      const events = ["pointerdown", "keydown", "touchend"] as const;
      const go = () => {
        off();
        if (wantRef.current) void start();
      };
      events.forEach((e) => window.addEventListener(e, go, { once: true }));
      off = () => events.forEach((e) => window.removeEventListener(e, go));
    });
    return () => off();
  }, [want]);

  return (
    <button
      type="button"
      className={s.sound}
      data-muted={muted}
      aria-pressed={muted}
      aria-label={muted ? "Unmute the music" : "Mute the music"}
      onClick={() => setMuted(!muted)}
    >
      <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden>
        {[3, 7, 11, 15].map((x, i) => (
          <rect
            key={x}
            className={s.soundBar}
            x={x}
            y="4"
            width="2"
            height="12"
            rx="1"
            style={{ animationDelay: `${i * -0.35}s` }}
          />
        ))}
      </svg>
    </button>
  );
}
