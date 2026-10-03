"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import {
  getIntroOver,
  getMuted,
  markIntroOver,
  setMusicPrimer,
  setMuted,
  subscribeMuted,
} from "@/lib/sound-pref";

import s from "@/components/universe/universe.module.css";

/**
 * The site's music, and the switch that silences it.
 *
 * It starts once the opening is over and plays on for the rest of the visit,
 * across page changes: this lives in the layout, above every page.
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
export function Music() {
  const ready = useSyncExternalStore(subscribeMuted, getIntroOver, () => false);
  const muted = useSyncExternalStore(subscribeMuted, getMuted, () => false);
  /* Whether sound is actually coming out. On a first visit the browser
     blocks it until the visitor touches the page, so this can be false
     while the switch is on. */
  const [playing, setPlaying] = useState(false);
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
    /* Started silently inside the opening's first press and stopped at
       once, so the browser lets it play for real when the opening ends. */
    let priming = false;
    setMusicPrimer(() => {
      if (!audio.paused || wantRef.current) return;
      priming = true;
      audio.muted = true;
      audio.play().then(
        () => {
          if (!wantRef.current) {
            audio.pause();
            audio.currentTime = 0;
          }
          audio.muted = false;
          priming = false;
          setPlaying(!audio.paused);
        },
        () => {
          audio.muted = false;
          priming = false;
        },
      );
    });
    const on = () => !priming && setPlaying(true);
    const off = () => !priming && setPlaying(false);
    audio.addEventListener("playing", on);
    audio.addEventListener("pause", off);
    return () => {
      setMusicPrimer(null);
      audio.removeEventListener("playing", on);
      audio.removeEventListener("pause", off);
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
      /* Blocked: the first real gesture is the permission. (Scrolling
         doesn't count as one in any browser; a press or a key does.) */
      const events = [
        "pointerdown",
        "pointerup",
        "click",
        "keydown",
        "touchend",
      ] as const;
      const go = () => {
        off();
        if (wantRef.current) void start();
      };
      events.forEach((e) => window.addEventListener(e, go, { once: true }));
      off = () => events.forEach((e) => window.removeEventListener(e, go));
    });
    return () => off();
  }, [want]);

  /* Switched on but silent (blocked, or the opening isn't over yet): a press
     means "play", not "mute". The gesture listener above has already started
     it by the time the click lands. */
  const waiting = !muted && !playing;

  return (
    <button
      type="button"
      className={s.sound}
      data-muted={muted || waiting}
      aria-pressed={muted}
      aria-label={muted || waiting ? "Play the music" : "Mute the music"}
      onClick={() => {
        if (waiting) markIntroOver();
        else setMuted(!muted);
      }}
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
