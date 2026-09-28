import type { Metadata } from "next";
import { Geist_Mono, Instrument_Serif } from "next/font/google";

import { Specimen, type SystemSpec } from "../specimen";
import skin from "./glyph.module.css";

/** The machine voice: every image is written in it. */
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--gl-mono" });
/** The human voice, set against it. */
const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--gl-serif",
});

export const metadata: Metadata = { title: "Glyph", robots: { index: false } };

const inks = ["#34405e", "#8fb4ff", "#f2f5ff"];

const spec: SystemSpec = {
  slug: "glyph",
  number: 4,
  name: "Glyph",
  tagline: "Written in light.",
  idea: "Every image is text. Density becomes characters, from a faint dot to a full block, and anything in motion is still being decided until it lands.",
  field: {
    mode: "glyph",
    count: 5200,
    morph: "straight",
    duration: 1700,
    stagger: 900,
    staggerBy: "random",
    drift: 0.004,
    bg: "#000000",
    inks,
    cell: 12,
    gain: 0.5,
    nameFontVar: "--gl-serif",
    nameWeight: 400,
    monoFontVar: "--gl-mono",
  },
  texture: {
    mode: "glyph",
    count: 5200,
    morph: "straight",
    duration: 0,
    stagger: 0,
    staggerBy: "random",
    drift: 0,
    bg: "#000000",
    inks,
    cell: 12,
    gain: 0.7,
    monoFontVar: "--gl-mono",
  },
  sequence: ["dot", "name", "nebula", "constellation", "ring", "spiral"],
  principles: [
    {
      title: "Everything is text",
      body: "Forms are drawn with characters on a monospaced grid. The same eleven glyphs make the dot, a nebula and a name.",
    },
    {
      title: "Decoded, not faded",
      body: "Things arrive by resolving out of noise: forms in the sky, labels on hover. Nothing simply fades in.",
    },
    {
      title: "Two voices",
      body: "The machine writes in mono. The person speaks in serif italic. They never swap roles.",
    },
  ],
  colors: [
    { name: "Black", hex: "#000000", role: "The terminal." },
    { name: "Dim", hex: "#34405e", role: "Faint glyphs, borders, idle states." },
    {
      name: "Glyph blue",
      hex: "#8fb4ff",
      role: "Mid glyphs, links and the primary action.",
    },
    { name: "Bright", hex: "#f2f5ff", role: "Dense glyphs and all reading text." },
    { name: "Grey", hex: "#7f8aa3", role: "Captions and secondary text." },
  ],
  fonts: { display: "Instrument Serif", text: "Geist Mono" },
  radii: [
    { name: "Key", value: "2px", use: "Buttons and chips" },
    { name: "Panel", value: "4px", use: "Panels and cards" },
    { name: "Cell", value: "0px", use: "The glyph grid" },
  ],
  motion: [
    {
      name: "Decode",
      ms: 420,
      easing: "linear",
      use: "Labels resolving one character at a time",
    },
    {
      name: "Resolve",
      ms: 1700,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      use: "Forms settling out of noise",
    },
    {
      name: "Caret",
      ms: 1060,
      easing: "steps(2)",
      use: "The blinking cursor on focus",
    },
  ],
  textureNote:
    "A 12px character grid. The density ramp runs through eleven glyphs in three inks, so tone is carried by both the character and its colour.",
  scramble: true,
};

export default function GlyphPage() {
  return (
    <div className={`${geistMono.variable} ${instrument.variable}`}>
      <Specimen spec={spec} skin={skin} />
    </div>
  );
}
