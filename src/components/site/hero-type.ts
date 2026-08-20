import type { CSSProperties } from "react";

/**
 * Five candidate treatments for the hero line.
 *
 * Pick one with `?type=1` … `?type=5`. The active set is named in the corner
 * while a `type` param is present.
 *
 * The first attempt at this changed only the typeface and kept one centred
 * mixed-case line throughout, which is why all five read the same. These change
 * the composition too — alignment, stacking, case, the size relationship
 * between the two clauses — because that is where most of a treatment's
 * character actually lives.
 *
 * The line is "What's missing, I make." Two clauses with a turn between them,
 * so every set here puts them on separate lines and lets the second answer the
 * first in a different voice.
 *
 * All five depart from Horizon, which specifies Marcellus / Hanken Grotesk /
 * Space Mono. That is the point of the exercise, but it is a real divergence
 * from the system and worth deciding deliberately.
 */

export type HeroTypeSet = {
  id: number;
  name: string;
  note: string;
  /** Whole-block alignment inside the sky. */
  align: "center" | "left";
  /** Applied to the h1 — size, leading, case. */
  frame: CSSProperties;
  /** "What's missing," */
  lead: CSSProperties;
  /** "I make." — the accent clause. Colour comes from the h1 em rule. */
  accent: CSSProperties;
  /** The scroll cue, so each pairing is judged as a pairing. */
  eyebrow: CSSProperties;
};

const ARCHIVO = "var(--font-archivo), system-ui, sans-serif";
const MARTIAN = "var(--font-martian), ui-monospace, monospace";
const UNBOUNDED = "var(--font-unbounded), system-ui, sans-serif";
const BRICOLAGE = "var(--font-bricolage), system-ui, sans-serif";
const SYNE = "var(--font-syne), system-ui, sans-serif";

export const HERO_TYPE_SETS: HeroTypeSet[] = [
  {
    id: 1,
    name: "Title card",
    note: "Archivo ExtraLight, uppercase, tracked to 0.44em — small and wide, like a film title over the sea rather than a headline",
    align: "center",
    frame: {
      fontSize: "clamp(0.9rem, 2.05vw, 1.6rem)",
      lineHeight: 2.5,
      textTransform: "uppercase",
      /* Letter-spacing adds a trailing gap to every line, which drags centred
         text left by half of it. The indent puts it back. */
      textIndent: "0.44em",
      maxWidth: "30ch",
    },
    lead: { fontFamily: ARCHIVO, fontWeight: 200, letterSpacing: "0.44em" },
    accent: { fontFamily: ARCHIVO, fontWeight: 300, letterSpacing: "0.44em" },
    eyebrow: { fontFamily: ARCHIVO, fontWeight: 400, letterSpacing: "0.3em" },
  },
  {
    id: 2,
    name: "Ship's log",
    note: "Martian Mono, small and left-aligned with the answer indented — a readout, not a headline",
    align: "left",
    frame: {
      fontSize: "clamp(0.95rem, 2.1vw, 1.6rem)",
      lineHeight: 2,
      letterSpacing: "-0.02em",
      maxWidth: "26ch",
    },
    lead: { fontFamily: MARTIAN, fontWeight: 300 },
    accent: { fontFamily: MARTIAN, fontWeight: 500, paddingLeft: "3.2em" },
    eyebrow: { fontFamily: MARTIAN, fontWeight: 400, letterSpacing: "0.24em" },
  },
  {
    id: 3,
    name: "Weight break",
    note: "Unbounded at 200 answered by Unbounded at 800 — one family, the whole statement carried by the jump in weight",
    align: "center",
    frame: {
      fontSize: "clamp(2.1rem, 6.2vw, 5.2rem)",
      lineHeight: 1.04,
      maxWidth: "16ch",
    },
    lead: { fontFamily: UNBOUNDED, fontWeight: 200, letterSpacing: "-0.03em" },
    accent: { fontFamily: UNBOUNDED, fontWeight: 800, letterSpacing: "-0.05em" },
    eyebrow: { fontFamily: UNBOUNDED, fontWeight: 300, letterSpacing: "0.22em" },
  },
  {
    id: 4,
    name: "Scale jump",
    note: "Bricolage Grotesque — the first clause shrunk to a wide label, the second at full display size beneath it",
    align: "left",
    frame: {
      fontSize: "clamp(2.6rem, 8vw, 6.4rem)",
      lineHeight: 1.02,
      maxWidth: "14ch",
    },
    lead: {
      fontFamily: BRICOLAGE,
      fontWeight: 500,
      fontSize: "0.26em",
      letterSpacing: "0.2em",
      textTransform: "uppercase",
      paddingBottom: "0.9em",
    },
    accent: { fontFamily: BRICOLAGE, fontWeight: 700, letterSpacing: "-0.04em" },
    eyebrow: { fontFamily: BRICOLAGE, fontWeight: 500, letterSpacing: "0.24em" },
  },
  {
    id: 5,
    name: "Inverted",
    note: "Syne, lowercase and very tight, with the weight dropping on the answer instead of rising — the quiet half is the loud one",
    align: "left",
    frame: {
      fontSize: "clamp(2.7rem, 8.4vw, 6.8rem)",
      lineHeight: 0.94,
      textTransform: "lowercase",
      maxWidth: "13ch",
    },
    lead: { fontFamily: SYNE, fontWeight: 700, letterSpacing: "-0.045em" },
    accent: { fontFamily: SYNE, fontWeight: 400, letterSpacing: "-0.025em" },
    eyebrow: { fontFamily: SYNE, fontWeight: 600, letterSpacing: "0.26em" },
  },
];

export function heroTypeSetFrom(search: string): HeroTypeSet {
  const requested = Number(new URLSearchParams(search).get("type"));
  return HERO_TYPE_SETS.find((set) => set.id === requested) ?? HERO_TYPE_SETS[0];
}

export function heroTypeRequested(search: string): boolean {
  return new URLSearchParams(search).has("type");
}
