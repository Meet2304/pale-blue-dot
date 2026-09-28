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
    body: BodyId;
    bodyName: string;
    mark: string;
    hue: number;
    l: number;
    c: number;
  }
> = {
  experience: {
    label: "Experience",
    body: "sun",
    bodyName: "star",
    mark: "=",
    hue: 70,
    l: 0.84,
    c: 0.13,
  },
  research: {
    label: "Research",
    body: "constellation",
    bodyName: "constellation",
    mark: "×",
    hue: 185,
    l: 0.8,
    c: 0.12,
  },
  projects: {
    label: "Projects",
    body: "planet",
    bodyName: "planet",
    mark: "+",
    hue: 300,
    l: 0.77,
    c: 0.14,
  },
  leadership: {
    label: "Leadership",
    body: "nebula",
    bodyName: "nebula",
    mark: "~",
    hue: 15,
    l: 0.77,
    c: 0.13,
  },
  education: {
    label: "Education",
    body: "blackhole",
    bodyName: "black hole",
    mark: "o",
    hue: 225,
    l: 0.86,
    c: 0.06,
  },
};

export const KIND_ORDER: Kind[] = [
  "experience",
  "research",
  "projects",
  "leadership",
  "education",
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
