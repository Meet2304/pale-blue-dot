import {
  Archivo,
  Bricolage_Grotesque,
  Hanken_Grotesk,
  Marcellus,
  Martian_Mono,
  Space_Mono,
  Syne,
  Unbounded,
} from "next/font/google";

/**
 * Every face the hero type sets can call on.
 *
 * Deliberately more than the site needs. The hero treatment is being chosen
 * from five candidates (see `hero-type.ts`), so all of them have to be loadable
 * at once — once one is picked, everything it does not use should come out of
 * here, because eight families is far more weight than a hero that reaches
 * first paint in 1.4s can justify carrying.
 *
 * Only Horizon's own three are preloaded; they are what the tokens point at and
 * what the rest of the page sets in. The candidates load on demand, so the
 * default path is not paying for the comparison.
 */

/* --- Horizon's three: the tokens, and everything outside the hero ---------- */

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

/* --- Candidates ------------------------------------------------------------
   Chosen to be genuinely unalike rather than five shades of display serif: a
   neutral grotesque that only becomes a display face when stretched, a wide
   quirky monospace, a geometric with an enormous weight range, a variable
   grotesque built to be imperfect, and an art-school geometric. */

export const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const martianMono = Martian_Mono({
  variable: "--font-martian",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

/** Every font variable, for the <html> class list. */
export const fontVariables = [
  marcellus.variable,
  hanken.variable,
  spaceMono.variable,
  archivo.variable,
  martianMono.variable,
  unbounded.variable,
  bricolage.variable,
  syne.variable,
].join(" ");
