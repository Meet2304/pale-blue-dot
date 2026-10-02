import { COLLECTIONS, type Kind, type Unit } from "@/content/work";

import type { BodyId } from "./bodies";
import { oklch } from "./helpers";

/**
 * What everything on the map means.
 *
 *   - the kind of body is the kind of work (see KINDS);
 *   - size and brightness are impact, on a 1 to 3 scale;
 *   - distance from Earth is time: the most recent work is closest;
 *   - everything orbits Earth, and further out turns more slowly.
 *
 * Each kind also has a glyph mark, so kinds never rely on colour alone.
 */

export const KINDS: Record<
  Kind,
  {
    label: string;
    /** The heading for this kind in the work menu. */
    title: string;
    body: BodyId;
    bodyName: string;
    /** Why this body stands for this kind of work, for the work menu. */
    about: string;
    mark: string;
    hue: number;
    l: number;
    c: number;
  }
> = {
  experience: {
    label: "Experience",
    title: "Professional experience",
    body: "sun",
    bodyName: "star",
    about: "Jobs and internships: steady light that other people work by.",
    mark: "=",
    hue: 70,
    l: 0.84,
    c: 0.13,
  },
  research: {
    label: "Research",
    title: "Research",
    body: "constellation",
    bodyName: "constellation",
    about: "Research: points joined by lines until a pattern shows.",
    mark: "×",
    hue: 185,
    l: 0.8,
    c: 0.12,
  },
  projects: {
    label: "Projects",
    title: "Projects",
    body: "planet",
    bodyName: "planet",
    about: "Things I built end to end, each a small world of its own.",
    mark: "+",
    hue: 300,
    l: 0.77,
    c: 0.14,
  },
  leadership: {
    label: "Leadership",
    title: "Leadership",
    body: "nebula",
    bodyName: "nebula",
    about: "Clubs and teams: the clouds where other people's work took shape.",
    mark: "~",
    hue: 15,
    l: 0.77,
    c: 0.13,
  },
  education: {
    label: "Education",
    title: "Education",
    body: "blackhole",
    bodyName: "black hole",
    about: "School: the deepest gravity, which bent every path after it.",
    mark: "o",
    hue: 225,
    l: 0.86,
    c: 0.06,
  },
};

/* The order the kinds are read in: the bar's tabs, the phone's chips and
   the map's key. */
export const KIND_ORDER: Kind[] = [
  "education",
  "experience",
  "projects",
  "research",
  "leadership",
];

/** The seven colours a body draws with: five-stop ramp, warm, white. */
export function colorsOf(hue: number, l: number, c: number) {
  return [
    oklch(0.34, c * 0.35, hue),
    oklch(0.55, c * 0.75, hue),
    oklch(l, c, hue),
    oklch(0.9, c * 0.45, hue),
    oklch(0.97, 0.012, hue),
    "#ffd08a",
    "#ffffff",
  ];
}

export const kindColors = (k: Kind) => colorsOf(KINDS[k].hue, KINDS[k].l, KINDS[k].c);

export const EARTH_COLORS = colorsOf(245, 0.82, 0.09);

/* ---------------------------------------------------------------- Layout */

export type Placed = Unit & {
  x: number;
  y: number;
  /** Body radius in world units; Earth's is 1. */
  r: number;
  seed: number;
  collection: number;
};

export type Group = { x: number; y: number; r: number };

/** Collections sit on a spiral out from Earth, one turn of time. */
export function layout() {
  const placed: Placed[] = [];
  const groups: Group[] = [];
  COLLECTIONS.forEach((col, ci) => {
    const ang = -0.75 + ci * 1.3;
    const dist = 14 + ci * 12;
    const gx = Math.cos(ang) * dist;
    const gy = Math.sin(ang) * dist * 0.72;
    let reach = 0;
    const n = col.units.length;
    col.units.forEach((u, ui) => {
      const r = 0.55 + u.impact * 0.42;
      const a = ang + Math.PI / 2 + (ui / Math.max(1, n)) * Math.PI * 2;
      const off = n === 1 ? 0 : 3.4 + r * 0.9;
      const x = gx + Math.cos(a) * off;
      const y = gy + Math.sin(a) * off;
      placed.push({ ...u, x, y, r, seed: (ci * 7 + ui + 1) * 0.137, collection: ci });
      reach = Math.max(reach, Math.hypot(x - gx, y - gy) + r * 2);
    });
    groups.push({ x: gx, y: gy, r: reach });
  });
  return { placed, groups };
}
