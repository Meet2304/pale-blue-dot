"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { now, person, projects, skills, socials, turns } from "../content";
import s from "./golden-record.module.css";

/**
 * Voyager carried a gold record so that whoever found it would know who had
 * sent it. This is that record for one person: a sleeve, two sides, and a
 * tracklist. Playing a track reads it out word by word while the words become
 * a signal on the scope, the way the real record carried pictures as sound.
 */

type Track = { side: "A" | "B"; title: string; lines: string[] };

const TRACKS: Track[] = [
  { side: "A", title: "Greeting", lines: [`Hello. I'm ${person.name}.`, person.intro] },
  {
    side: "A",
    title: "The dot",
    lines: [person.whyShort, "Everything on this record is part of that attempt."],
  },
  ...projects.map((p) => ({
    side: "A" as const,
    title: p.name,
    lines: [p.move, p.before, p.choice, p.tradeoff, p.shift],
  })),
  {
    side: "B",
    title: "Instruments",
    lines: skills.map((g) => `${g.group}: ${g.items.join(", ")}.`),
  },
  { side: "B", title: "Turns", lines: turns.map((t) => `${t.year}. ${t.text}`) },
  { side: "B", title: "Now", lines: now },
  {
    side: "B",
    title: "Reply",
    lines: [
      "If you've found this, write back. I read everything.",
      "LinkedIn, GitHub, and X are below.",
    ],
  },
];

/** Reading pace, in ms per word. Also sets each track's printed length. */
const MS_PER_WORD = 260;
/** 33⅓ rpm, which is one turn every 1.8 seconds. */
const TURN_S = 1.8;

const words = (t: Track) => t.lines.join(" ").split(/\s+/).length;
const duration = (t: Track) => {
  const secs = Math.round((words(t) * MS_PER_WORD) / 1000);
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
};

/** Groove radii, as a fraction of the record's radius, from the rim inwards. */
const OUTER = 0.93;
const INNER = 0.42;

/** Each side's tracks share the playable band in proportion to their length. */
function layoutSide(side: "A" | "B") {
  const list = TRACKS.map((t, i) => ({ t, i })).filter((x) => x.t.side === side);
  const total = list.reduce((n, x) => n + words(x.t), 0);
  const gap = 0.012;
  const band = OUTER - INNER - gap * (list.length - 1);
  let r = OUTER;
  return list.map((x) => {
    const span = (words(x.t) / total) * band;
    const out = { index: x.i, from: r, to: r - span };
    r -= span + gap;
    return out;
  });
}

const GROOVES = { A: layoutSide("A"), B: layoutSide("B") };

/**
 * The tonearm's geometry in its own 100-unit box: it pivots at PIVOT, its
 * stylus rests at TIP when unrotated, and the record (92% of the deck) is
 * centred at 50,50. The swing for a given groove radius is found by bisection
 * rather than a hand-tuned range, so the needle really sits on the groove.
 */
const PIVOT = [88, 10];
const TIP = [68, 74];
const DISC_R = 46;

function armAngle(r: number) {
  const vx = TIP[0] - PIVOT[0];
  const vy = TIP[1] - PIVOT[1];
  const dist = (deg: number) => {
    const a = (deg * Math.PI) / 180;
    const x = PIVOT[0] + vx * Math.cos(a) - vy * Math.sin(a);
    const y = PIVOT[1] + vx * Math.sin(a) + vy * Math.cos(a);
    return Math.hypot(x - 50, y - 50);
  };
  let lo = -30;
  let hi = 30;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (dist(mid) > r * DISC_R) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** A word, as a signal: louder for longer words, pitch from its letters. */
function amplitude(word: string) {
  let h = 0;
  for (const ch of word) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return Math.min(1, 0.25 + word.length / 11) * (0.6 + (h / 997) * 0.4);
}

export function GoldenRecord() {
  const [intro, setIntro] = useState(true);
  const [track, setTrack] = useState(0);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [side, setSide] = useState<"A" | "B">("A");
  const scopeRef = useRef<HTMLCanvasElement>(null);

  const current = TRACKS[track];
  const trackWords = useMemo(() => current.lines.join(" ").split(/\s+/), [current]);
  /* The album has ended once the last word of the last track is heard. */
  const spinning =
    playing && !(track === TRACKS.length - 1 && progress >= trackWords.length);

  /* The one orchestrated moment: the sleeve slides away, and the needle drops
     on the first track. */
  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const a = setTimeout(() => setIntro(false), still ? 0 : 900);
    const b = setTimeout(() => setPlaying(true), still ? 0 : 2600);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);

  useEffect(() => {
    if (!playing) return;
    if (progress >= trackWords.length) {
      const next = track + 1;
      if (next >= TRACKS.length) return;
      const id = setTimeout(() => play(next), 1400);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setProgress((p) => p + 1), MS_PER_WORD);
    return () => clearTimeout(id);
  }, [playing, progress, trackWords.length, track]);

  function play(i: number) {
    setTrack(i);
    setProgress(0);
    setSide(TRACKS[i].side);
    setPlaying(true);
  }

  /* The scope: every word spoken so far, as a trace scrolling to the left. */
  useEffect(() => {
    const canvas = scopeRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "#e6c77f";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    const spoken = trackWords.slice(0, progress);
    const perWord = 26;
    const start = w - spoken.length * perWord;
    ctx.moveTo(0, h / 2);
    spoken.forEach((word, i) => {
      const a = amplitude(word) * (h * 0.42);
      const x0 = start + i * perWord;
      for (let k = 0; k <= perWord; k += 2) {
        const x = x0 + k;
        if (x < 0) continue;
        const env = Math.sin((k / perWord) * Math.PI);
        const y = h / 2 + Math.sin(k * (0.35 + word.length * 0.05)) * a * env;
        ctx.lineTo(x, y);
      }
    });
    ctx.lineTo(w, h / 2);
    ctx.stroke();
  }, [progress, trackWords]);

  /* Where the needle sits: along this track's grooves by how much is read. */
  const groove = GROOVES[current.side].find((g) => g.index === track)!;
  const through = trackWords.length ? progress / trackWords.length : 0;
  const needleR = intro ? 1.15 : groove.from - (groove.from - groove.to) * through;
  const armDeg = needleR > 1 ? -24 : armAngle(needleR);

  let wordIndex = 0;

  return (
    <main id="content" className={s.root}>
      <header className={s.head}>
        <h1 className={s.title}>A record, for whoever finds it</h1>
        <p className={s.by}>Sent by {person.name}, from the third planet</p>
      </header>

      <div className={s.stage}>
        <div className={s.deck}>
          <div key={side} className={s.platter} data-side={side}>
            <div
              className={s.disc}
              style={{
                animationDuration: `${TURN_S}s`,
                animationPlayState: spinning ? "running" : "paused",
              }}
            >
              <svg viewBox="-1 -1 2 2" className={s.grooves} aria-hidden>
                {GROOVES[side].map((g) => (
                  <g key={g.index}>
                    <circle r={g.from} className={s.edge} />
                    <circle
                      r={(g.from + g.to) / 2}
                      className={s.band}
                      strokeWidth={g.from - g.to}
                    />
                  </g>
                ))}
              </svg>
              <div className={s.label}>
                <span className={s.labelName}>{person.name}</span>
                <span className={s.labelSide}>Side {side}</span>
              </div>
            </div>
          </div>

          <svg
            className={s.arm}
            viewBox="0 0 100 100"
            aria-hidden
            style={{ rotate: `${armDeg}deg` }}
          >
            <circle cx="88" cy="10" r="5" className={s.pivot} />
            <path d="M 88 10 L 84 58 L 70 74" className={s.armLine} />
            <rect
              x="64"
              y="72"
              width="9"
              height="5"
              rx="1"
              transform="rotate(-40 68 74)"
              className={s.head2}
            />
          </svg>

          <div className={s.sleeve} data-open={!intro} aria-hidden>
            <SleeveArt />
          </div>
        </div>

        <div className={s.side}>
          <ol className={s.tracks}>
            {TRACKS.map((t, i) => {
              const firstOfSide = i === 0 || TRACKS[i - 1].side !== t.side;
              return (
                <li key={t.title} data-first={firstOfSide ? t.side : undefined}>
                  <button
                    type="button"
                    className={s.track}
                    aria-current={i === track ? "true" : undefined}
                    onClick={() => play(i)}
                  >
                    <span className={s.tNum}>{i + 1}</span>
                    <span className={s.tTitle}>{t.title}</span>
                    <span className={s.tLen}>{duration(t)}</span>
                  </button>
                </li>
              );
            })}
          </ol>

          <section className={s.liner} aria-live="off">
            <div className={s.linerHead}>
              <h2>{current.title}</h2>
              <button
                type="button"
                className={s.control}
                onClick={() => {
                  if (progress >= trackWords.length) play(track);
                  else setPlaying((p) => !p);
                }}
              >
                {spinning ? "Pause" : "Play"}
              </button>
              <button
                type="button"
                className={s.control}
                onClick={() => setProgress(trackWords.length)}
              >
                Show all
              </button>
            </div>
            <canvas ref={scopeRef} className={s.scope} aria-hidden />
            <div className={s.text}>
              {current.lines.map((line, li) => (
                <p key={li}>
                  {line.split(/\s+/).map((word, wi) => {
                    const idx = wordIndex++;
                    return (
                      <span key={wi} className={s.word} data-heard={idx < progress}>
                        {word}{" "}
                      </span>
                    );
                  })}
                </p>
              ))}
            </div>
            {current.title === "Reply" && (
              <nav className={s.links} aria-label="Contact">
                <Link href="/story">Read the note</Link>
                {socials.map((l) => (
                  <a key={l.label} href={l.href} target="_blank" rel="noreferrer">
                    {l.label}
                  </a>
                ))}
              </nav>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

/**
 * The real cover explained how to play the record, in pictures, to someone
 * with no language in common. These are the same four diagrams, turned to
 * this record: how to play it, what it sounds like, where it came from, and
 * the unit everything else is measured in.
 */
function SleeveArt() {
  const pulsars = [
    0.9, 0.55, 0.75, 0.4, 0.62, 0.85, 0.5, 0.7, 0.35, 0.8, 0.45, 0.66, 0.58, 0.72,
  ];
  return (
    <svg viewBox="0 0 200 200" className={s.art}>
      {/* How to play it: the record seen from above and from the side. */}
      <g transform="translate(48 48)">
        <circle r="30" />
        <circle r="10" />
        <circle r="1.5" className={s.fill} />
        <path d="M 38 -26 L 12 -4" />
        <path d="M -30 44 L 30 44 M 0 38 L 0 50" />
      </g>
      {/* What it sounds like: one trace. */}
      <g transform="translate(118 30)">
        <path d="M 0 18 C 8 0, 12 36, 20 18 S 32 0, 40 18 S 52 36, 60 18" />
        <path d="M 0 40 L 60 40 M 0 36 L 0 44 M 60 36 L 60 44" />
      </g>
      {/* Where it came from: lines out to fixed points, and the dot at the centre. */}
      <g transform="translate(58 142)">
        {pulsars.map((len, i) => {
          const a = (i / pulsars.length) * Math.PI * 2 + 0.3;
          return (
            <path
              key={i}
              d={`M 0 0 L ${Math.cos(a) * len * 42} ${Math.sin(a) * len * 42}`}
            />
          );
        })}
        <circle r="2.4" className={s.blue} />
      </g>
      {/* The unit: one atom of hydrogen, two states. */}
      <g transform="translate(148 142)">
        <circle cx="-14" r="6" />
        <circle cx="-14" r="1.4" className={s.fill} />
        <circle cx="14" r="6" />
        <circle cx="14" r="1.4" className={s.fill} />
        <path d="M -14 16 L 14 16" />
      </g>
    </svg>
  );
}
