import { Anton, Archivo, Hanken_Grotesk, Marcellus } from "next/font/google";

/**
 * The site's four faces.
 *
 * Marcellus and Hanken Grotesk are Horizon's own, backing `--font-display` and
 * `--font-text`; they set every heading and every paragraph outside the hero.
 * Archivo and Anton belong to the hero line alone and are a deliberate
 * divergence from the system — see the treatment in `hero-warp.tsx`.
 *
 * Horizon also specifies Space Mono for `--font-mono`. Nothing on the page sets
 * mono, so it is not loaded; the token falls back to the system stack until
 * something actually needs it.
 *
 * All four are preloaded, because all four are used above the fold.
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

/** The hero's label voice: hairline weight, held open by tracking. */
export const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["200", "400"],
  display: "swap",
});

/** The hero's answering voice: ultra-condensed, set very large. */
export const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

/** Every font variable, for the <html> class list. */
export const fontVariables = [
  marcellus.variable,
  hanken.variable,
  archivo.variable,
  anton.variable,
].join(" ");
