import type { Metadata } from "next";
import { Martian_Mono } from "next/font/google";

import { Specimen, type SystemSpec } from "../specimen";
import skin from "./one-bit.module.css";

/** One family for everything, from hairline display to text: an instrument's voice. */
const martian = Martian_Mono({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--ob-mono",
});

export const metadata: Metadata = { title: "One Bit", robots: { index: false } };

const inks = ["#4d7fd9", "#eef3ff"];

const spec: SystemSpec = {
  slug: "one-bit",
  number: 2,
  name: "One Bit",
  tagline: "The frame, as it arrived.",
  idea: "Voyager sent its pictures home as numbers, a line at a time. Here every form is dithered to three levels on a pixel grid, and resolves in frames the way a transmission would.",
  field: {
    mode: "bit",
    count: 5200,
    morph: "stepped",
    duration: 1400,
    stagger: 500,
    staggerBy: "random",
    drift: 0.004,
    bg: "#000000",
    inks,
    cell: 3,
    gain: 3.2,
    nameFontVar: "--ob-mono",
    nameWeight: 600,
  },
  texture: {
    mode: "bit",
    count: 14000,
    morph: "stepped",
    duration: 0,
    stagger: 0,
    staggerBy: "random",
    drift: 0,
    bg: "#000000",
    inks,
    cell: 3,
    gain: 2.2,
  },
  sequence: ["dot", "nebula", "ring", "name", "spiral", "constellation"],
  principles: [
    {
      title: "Three levels, no more",
      body: "Black, haze and signal. Every gradient, glow and shadow is made by dithering between them, never by a fourth colour.",
    },
    {
      title: "Everything on the grid",
      body: "A 3px pixel grid sets the grain of every form. Controls are square, because corners are where pixels meet.",
    },
    {
      title: "Motion in frames",
      body: "Things move in steps, like a picture arriving line by line. The only smooth thing on screen is your cursor.",
    },
  ],
  colors: [
    { name: "Black", hex: "#000000", role: "Level 0. The ground." },
    {
      name: "Haze",
      hex: "#4d7fd9",
      role: "Level 1. Faint light, links, secondary states.",
    },
    {
      name: "Signal",
      hex: "#eef3ff",
      role: "Level 2. Text, forms, the primary action.",
    },
    { name: "Dot", hex: "#9cc8ff", role: "Reserved for the pale blue dot alone." },
  ],
  fonts: { display: "Martian Mono (thin, wide)", text: "Martian Mono" },
  radii: [
    { name: "Square", value: "0px", use: "Every control, panel and frame" },
    { name: "Dot", value: "50%", use: "Only the pale blue dot is round" },
  ],
  motion: [
    {
      name: "Frame",
      ms: 83,
      easing: "steps(1)",
      use: "One frame at 12 fps: the tick of all motion",
    },
    {
      name: "Resolve",
      ms: 1400,
      easing: "steps(7)",
      use: "Forms arriving in seven frames",
    },
    {
      name: "Fill",
      ms: 180,
      easing: "steps(3)",
      use: "Hover fills dither in: 25%, 50%, solid",
    },
  ],
  textureNote:
    "An 8×8 ordered dither on a 3px grid, at three levels. The pattern is the texture: there is no separate grain, because the dither already is one.",
};

export default function OneBitPage() {
  return (
    <div className={martian.variable}>
      <Specimen spec={spec} skin={skin} />
    </div>
  );
}
