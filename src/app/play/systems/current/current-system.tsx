"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Link from "next/link";

import type { ShapeId } from "../engine";
import {
  ACCENTS,
  accentOf,
  rampList,
  rampOf,
  type Accent,
  type AccentKey,
} from "./color";
import { CurrentField, GLYPH_TIERS } from "./current-field";
import s from "./current.module.css";

export type Pairing = { key: string; label: string; sans: string; mono: string };

const FORMS: { id: ShapeId; label: string }[] = [
  { id: "dot", label: "Dot" },
  { id: "nebula", label: "Nebula" },
  { id: "name", label: "Name" },
  { id: "ring", label: "Ring" },
  { id: "spiral", label: "Galaxy" },
  { id: "constellation", label: "Constellation" },
];

/** One real item per accent, so the panel shows what each category will hold. */
const SAMPLES: Record<
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
    link: { label: "Read the case", href: "#components" },
  },
  leadership: {
    title: "Mind Ripple",
    when: "Leadership, 2022 to 2026",
    goal: "Grow the university's quizzing club and its flagship event.",
    owned: "Led a 30-member team as president, after heading its graphic design.",
    impact: "Matrix Breakout grew to 300+ participants, with earnings up 10% a year.",
    link: { label: "Read the case", href: "#components" },
  },
};

/** A label that decodes through the light glyphs on hover. */
function Decode({ text }: { text: string }) {
  const [shown, setShown] = useState(text);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pool = [...GLYPH_TIERS[1], ...GLYPH_TIERS[2]];

  const run = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (timer.current) clearInterval(timer.current);
    let f = 0;
    timer.current = setInterval(() => {
      f++;
      const settled = Math.floor(f / 1.5);
      setShown(
        text
          .split("")
          .map((ch, i) =>
            i < settled || ch === " "
              ? ch
              : pool[Math.floor(Math.random() * pool.length)],
          )
          .join(""),
      );
      if (settled >= text.length && timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
    }, 30);
  };

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  return (
    <span onMouseEnter={run}>
      <span className={s.srOnly}>{text}</span>
      <span aria-hidden>{shown}</span>
    </span>
  );
}

const accentVars = (a: Accent) => {
  const r = rampOf(a);
  return {
    "--accent": r.accent,
    "--accent-deep": r.deep,
    "--accent-dim": r.dim,
    "--accent-soft": r.soft,
    "--accent-white": r.white,
  } as CSSProperties;
};

export function CurrentSystem({ pairings }: { pairings: Pairing[] }) {
  const [form, setForm] = useState(0);
  const [auto, setAuto] = useState(true);
  const [accentKey, setAccentKey] = useState<AccentKey>("home");
  const [pairingKey, setPairingKey] = useState(pairings[0].key);

  const accent = accentOf(accentKey);
  const palette = useMemo(() => rampList(accentOf(accentKey)), [accentKey]);
  const pairing = pairings.find((p) => p.key === pairingKey) ?? pairings[0];
  const sample = SAMPLES[accentKey];

  useEffect(() => {
    if (!auto) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setForm((i) => (i + 1) % FORMS.length), 6200);
    return () => clearInterval(id);
  }, [auto]);

  const rootStyle = {
    ...accentVars(accent),
    "--sans": `var(${pairing.sans})`,
    "--mono": `var(${pairing.mono})`,
  } as CSSProperties;

  return (
    <main id="content" className={s.root} style={rootStyle}>
      <section className={s.hero}>
        <CurrentField
          shape={FORMS[form].id}
          palette={palette}
          nameFontVar="--sans"
          monoFontVar="--mono"
          focusX={0.62}
          className={s.field}
        />

        <nav className={s.nav} aria-label="Filter by kind of work">
          <span className={s.navDot} aria-hidden />
          {ACCENTS.map((a) => (
            <button
              key={a.key}
              type="button"
              className={s.navItem}
              aria-pressed={a.key === accentKey}
              onClick={() => setAccentKey(a.key)}
            >
              <span className={s.mark} aria-hidden>
                {a.mark}
              </span>
              {a.label}
            </button>
          ))}
        </nav>

        <div className={s.heroText}>
          <p className={s.kicker}>Design system 6, the combination</p>
          <h1 className={s.title}>Current</h1>
          <p className={s.tagline}>Light that flows, written in passing.</p>
          <p className={s.idea}>
            Murmuration&apos;s flow carries the form. Glyph&apos;s marks give it grain.
            The accent belongs to whatever you&apos;re looking at, and everything else
            stays the same when it changes.
          </p>
          <div className={s.chips} role="group" aria-label="Choose a form">
            {FORMS.map((f, i) => (
              <button
                key={f.id}
                type="button"
                className={s.chip}
                aria-pressed={i === form}
                onClick={() => {
                  setAuto(false);
                  setForm(i);
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <Section title="Principles">
        <div className={s.principles}>
          <Principle title="The accent is a guest">
            Identity lives in the black, the motion, the glyphs and the type. Colour
            only visits. Swap it for another category and nothing else moves.
          </Principle>
          <Principle title="Never still">
            The field&apos;s resting state is flow. Particles circle their place, a few
            wander wide, and the glyphs keep changing on their own clocks.
          </Principle>
          <Principle title="Glyphs are grain">
            Marks sit in the haze and at the edges, where the particles are thin. They
            never draw the form, and never the heavy characters that flatten it.
          </Principle>
          <Principle title="Two speeds">
            Particles flow at display rate. Glyphs tick at 20 frames a second. The
            contrast between smooth and stepped is the texture.
          </Principle>
        </div>
      </Section>

      <Section title="Accents">
        <p className={s.lede}>
          One accent per kind of work. All five share the same perceived lightness, in
          the OKLCH colour space, so swapping one changes the hue and nothing else. Each
          also has a glyph mark, so a category never relies on colour alone.
        </p>
        <div className={s.accentGrid}>
          {ACCENTS.map((a) => (
            <button
              key={a.key}
              type="button"
              className={s.accentCard}
              style={accentVars(a)}
              aria-pressed={a.key === accentKey}
              onClick={() => setAccentKey(a.key)}
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
              <span className={s.mono}>
                L {a.l} C {a.c} h {a.h}
              </span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Neutrals">
        <div className={s.swatches}>
          {[
            ["Void", "#000000", "The sky. True black."],
            ["Night", "#0b0c10", "Raised surfaces: panels and menus."],
            ["Line", "#1d1f27", "Borders and quiet rules."],
            ["Mute", "#6c707c", "Captions and idle labels."],
            ["Soft", "#a9adb8", "Secondary text."],
            ["Paper", "#eceef2", "Reading text and headings."],
          ].map(([name, hex, role]) => (
            <div key={name} className={s.swatch}>
              <span className={s.swatchChip} style={{ background: hex }} />
              <span className={s.swatchName}>{name}</span>
              <span className={s.mono}>{hex}</span>
              <span className={s.swatchRole}>{role}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type">
        <div className={s.segment} role="group" aria-label="Font pairing">
          {pairings.map((p) => (
            <button
              key={p.key}
              type="button"
              aria-pressed={p.key === pairingKey}
              className={s.segmentItem}
              onClick={() => setPairingKey(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className={s.typeStack}>
          <TypeRow label="Display">
            <p className={s.tDisplay}>What&apos;s missing, I make.</p>
          </TypeRow>
          <TypeRow label="Title">
            <p className={s.tTitle}>Project Phoenix</p>
          </TypeRow>
          <TypeRow label="Body">
            <p className={s.tBody}>
              Catch the earliest cell changes in cervical cancer, and show why the model
              decided, not just how confident it is.
            </p>
          </TypeRow>
          <TypeRow label="Mono">
            <p className={s.mono}>
              <span className={s.markInline}>×</span> Research, July 2025 to May 2026
            </p>
          </TypeRow>
        </div>
      </Section>

      <Section title="Glyphs">
        <div className={s.tiers}>
          {[
            ["Haze", "The faintest light, at the edge of every form.", GLYPH_TIERS[0]],
            ["Edge", "Where a form thins out into space.", GLYPH_TIERS[1]],
            [
              "Spark",
              "Denser pockets, and wherever the cursor passes.",
              GLYPH_TIERS[2],
            ],
          ].map(([name, role, set]) => (
            <div key={name as string} className={s.tier}>
              <span className={s.swatchName}>{name as string}</span>
              <span className={s.tierGlyphs}>{(set as string[]).join(" ")}</span>
              <span className={s.swatchRole}>{role as string}</span>
            </div>
          ))}
        </div>
        <ul className={s.rules}>
          <li>No letters, and none of @ # % &amp;. They read as noise, not light.</li>
          <li>Glyphs never draw the core of a form. The particles own it.</li>
          <li>Every cell changes on its own clock, so nothing flickers in unison.</li>
          <li>Glyphs in transit re-decide fast: movement looks like thinking.</li>
        </ul>
        <div className={s.textureWrap}>
          <CurrentField
            shape="gradient"
            palette={palette}
            monoFontVar="--mono"
            interactive
            count={4200}
            className={s.texture}
          />
        </div>
      </Section>

      <Section title="Components" id="components">
        <div className={s.componentGrid}>
          <div>
            <h3 className={s.cellTitle}>Buttons</h3>
            <div className={s.buttons}>
              <button type="button" className={s.btnPrimary}>
                <Decode text="Visit the site" />
              </button>
              <button type="button" className={s.btnSecondary}>
                <Decode text="Read the note" />
              </button>
              <button type="button" className={s.btnQuiet}>
                <span className={s.mark} aria-hidden>
                  ·
                </span>
                Back to the dot
              </button>
              <button type="button" className={s.btnIcon} aria-label="Back to the dot">
                <span className={s.iconDot} />
              </button>
            </div>
          </div>

          <div>
            <h3 className={s.cellTitle}>Category tags</h3>
            <div className={s.buttons}>
              {ACCENTS.slice(1).map((a) => (
                <span key={a.key} className={s.tag} style={accentVars(a)}>
                  <span aria-hidden>{a.mark}</span> {a.label}
                </span>
              ))}
            </div>
          </div>

          <div className={s.wide}>
            <h3 className={s.cellTitle}>Case panel, in the selected accent</h3>
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
              <div className={s.panelActions}>
                <a className={s.btnPrimary} href={sample.link.href}>
                  <Decode text={sample.link.label} />
                </a>
                <Link className={s.link} href="/play/systems">
                  All systems
                </Link>
              </div>
            </article>
          </div>
        </div>
      </Section>

      <Section title="Motion">
        <div className={s.motion}>
          {[
            [
              "Flow",
              2600,
              "cubic-bezier(0.37, 0, 0.63, 1)",
              "Particles travelling along currents to a new form",
            ],
            [
              "Circulate",
              9000,
              "linear",
              "The resting state: every particle circling its place",
            ],
            ["Tick", 1000, "steps(20)", "The glyph layer's clock: 20 frames a second"],
            ["Decode", 420, "steps(14)", "Labels resolving through glyphs on hover"],
            [
              "Retint",
              900,
              "cubic-bezier(0.4, 0, 0.2, 1)",
              "The accent crossing over to a new category",
            ],
          ].map(([name, ms, easing, use]) => (
            <div key={name as string} className={s.motionRow}>
              <div className={s.motionMeta}>
                <span className={s.swatchName}>{name as string}</span>
                <span className={s.mono}>
                  {ms as number} ms, {easing as string}
                </span>
                <span className={s.swatchRole}>{use as string}</span>
              </div>
              <div
                className={s.track}
                data-loop={name === "Circulate" ? "true" : undefined}
                style={{ "--dur": `${ms}ms`, "--ease": easing } as CSSProperties}
              >
                <span className={s.trackDot} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <footer className={s.footer}>
        <Link href="/play/systems" className={s.link}>
          All systems
        </Link>
      </footer>
    </main>
  );
}

function Section({
  title,
  id,
  children,
}: {
  title: string;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section className={s.section} id={id}>
      <h2 className={s.sectionTitle}>{title}</h2>
      <div className={s.sectionBody}>{children}</div>
    </section>
  );
}

function Principle({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={s.principle}>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

function TypeRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={s.typeRow}>
      <span className={s.typeLabel}>{label}</span>
      {children}
    </div>
  );
}
