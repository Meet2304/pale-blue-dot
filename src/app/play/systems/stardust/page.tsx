import type { Metadata } from "next";
import { Cormorant_Garamond } from "next/font/google";

import { Specimen, type SystemSpec } from "../specimen";
import skin from "./stardust.module.css";

/** A light, high-contrast serif: letters that look drawn in light. */
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400"],
  style: ["normal", "italic"],
  variable: "--sd-display",
});

export const metadata: Metadata = { title: "Stardust", robots: { index: false } };

const spec: SystemSpec = {
  slug: "stardust",
  number: 1,
  name: "Stardust",
  tagline: "Light that gathers.",
  idea: "Every element is emitted light. Forms don't appear, they condense: thousands of soft points swirl in and settle into the dot, a nebula, a name.",
  field: {
    mode: "glow",
    count: 2600,
    morph: "swirl",
    duration: 2200,
    stagger: 700,
    staggerBy: "random",
    drift: 0.006,
    bg: "#000000",
    inks: ["#9cc8ff", "#dfe8ff", "#b3a4ff"],
    nameFontVar: "--sd-display",
    nameWeight: 400,
  },
  texture: {
    mode: "glow",
    count: 1500,
    morph: "swirl",
    duration: 0,
    stagger: 0,
    staggerBy: "random",
    drift: 0,
    bg: "#000000",
    inks: ["#9cc8ff", "#dfe8ff", "#b3a4ff"],
  },
  sequence: ["dot", "nebula", "name", "ring", "spiral", "constellation"],
  principles: [
    {
      title: "Light, not ink",
      body: "Nothing is painted on. Every mark is a point of light on true black, and brightness is the only way to say something matters.",
    },
    {
      title: "Gathered, never placed",
      body: "Forms arrive by particles converging along curved paths. Nothing snaps into place, and nothing appears from nowhere.",
    },
    {
      title: "One glow per screen",
      body: "The brightest thing on a screen is the thing that matters. Everything else stays dim enough to let it.",
    },
  ],
  colors: [
    { name: "Void", hex: "#000000", role: "The canvas. True black, never tinted." },
    {
      name: "Starlight",
      hex: "#eef2fb",
      role: "Primary text and the brightest particles.",
    },
    {
      name: "Pale blue",
      hex: "#9cc8ff",
      role: "The dot. Accent, focus and selection.",
    },
    { name: "Nebula", hex: "#b3a4ff", role: "Secondary particles and hover halos." },
    { name: "Dust", hex: "#7c8499", role: "Muted text and captions." },
    { name: "Hairline", hex: "#1f2433", role: "Borders and dividers." },
  ],
  fonts: { display: "Cormorant Garamond", text: "Hanken Grotesk" },
  radii: [
    { name: "Pill", value: "999px", use: "Buttons, chips, the nav" },
    { name: "Soft", value: "22px", use: "Panels and cards" },
    { name: "Round", value: "50%", use: "Icon buttons and the dot" },
    { name: "Sharp", value: "0px", use: "The sky itself; images" },
  ],
  motion: [
    {
      name: "Gather",
      ms: 2200,
      easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      use: "Particles arriving at a form",
    },
    { name: "Breathe", ms: 5600, easing: "ease-in-out", use: "Idle glow and twinkle" },
    {
      name: "Answer",
      ms: 320,
      easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      use: "Hover, press and focus",
    },
  ],
  textureNote:
    "Soft light points on black, with a fine film grain laid over everything at 5%. The grain keeps the glow from looking digital and ties every screen back to the grain of the original photograph.",
};

export default function StardustPage() {
  return (
    <div className={cormorant.variable}>
      <Specimen spec={spec} skin={skin} />
    </div>
  );
}
