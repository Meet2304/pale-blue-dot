import type { Metadata } from "next";
import Link from "next/link";

import styles from "./play.module.css";

export const metadata: Metadata = {
  title: "Play",
  robots: { index: false },
};

const CONCEPTS = [
  {
    href: "/play/voyager",
    name: "Voyager",
    idea: "The page is a flight outward. Distance climbs as you scroll, the work arrives as flybys, and at the end the camera turns round to find the dot.",
  },
  {
    href: "/play/orrery",
    name: "Orrery",
    idea: "A working model of one life. Everything orbits a single choice; pick up any body to read it.",
  },
  {
    href: "/play/constellations",
    name: "Constellations",
    idea: "Scattered stars are the things I've done. Scroll, and they join into named figures, then fall into one point of light.",
  },
  {
    href: "/play/record",
    name: "Golden Record",
    idea: "The site as a record sent out for whoever finds it: a sleeve of instructions, and a tracklist you play.",
  },
  {
    href: "/play/dot",
    name: "Into the Dot",
    idea: "Start on the real photograph and zoom into the pixel: planet, city lights, one window, one desk, one person.",
  },
];

export default function PlayIndex() {
  return (
    <main id="content" className={styles.index}>
      <h1 className={styles.title}>Five ways to tell it</h1>
      <p className={styles.lede}>
        Same words, same person, five different skies. Each one is a hero and the story
        after it, built to be felt before it is read.
      </p>
      <ol className={styles.list}>
        {CONCEPTS.map((c) => (
          <li key={c.href}>
            <Link href={c.href} className={styles.item}>
              <span className={styles.name}>{c.name}</span>
              <span className={styles.idea}>{c.idea}</span>
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}
