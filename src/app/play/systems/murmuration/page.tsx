import type { Metadata } from "next";
import { Figtree, Gloock } from "next/font/google";

import { Specimen, type SystemSpec } from "../specimen";
import skin from "./murmuration.module.css";

/** A high-contrast display serif, for the sense of occasion. */
const gloock = Gloock({ subsets: ["latin"], weight: "400", variable: "--mm-display" });
/** A warm, open sans for everything read at length. */
const figtree = Figtree({ subsets: ["latin"], variable: "--mm-text" });

export const metadata: Metadata = { title: "Murmuration", robots: { index: false } };

/* Deep violet to gold: every form is coloured along this ramp, so colour
   reads as a direction of travel. */
const inks = ["#3b2a8f", "#7a5cff", "#4f9dff", "#bfe0ff", "#f3d49b"];

const spec: SystemSpec = {
  slug: "murmuration",
  number: 5,
  name: "Murmuration",
  tagline: "Light that flows.",
  idea: "Thousands of fine points move like starlings: never in straight lines, always along currents, leaving a fading trail of where they have been.",
  field: {
    mode: "stipple",
    count: 9000,
    morph: "flow",
    duration: 2600,
    stagger: 1100,
    staggerBy: "random",
    drift: 0.01,
    bg: "#030208",
    inks,
    trail: 0.16,
    nameFontVar: "--mm-display",
    nameWeight: 400,
  },
  texture: {
    mode: "stipple",
    count: 7000,
    morph: "flow",
    duration: 0,
    stagger: 0,
    staggerBy: "random",
    drift: 0,
    bg: "#030208",
    inks,
  },
  sequence: ["dot", "spiral", "nebula", "name", "ring", "constellation"],
  principles: [
    {
      title: "Nothing travels straight",
      body: "Every move follows a current. Particles, panels and the camera all curve on their way somewhere.",
    },
    {
      title: "Colour is direction",
      body: "Forms are coloured along one ramp, from deep violet to gold. Colour tells you which way something is going, and how far it has come.",
    },
    {
      title: "Trails remember",
      body: "Moving things leave a fading trace. The past stays visible for a moment before it goes.",
    },
  ],
  colors: [
    { name: "Night", hex: "#030208", role: "The ground, a violet-black." },
    { name: "Deep violet", hex: "#3b2a8f", role: "The start of the ramp; depth." },
    { name: "Violet", hex: "#7a5cff", role: "Primary accent and focus." },
    { name: "Blue", hex: "#4f9dff", role: "The middle of the ramp; links." },
    { name: "Pale", hex: "#bfe0ff", role: "The dot, and brightest points." },
    { name: "Gold", hex: "#f3d49b", role: "The end of the ramp; arrival and success." },
    { name: "Moon", hex: "#f5f3ff", role: "Reading text." },
    { name: "Mist", hex: "#9d98b8", role: "Secondary text." },
  ],
  fonts: { display: "Gloock", text: "Figtree" },
  radii: [
    { name: "Soft", value: "14px", use: "Buttons and chips" },
    {
      name: "Petal",
      value: "28px 28px 28px 6px",
      use: "Panels: one sharp corner points home",
    },
    { name: "Round", value: "50%", use: "Icon buttons and the dot" },
  ],
  motion: [
    {
      name: "Flow",
      ms: 2600,
      easing: "cubic-bezier(0.37, 0, 0.63, 1)",
      use: "Particles travelling along currents",
    },
    {
      name: "Shimmer",
      ms: 2400,
      easing: "linear",
      use: "Light crossing a gradient border",
    },
    {
      name: "Answer",
      ms: 280,
      easing: "cubic-bezier(0.2, 0.7, 0.2, 1)",
      use: "Hover, press and focus",
    },
  ],
  textureNote:
    "Stipple: fine 1px points, with one in six drawn larger. While moving, each frame fades the last one by 16%, so every particle leaves a short trail.",
};

export default function MurmurationPage() {
  return (
    <div className={`${gloock.variable} ${figtree.variable}`}>
      <Specimen spec={spec} skin={skin} />
    </div>
  );
}
