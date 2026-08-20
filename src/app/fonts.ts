import {
  Anton,
  Archivo,
  Bebas_Neue,
  Bricolage_Grotesque,
  Hanken_Grotesk,
  Instrument_Serif,
  Marcellus,
  Martian_Mono,
  Playfair_Display,
  Space_Mono,
} from "next/font/google";

/**
 * The site's faces.
 *
 * Horizon specifies Marcellus / Hanken Grotesk / Space Mono, and those still
 * back the tokens and everything outside the hero. The hero's label is Archivo,
 * which is a deliberate divergence from the system.
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
  weight: ["200", "400"],
  display: "swap",
});

/* --- Candidates for the answering clause -----------------------------------
   Temporary, chosen with `?f=1..6`. Deliberately spread across four different
   kinds of face — two condensed, two serif, a grotesque and a monospace —
   rather than six variations on one idea, since the geometric direction has
   already been ruled out twice. None are preloaded. */

export const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  preload: false,
});

export const bebas = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: "400",
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

export const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["900"],
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

export const martianMono = Martian_Mono({
  variable: "--font-martian",
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
  preload: false,
});

/** Every font variable, for the <html> class list. */
export const fontVariables = [
  marcellus.variable,
  hanken.variable,
  spaceMono.variable,
  archivo.variable,
  anton.variable,
  bebas.variable,
  instrumentSerif.variable,
  playfair.variable,
  bricolage.variable,
  martianMono.variable,
].join(" ");
