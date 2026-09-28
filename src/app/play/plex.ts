import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

/**
 * IBM Plex, loaded once for every play route that uses it. Declaring the
 * same family in several files with different options made next/font issue
 * overlapping queries, which broke cold builds on Vercel.
 */
export const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500"],
  variable: "--plex-sans",
});

export const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--plex-mono",
});

export const plexVariables = `${plexSans.variable} ${plexMono.variable}`;
