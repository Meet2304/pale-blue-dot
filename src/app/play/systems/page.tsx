import type { Metadata } from "next";
import Link from "next/link";

import styles from "../play.module.css";

export const metadata: Metadata = { title: "Design systems", robots: { index: false } };

const SYSTEMS = [
  {
    href: "/play/systems/terminal",
    name: "Terminal",
    idea: "Terminal Earth grown into a whole system: every body drawn in characters, one per kind of work, redrawn by a scan wave; a neumorphic console lit by the same sun.",
  },
  {
    href: "/play/systems/lab",
    name: "Lab: five pushed further",
    idea: "Gravity, Prism, Terminal Earth, Nebula Ink and Deep Field. Current taken five ways, each built around one moment.",
  },
  {
    href: "/play/systems/current",
    name: "Current (Murmuration + Glyph)",
    idea: "The combination: flowing stipple that never rests, a sparse glyph texture ticking on its own clock, and an accent that changes with each kind of work.",
  },
  {
    href: "/play/systems/stardust",
    name: "Stardust",
    idea: "Emitted light on true black. Soft points swirl in and condense into forms; pills, glass and halos; one glow per screen.",
  },
  {
    href: "/play/systems/one-bit",
    name: "One Bit",
    idea: "The frame as Voyager sent it: an 8×8 ordered dither at three levels on a pixel grid. Square corners, motion in frames.",
  },
  {
    href: "/play/systems/halftone",
    name: "Halftone Atlas",
    idea: "Printed like a star chart: dot size is brightness, two plates out of register, and every change re-prints from the centre out.",
  },
  {
    href: "/play/systems/glyph",
    name: "Glyph",
    idea: "Everything is text. Density becomes characters, forms decode out of noise, and the machine and the person speak in two faces.",
  },
  {
    href: "/play/systems/murmuration",
    name: "Murmuration",
    idea: "Thousands of stipple points flow along currents like starlings, coloured along one ramp from deep violet to gold, leaving trails.",
  },
];

export default function SystemsIndex() {
  return (
    <main id="content" className={styles.index}>
      <h1 className={styles.title}>Design systems</h1>
      <p className={styles.lede}>
        One particle engine, five ways of drawing it. Each page is laid out the same
        way, so you can take the type from one and the buttons from another.
      </p>
      <ol className={styles.list}>
        {SYSTEMS.map((s) => (
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
