import { Archivo, Hanken_Grotesk, Marcellus, Space_Mono, Syne } from "next/font/google";

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
  weight: ["200", "400"],
  display: "swap",
});

/** The hero's answering voice: geometric, heavy, close-set. */
export const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
});

/** Every font variable, for the <html> class list. */
export const fontVariables = [
  marcellus.variable,
  hanken.variable,
  spaceMono.variable,
  archivo.variable,
  syne.variable,
].join(" ");
