import type { Metadata } from "next";
import Link from "next/link";

import styles from "../../play.module.css";

export const metadata: Metadata = { title: "Lab systems", robots: { index: false } };

const LAB = [
  {
    href: "/play/systems/lab/gravity",
    name: "Gravity",
    idea: "Your cursor is a black hole. Stars, the galaxy and a spacetime grid lens around it with the real equations: arcs, and full Einstein rings.",
  },
  {
    href: "/play/systems/lab/prism",
    name: "Prism",
    idea: "One white beam through a glass prism splits into the five categories, in true spectral order. The cursor turns the prism.",
  },
  {
    href: "/play/systems/lab/earth",
    name: "Terminal Earth",
    idea: "A live Earth drawn only in glyphs: oceans, land, clouds, city lights. Scroll, and it shrinks to the pale blue dot.",
  },
  {
    href: "/play/systems/lab/ink",
    name: "Nebula Ink",
    idea: "A real fluid simulation. Paint nebulae with your cursor in each category's colour; glyphs lie along the current.",
  },
  {
    href: "/play/systems/lab/deep",
    name: "Deep Field",
    idea: "A 3D galaxy with depth of field. The camera orbits with your cursor, and scrolling flies you through it.",
  },
];

export default function LabIndex() {
  return (
    <main id="content" className={styles.index}>
      <h1 className={styles.title}>Five lab systems</h1>
      <p className={styles.lede}>
        Current, pushed five ways. Each keeps the flow, the glyph grain and the colour
        per kind of work, and builds one moment around them.
      </p>
      <ol className={styles.list}>
        {LAB.map((s) => (
          <li key={s.href}>
            <Link href={s.href} className={styles.item}>
              <span className={styles.name}>{s.name}</span>
              <span className={styles.idea}>{s.idea}</span>
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}
