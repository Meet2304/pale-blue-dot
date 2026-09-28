"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";

import {
  ACCENTS,
  rampList,
  rampOf,
  type Accent,
  type AccentKey,
} from "../current/color";
import s from "./sheet.module.css";

/**
 * The shared half of every lab system: the category nav, the hero copy, and
 * the token sheet under the hero. Everything here is styled by CSS variables,
 * so each system restyles the same components by setting values, not by
 * rewriting markup:
 *
 *   --bg --fg --soft --mute --line --surface
 *   --font-display --font-text --font-mono
 *   --display-weight --display-tracking --display-size
 *   --r-control --r-panel --r-tag
 *   --on-accent (text on a filled accent)
 *
 * Accent stops (--accent, --accent-deep, --accent-dim, --accent-soft,
 * --accent-white) come from `accentVars`.
 */

export const accentVars = (a: Accent) => {
  const r = rampOf(a);
  return {
    "--accent": r.accent,
    "--accent-deep": r.deep,
    "--accent-dim": r.dim,
    "--accent-soft": r.soft,
    "--accent-white": r.white,
  } as CSSProperties;
};

export { ACCENTS, rampList };
export type { AccentKey };

export const SAMPLES: Record<
  AccentKey,
  {
    title: string;
    when: string;
    goal: string;
    owned: string;
    impact: string;
    link: { label: string; href: string };
  }
> = {
  home: {
    title: "The pale blue dot",
    when: "Home",
    goal: "Add something to the one point of light where everything has happened.",
    owned: "Everything on this site, one piece at a time.",
    impact: "Still being written.",
    link: { label: "Read the note", href: "/story" },
  },
  projects: {
    title: "Linea",
    when: "Project, 2026",
    goal: "Lyrics that follow your music without taking you out of your work.",
    owned:
      "The whole app: the overlay, Windows media sessions, synced lyric retrieval, the offline cache.",
    impact: "Free and open source, on version 0.2.0.",
    link: { label: "Visit the site", href: "https://linea.meetbhatt.com" },
  },
  research: {
    title: "Project Phoenix",
    when: "Research, 2025 to 2026",
    goal: "Catch the earliest cell changes in cervical cancer, and show why the model decided.",
    owned:
      "Image cleanup on SipakMed and Herlev, the CNN models, the visual explanations.",
    impact: "Manuscript in preparation. The model runs live in the browser.",
    link: { label: "Visit the site", href: "https://phoenix.meetbhatt.com" },
  },
  experience: {
    title: "Blink Analytics",
    when: "Experience, 2024 to 2026",
    goal: "Human-feedback training for AI models, and the products built on it.",
    owned:
      "Led development of Serin, an AI hiring platform, and directed an intern team on fine-tuning.",
    impact: "A 222% increase in project revenue in two months.",
    link: { label: "Read the case", href: "#sheet" },
  },
  leadership: {
    title: "Mind Ripple",
    when: "Leadership, 2022 to 2026",
    goal: "Grow the university's quizzing club and its flagship event.",
    owned: "Led a 30-member team as president, after heading its graphic design.",
    impact: "Matrix Breakout grew to 300+ participants, with earnings up 10% a year.",
    link: { label: "Read the case", href: "#sheet" },
  },
};

export function CategoryNav({
  value,
  onChange,
}: {
  value: AccentKey;
  onChange: (k: AccentKey) => void;
}) {
  return (
    <nav className={s.nav} aria-label="Filter by kind of work">
      <span className={s.navDot} aria-hidden />
      {ACCENTS.map((a) => (
        <button
          key={a.key}
          type="button"
          className={s.navItem}
          aria-pressed={a.key === value}
          onClick={() => onChange(a.key)}
        >
          <span className={s.mark} aria-hidden>
            {a.mark}
          </span>
          {a.label}
        </button>
      ))}
    </nav>
  );
}

export function HeroCopy({
  number,
  name,
  tagline,
  idea,
  hint,
  children,
}: {
  number: number;
  name: string;
  tagline: string;
  idea: string;
  hint: string;
  children?: ReactNode;
}) {
  return (
    <div className={s.heroCopy}>
      <p className={s.kicker}>Lab system {number} of 5</p>
      <h1 className={s.name}>{name}</h1>
      <p className={s.tagline}>{tagline}</p>
      <p className={s.idea}>{idea}</p>
      <p className={s.hint}>{hint}</p>
      {children}
    </div>
  );
}

export function Chips<T extends string>({
  items,
  value,
  onChange,
  label,
}: {
  items: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div className={s.chips} role="group" aria-label={label}>
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          className={s.chip}
          aria-pressed={it.id === value}
          onClick={() => onChange(it.id)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

export type SheetSpec = {
  moment: { title: string; body: string; how: string[] };
  principles: { title: string; body: string }[];
  fonts: { display: string; text: string; mono: string };
  shape: { name: string; value: string; use: string }[];
  motion: { name: string; value: string; use: string }[];
};

export function Sheet({
  spec,
  accentKey,
  onAccent,
}: {
  spec: SheetSpec;
  accentKey: AccentKey;
  onAccent: (k: AccentKey) => void;
}) {
  const accent = ACCENTS.find((a) => a.key === accentKey) ?? ACCENTS[0];
  const sample = SAMPLES[accentKey];

  return (
    <div className={s.sheet} id="sheet">
      <Section title="The moment">
        <p className={s.lede}>{spec.moment.body}</p>
        <ul className={s.how}>
          {spec.moment.how.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </Section>

      <Section title="Principles">
        <div className={s.principles}>
          {spec.principles.map((p) => (
            <div key={p.title}>
              <h3 className={s.h3}>{p.title}</h3>
              <p className={s.body}>{p.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Accents">
        <div className={s.accents}>
          {ACCENTS.map((a) => (
            <button
              key={a.key}
              type="button"
              className={s.accentCard}
              style={accentVars(a)}
              aria-pressed={a.key === accentKey}
              onClick={() => onAccent(a.key)}
            >
              <span className={s.tag}>
                <span aria-hidden>{a.mark}</span> {a.key === "home" ? "Home" : a.label}
              </span>
              <span className={s.accentTitle}>{SAMPLES[a.key].title}</span>
              <span className={s.ramp} aria-hidden>
                {rampList(a).map((hex) => (
                  <span key={hex} style={{ background: hex }} />
                ))}
              </span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Type">
        <p className={s.mono}>
          {spec.fonts.display} for display. {spec.fonts.text} for text.{" "}
          {spec.fonts.mono} for labels.
        </p>
        <div className={s.typeStack}>
          <p className={s.tDisplay}>What&apos;s missing, I make.</p>
          <p className={s.tTitle}>Project Phoenix</p>
          <p className={s.body}>
            Catch the earliest cell changes in cervical cancer, and show why the model
            decided, not just how confident it is.
          </p>
          <p className={s.mono}>
            <span className={s.mark}>×</span> Research, July 2025 to May 2026
          </p>
        </div>
      </Section>

      <Section title="Shape and motion">
        <div className={s.tokens}>
          {[...spec.shape, ...spec.motion].map((t) => (
            <div key={t.name} className={s.token}>
              <span className={s.tokenName}>{t.name}</span>
              <span className={s.mono}>{t.value}</span>
              <span className={s.tokenUse}>{t.use}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Components">
        <div className={s.components}>
          <div className={s.buttons}>
            <button type="button" className={s.btnPrimary}>
              Visit the site
            </button>
            <button type="button" className={s.btnSecondary}>
              Read the note
            </button>
            <button type="button" className={s.btnQuiet}>
              <span className={s.mark} aria-hidden>
                ·
              </span>
              Back to the dot
            </button>
          </div>
          <div className={s.buttons}>
            {ACCENTS.slice(1).map((a) => (
              <span key={a.key} className={s.tag} style={accentVars(a)}>
                <span aria-hidden>{a.mark}</span> {a.label}
              </span>
            ))}
          </div>
          <article className={s.panel}>
            <div className={s.panelHead}>
              <span className={s.tag}>
                <span aria-hidden>{accent.mark}</span>{" "}
                {accent.key === "home" ? "Home" : accent.label}
              </span>
              <span className={s.mono}>{sample.when}</span>
            </div>
            <h4 className={s.panelTitle}>{sample.title}</h4>
            <dl className={s.pairs}>
              <div>
                <dt>Goal</dt>
                <dd>{sample.goal}</dd>
              </div>
              <div>
                <dt>What I owned</dt>
                <dd>{sample.owned}</dd>
              </div>
              <div>
                <dt>Impact</dt>
                <dd>{sample.impact}</dd>
              </div>
            </dl>
            <a className={s.btnPrimary} href={sample.link.href}>
              {sample.link.label}
            </a>
          </article>
        </div>
      </Section>

      <footer className={s.footer}>
        <Link className={s.link} href="/play/systems/lab">
          All five lab systems
        </Link>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={s.section}>
      <h2 className={s.h2}>{title}</h2>
      <div className={s.sectionBody}>{children}</div>
    </section>
  );
}

/** Layout for the hero: full-bleed, positioned, so canvases and copy stack. */
export const heroClass = s.hero;
export const heroFieldClass = s.heroField;
export const tallClass = s.tall;
