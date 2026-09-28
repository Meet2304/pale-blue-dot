import type { Metadata } from "next";
import { Bricolage_Grotesque, Newsreader } from "next/font/google";

import { Specimen, type SystemSpec } from "../specimen";
import skin from "./halftone.module.css";

/** A grotesque with an optical-size and width range wide enough to set plate titles. */
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["wdth", "opsz"],
  variable: "--ht-display",
});
/** An atlas needs a reading face for its captions. */
const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--ht-text",
});

export const metadata: Metadata = { title: "Halftone Atlas", robots: { index: false } };

const inks = ["#0d7bff", "#eceff4"];

const spec: SystemSpec = {
  slug: "halftone",
  number: 3,
  name: "Halftone Atlas",
  tagline: "Printed like a star chart.",
  idea: "The old atlases printed the sky in dots and one spot colour. Every form here is a halftone: size carries brightness, and each change re-prints from the centre out.",
  field: {
    mode: "halftone",
    count: 4200,
    morph: "straight",
    duration: 1500,
    stagger: 900,
    staggerBy: "radial",
    drift: 0.003,
    bg: "#000000",
    inks,
    cell: 9,
    gain: 0.5,
    nameFontVar: "--ht-display",
    nameWeight: 800,
  },
  texture: {
    mode: "halftone",
    count: 5200,
    morph: "straight",
    duration: 0,
    stagger: 0,
    staggerBy: "random",
    drift: 0,
    bg: "#000000",
    inks,
    cell: 9,
    gain: 0.45,
  },
  sequence: ["dot", "spiral", "name", "nebula", "ring", "constellation"],
  principles: [
    {
      title: "Two plates",
      body: "Every image is printed in paper white and one spot blue, set a hair out of register. The misregistration is the signature, not a flaw.",
    },
    {
      title: "Size is brightness",
      body: "Dots grow to say more and shrink to say less. Emphasis, charts and hover states all speak in dot size.",
    },
    {
      title: "Printed, not lit",
      body: "No glow and no blur. The majesty comes from scale and precision, the way a plate in an old atlas holds a whole sky.",
    },
  ],
  colors: [
    { name: "Plate black", hex: "#000000", role: "The paper of the sky." },
    { name: "Paper white", hex: "#eceff4", role: "The main plate: text and form." },
    {
      name: "Spot blue",
      hex: "#0d7bff",
      role: "The second plate: halos, accent, action.",
    },
    { name: "Graphite", hex: "#8a93a6", role: "Captions and secondary text." },
    { name: "Rule", hex: "#232a3a", role: "Grid lines and borders." },
  ],
  fonts: { display: "Bricolage Grotesque", text: "Newsreader" },
  radii: [
    { name: "Print", value: "4px", use: "Buttons, chips and panels" },
    { name: "Dot", value: "50%", use: "Tags, markers and the dot" },
    { name: "Plate", value: "0px", use: "Figures and section rules" },
  ],
  motion: [
    {
      name: "Print",
      ms: 1500,
      easing: "cubic-bezier(0.65, 0, 0.35, 1)",
      use: "Forms re-printing from the centre out",
    },
    {
      name: "Register",
      ms: 260,
      easing: "cubic-bezier(0.3, 0, 0, 1)",
      use: "Hover: the spot plate slides into register",
    },
    { name: "Ink", ms: 600, easing: "ease-out", use: "Dot patterns filling in" },
  ],
  textureNote:
    "A 9px halftone grid, two plates. The blue plate is blurred wider and offset by 1.6px, so every form carries a faint printed halo.",
};

export default function HalftonePage() {
  return (
    <div className={`${bricolage.variable} ${newsreader.variable}`}>
      <Specimen spec={spec} skin={skin} />
    </div>
  );
}
