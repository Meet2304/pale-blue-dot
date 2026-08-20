import {
  Anton,
  Archivo,
  Bricolage_Grotesque,
  Hanken_Grotesk,
  Instrument_Serif,
  Marcellus,
  Space_Mono,
  Syne,
  Unbounded,
} from "next/font/google";

/**
 * The site's faces.
 *
 * Horizon specifies Marcellus / Hanken Grotesk / Space Mono, and those still
 * back the tokens and everything outside the hero. The hero line itself is set
 * in Archivo and Syne, which is a deliberate divergence from the system — see
 * the treatment in `hero-warp.tsx`.
 *
 * Everything here is preloaded, because everything here is used above the fold.
 */

export const marcellus = Marcellus({
  variable: "--font-marcellus",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  display: "swap",
});

export const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

/** The hero's label voice: hairline weight, held open by tracking. */
export const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["200", "400", "900"],
  display: "swap",
});

/* --- Candidates for the answering clause -----------------------------------
   Temporary. "I make." is being chosen from these with `?f=1..6`; once one
   lands, delete the rest and drop them from the list below. None are
   preloaded, so the default path is not paying for the comparison. */

export const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
  preload: false,
});

export const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  preload: false,
});

export const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["800"],
  display: "swap",
  preload: false,
});

export const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
});

export const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  weight: ["800"],
  display: "swap",
  preload: false,
});

/** Every font variable, for the <html> class list. */
export const fontVariables = [
  marcellus.variable,
  hanken.variable,
  spaceMono.variable,
  archivo.variable,
  syne.variable,
  anton.variable,
  bricolage.variable,
  instrumentSerif.variable,
  unbounded.variable,
].join(" ");
