import type { CSSProperties } from "react";

/**
 * Five candidate type treatments for the hero line.
 *
 * Pick one with `?type=1` … `?type=5`. The active set's name is printed in the
 * corner while a `type` param is present, so the five can be told apart at a
 * glance; without the param the page renders set 1 and shows nothing.
 *
 * The line is "What's missing, I make." — two clauses with a turn between them,
 * so each set is free to treat them as two voices rather than one. Where a set
 * shifts face or style at the comma, that is the point of it: the sentence
 * changes speaker halfway through, and the type can say so.
 *
 * `scale` multiplies the display size, because these faces have very different
 * optical sizes at the same nominal point size — Cormorant sets small and light,
 * Instrument Serif sets large.
 *
 * Sets 2–5 depart from Horizon, which specifies Marcellus / Hanken Grotesk /
 * Space Mono. Set 1 is the system as written, kept as the control.
 */

export type HeroTypeSet = {
  id: number;
  name: string;
  note: string;
  /** Multiplies --text-display-xl. */
  scale: number;
  /** "What's missing," */
  lead: CSSProperties;
  /** "I make." — the accent clause. Colour comes from the h1 em rule. */
  accent: CSSProperties;
  /** The scroll cue, so the pairing is judged as a pairing. */
  eyebrow: CSSProperties;
};

export const HERO_TYPE_SETS: HeroTypeSet[] = [
  {
    id: 1,
    name: "Horizon",
    note: "Marcellus · Hanken Grotesk — the design system as written",
    scale: 1,
    lead: {
      fontFamily: "var(--font-display)",
      letterSpacing: "0.005em",
    },
    accent: {
      fontFamily: "var(--font-display)",
      letterSpacing: "0.005em",
    },
    eyebrow: { letterSpacing: "0.22em" },
  },
  {
    id: 2,
    name: "Editorial",
    note: "Instrument Serif, roman turning italic · Space Mono cue",
    scale: 1.12,
    lead: {
      fontFamily: "var(--font-instrument), Georgia, serif",
      letterSpacing: "-0.012em",
    },
    accent: {
      fontFamily: "var(--font-instrument), Georgia, serif",
      fontStyle: "italic",
      letterSpacing: "-0.008em",
    },
    eyebrow: {
      fontFamily: "var(--font-mono)",
      letterSpacing: "0.3em",
      fontSize: "var(--text-micro)",
    },
  },
  {
    id: 3,
    name: "Star chart",
    note: "Cormorant Garamond light, roman turning italic · wide sans cue",
    scale: 1.3,
    lead: {
      fontFamily: "var(--font-cormorant), Georgia, serif",
      fontWeight: 300,
      letterSpacing: "0.012em",
    },
    accent: {
      fontFamily: "var(--font-cormorant), Georgia, serif",
      fontWeight: 300,
      fontStyle: "italic",
      letterSpacing: "0.012em",
    },
    eyebrow: {
      fontFamily: "var(--font-text)",
      letterSpacing: "0.38em",
      fontSize: "var(--text-micro)",
    },
  },
  {
    id: 4,
    name: "Two voices",
    note: "Fraunces serif answered by Space Grotesk — the face changes at the comma",
    scale: 1.02,
    lead: {
      fontFamily: "var(--font-fraunces), Georgia, serif",
      fontWeight: 300,
      letterSpacing: "-0.005em",
    },
    accent: {
      fontFamily: "var(--font-space-grotesk), system-ui, sans-serif",
      fontWeight: 300,
      letterSpacing: "-0.028em",
    },
    eyebrow: {
      fontFamily: "var(--font-space-grotesk), system-ui, sans-serif",
      letterSpacing: "0.26em",
    },
  },
  {
    id: 5,
    name: "Readout",
    note: "Space Grotesk with the answer set in Space Mono — cold and engineered",
    scale: 0.92,
    lead: {
      fontFamily: "var(--font-space-grotesk), system-ui, sans-serif",
      fontWeight: 300,
      letterSpacing: "-0.028em",
    },
    accent: {
      fontFamily: "var(--font-mono)",
      fontWeight: 400,
      letterSpacing: "-0.03em",
    },
    eyebrow: {
      fontFamily: "var(--font-mono)",
      letterSpacing: "0.32em",
      fontSize: "var(--text-micro)",
    },
  },
];

export function heroTypeSetFrom(search: string): HeroTypeSet {
  const requested = Number(new URLSearchParams(search).get("type"));
  return HERO_TYPE_SETS.find((set) => set.id === requested) ?? HERO_TYPE_SETS[0];
}

export function heroTypeRequested(search: string): boolean {
  return new URLSearchParams(search).has("type");
}
