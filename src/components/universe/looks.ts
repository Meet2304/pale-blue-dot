import type { Kind } from "@/content/work";

import type { BodyId } from "./bodies";
import { KINDS, colorsOf } from "./encoding";

/**
 * How each piece of work looks up close. The kind of body is the kind of
 * work (encoding.ts); within a kind, no two are alike. Planets differ in
 * type (a banded giant, a smooth ice giant, a cratered rocky world), rings,
 * moons and colour; stars in temperature, from a small red dwarf to a hot
 * blue-white giant; black holes in the size, tilt and colour of their disk
 * and which way it turns; research is drawn as a different constellation
 * each time; nebulae differ in colour and shape.
 *
 * Every look stays within reason for its body, so a planet still reads as a
 * planet and a star as a star. A piece of work with no look of its own gets
 * its kind's (the one the bar's panels draw).
 */

export type PlanetType = "giant" | "ice" | "rocky";
export type Figure = "plough" | "phoenix" | "shield";

export type Look = {
  /** The palette, in OKLCH, and the warm tier's colour (glows, disks). */
  hue: number;
  l: number;
  c: number;
  warm: string;
  /** Size on screen against the others (1 is a middling body). */
  scale: number;
  /** How much larger than it would fit, for a body that would otherwise
      read small up close: it sits lower behind a picture to make room. */
  size?: number;
  planet?: {
    type: PlanetType;
    ring: boolean;
    /** Tilt of the rings and the moons' plane, in radians. */
    tilt: number;
    moons: number;
    /** How many bands run round the disc. */
    bands: number;
    storm: boolean;
  };
  hole?: {
    /** How open the disk is seen: 0.085 is nearly edge on. */
    tilt: number;
    /** Which side turns toward us (and so is brighter): 1 left, -1 right. */
    spin: 1 | -1;
    /** How far the disk reaches, in body radii. */
    disk: number;
    /** Twin jets of light from the poles. */
    jet?: boolean;
  };
  figure?: Figure;
  /** Mirror a nebula, so no two share a shape. */
  flip?: boolean;
};

const kindLook = (k: Kind): Look => ({
  hue: KINDS[k].hue,
  l: KINDS[k].l,
  c: KINDS[k].c,
  warm: "#ffd08a",
  scale: 1,
});

const LOOKS: Record<string, Partial<Look>> = {
  /* Education: black holes. Graduate school, the larger and warmer; the
     undergraduate degree, a cooler disk seen more openly, turning the
     other way. */
  "carnegie-mellon": {
    hue: 60,
    l: 0.86,
    c: 0.08,
    warm: "#ffc47a",
    scale: 1,
    hole: { tilt: 0.1, spin: 1, disk: 2.9, jet: true },
  },
  pdeu: {
    hue: 235,
    l: 0.86,
    c: 0.07,
    warm: "#b9d2ff",
    scale: 0.85,
    hole: { tilt: 0.16, spin: -1, disk: 2.6 },
  },

  /* Experience: stars, by temperature. */
  "bosch-mobility": { hue: 80, l: 0.86, c: 0.14, warm: "#ffd08a", scale: 0.9 },
  "blink-analytics": {
    hue: 250,
    l: 0.9,
    c: 0.08,
    warm: "#d6e4ff",
    scale: 0.82,
    size: 1.2,
  },
  astar: { hue: 40, l: 0.74, c: 0.17, warm: "#ff9a5c", scale: 0.62 },

  /* Projects: planets. */
  linea: {
    hue: 292,
    l: 0.78,
    c: 0.17,
    warm: "#e9d4ff",
    scale: 1,
    planet: { type: "ice", ring: true, tilt: -0.34, moons: 1, bands: 5, storm: false },
  },
  talaria: {
    hue: 28,
    l: 0.72,
    c: 0.15,
    warm: "#ffb38a",
    scale: 0.72,
    size: 1.2,
    planet: { type: "rocky", ring: false, tilt: 0.2, moons: 2, bands: 0, storm: false },
  },
  icarus: {
    hue: 70,
    l: 0.8,
    c: 0.13,
    warm: "#ffcf7a",
    scale: 0.92,
    planet: {
      type: "giant",
      ring: false,
      tilt: 0.12,
      moons: 0,
      bands: 13,
      storm: true,
    },
  },

  /* Research: constellations, a figure for each. */
  phoenix: { hue: 30, l: 0.8, c: 0.13, figure: "phoenix", scale: 0.8 },
  "prompt-classifier": { hue: 205, l: 0.82, c: 0.1, figure: "shield", scale: 0.85 },

  /* Leadership: nebulae. */
  "mind-ripple": { hue: 345, l: 0.76, c: 0.14, scale: 1 },
  "interact-club": { hue: 195, l: 0.8, c: 0.11, scale: 0.85, flip: true },
};

export const lookOf = (id: string, kind: Kind): Look => ({
  ...kindLook(kind),
  ...LOOKS[id],
});

/** A look's seven colours, in the tiers the renderers draw with. */
export const lookColors = (look: Look) => {
  const c = colorsOf(look.hue, look.l, look.c);
  c[5] = look.warm;
  return c;
};

/**
 * How far a body visibly reaches from its centre, across and down, in body
 * radii: what has to fit on screen. Faint outer light (a black hole's jets,
 * a star's corona) may run past it.
 */
export function reachOf(look: Look, body: BodyId): [number, number] {
  switch (body) {
    case "planet": {
      const pl = look.planet;
      if (!pl || pl.ring) return [2.25, 1.4];
      return pl.moons > 0 ? [1.75, 1.3] : [1.15, 1.15];
    }
    case "blackhole":
      return [(look.hole?.disk ?? 3.3) * 0.85, 1.35];
    case "sun":
      return [1.55, 1.55];
    case "constellation":
      return look.figure === "shield"
        ? [1.1, 1.15]
        : look.figure === "phoenix"
          ? [1.55, 1.15]
          : [1.55, 1.0];
    case "nebula":
      return [1.6, 1.3];
    default:
      return [1.1, 1.1];
  }
}
