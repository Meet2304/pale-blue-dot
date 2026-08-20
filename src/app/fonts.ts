import {
  Cormorant_Garamond,
  Fraunces,
  Hanken_Grotesk,
  Instrument_Serif,
  Marcellus,
  Space_Grotesk,
  Space_Mono,
} from "next/font/google";

/**
 * Every face the hero type sets can call on.
 *
 * This is deliberately more than the site needs. The hero pairing is being
 * chosen from five candidates (see `hero-type.ts`), so all of them have to be
 * loadable at once — once one is picked, everything it does not use should come
 * out of here, because seven families is far more weight than a hero that
 * budgets 1.8s to first paint can justify carrying.
 *
 * Only the three the design system specifies are preloaded. The candidates load
 * on demand so the default experience is not paying for the comparison.
 */

/* --- Horizon's own three ------------------------------------------------- */

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

/* --- Candidates ----------------------------------------------------------- */

export const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
});

export const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400"],
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
});

export const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["300", "400"],
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
});

export const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

/** Every font variable, for the <html> class list. */
export const fontVariables = [
  marcellus.variable,
  hanken.variable,
  spaceMono.variable,
  instrumentSerif.variable,
  cormorant.variable,
  fraunces.variable,
  spaceGrotesk.variable,
].join(" ");
