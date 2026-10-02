import {
  Hanken_Grotesk,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  Marcellus,
} from "next/font/google";

/**
 * Marcellus and Hanken Grotesk set the story's note (`--font-display`,
 * `--font-text`) and the contact page's title. Not preloaded: a browser then
 * fetches a face only on a page whose text is set in it, so the home page
 * downloads neither.
 */
const marcellus = Marcellus({
  variable: "--font-marcellus",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  preload: false,
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

/** Every font variable, for the <html> class list. */
export const fontVariables = `${marcellus.variable} ${hanken.variable}`;

/**
 * IBM Plex, the Terminal system's two voices: Sans (200 to 400) speaks, Mono
 * labels, reads out, and draws every glyph on the universe's canvas.
 *
 * Declared here and nowhere else. Declaring one family in several files with
 * different options made next/font issue overlapping queries, which broke
 * cold builds on Vercel. Kept out of `fontVariables`: each page applies
 * `plexVariables` itself.
 */
const plexSans = IBM_Plex_Sans({
  variable: "--plex-sans",
  subsets: ["latin"],
  weight: ["200", "300", "400"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--plex-mono",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const plexVariables = `${plexSans.variable} ${plexMono.variable}`;
