import {
  Anton,
  Archivo,
  Hanken_Grotesk,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  Marcellus,
} from "next/font/google";

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
 * None is preloaded: they belong to the Horizon pages (/story), and the
 * home page, on Terminal, never uses them. Unpreloaded, a browser fetches a
 * face only on a page whose text is set in it, so the home page downloads
 * none of them.
 */

export const marcellus = Marcellus({
  variable: "--font-marcellus",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  preload: false,
});

export const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

/** The hero's label voice: hairline weight, held open by tracking. */
export const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["200", "400"],
  display: "swap",
  preload: false,
});

/** The hero's answering voice: ultra-condensed, set very large. */
export const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  preload: false,
});

/** Every font variable, for the <html> class list. */
export const fontVariables = [
  marcellus.variable,
  hanken.variable,
  archivo.variable,
  anton.variable,
].join(" ");

/**
 * IBM Plex, the Terminal system's two voices: Sans (200 to 400) speaks, Mono
 * labels, reads out, and draws every glyph on the universe's canvas.
 *
 * Declared here and nowhere else. Declaring one family in several files with
 * different options made next/font issue overlapping queries, which broke
 * cold builds on Vercel. Kept out of `fontVariables`: only the pages built on
 * Terminal (the home page and `/work/*`) apply `plexVariables`.
 */
export const plexSans = IBM_Plex_Sans({
  variable: "--plex-sans",
  subsets: ["latin"],
  weight: ["200", "300", "400"],
  display: "swap",
});

export const plexMono = IBM_Plex_Mono({
  variable: "--plex-mono",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const plexVariables = `${plexSans.variable} ${plexMono.variable}`;
