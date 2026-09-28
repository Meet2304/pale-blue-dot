"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";

import type { FieldConfig, ShapeId } from "./engine";
import { ParticleField } from "./particle-field";
import base from "./specimen.module.css";

/**
 * One layout for all five systems, so they can be compared part by part: the
 * same hero, the same tokens, the same components, the same words. Each system
 * supplies only its skin (a CSS module with the same class names) and its
 * particle configuration.
 */

export type SystemSpec = {
  slug: string;
  number: number;
  name: string;
  tagline: string;
  idea: string;
  field: FieldConfig;
  /** The same particles, at a count and grid suited to a texture swatch. */
  texture: FieldConfig;
  sequence: ShapeId[];
  principles: { title: string; body: string }[];
  colors: { name: string; hex: string; role: string }[];
  fonts: { display: string; text: string };
  radii: { name: string; value: string; use: string }[];
  motion: { name: string; ms: number; easing: string; use: string }[];
  textureNote: string;
  scramble?: boolean;
};

type Skin = Record<string, string>;

const SHAPE_LABEL: Record<ShapeId, string> = {
  dot: "Dot",
  nebula: "Nebula",
  ring: "Ring",
  spiral: "Galaxy",
  name: "Name",
  constellation: "Constellation",
  gradient: "Gradient",
};

const FILTERS = ["All", "Experience", "Projects", "Research", "Leadership"];

const cx = (...c: (string | undefined | false)[]) => c.filter(Boolean).join(" ");

export function Specimen({ spec, skin }: { spec: SystemSpec; skin: Skin }) {
  const [index, setIndex] = useState(0);
  const [auto, setAuto] = useState(true);
  const [filter, setFilter] = useState("Research");
  const k = (name: string) => cx(base[name], skin[name]);

  /* The hero plays through its forms on its own until someone picks one. */
  useEffect(() => {
    if (!auto) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % spec.sequence.length), 5600);
    return () => clearInterval(id);
  }, [auto, spec.sequence.length]);

  return (
    <main id="content" className={k("root")}>
      <section className={k("hero")}>
        <ParticleField
          config={spec.field}
          shape={spec.sequence[index]}
          focusX={0.62}
          className={k("field")}
        />
        <div className={k("heroText")}>
          <p className={k("number")}>Design system {spec.number} of 5</p>
          <h1 className={k("name")}>{spec.name}</h1>
          <p className={k("tagline")}>{spec.tagline}</p>
          <p className={k("idea")}>{spec.idea}</p>
          <div className={k("shapes")} role="group" aria-label="Choose a form">
            {spec.sequence.map((id, i) => (
              <button
                key={id}
                type="button"
                className={k("chip")}
                aria-pressed={i === index}
                onClick={() => {
                  setAuto(false);
                  setIndex(i);
                }}
              >
                <Label scramble={spec.scramble}>{SHAPE_LABEL[id]}</Label>
              </button>
            ))}
          </div>
        </div>
      </section>

      <Section k={k} title="Principles">
        <div className={k("principles")}>
          {spec.principles.map((p) => (
            <div key={p.title} className={k("principle")}>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section k={k} title="Colour">
        <div className={k("swatches")}>
          {spec.colors.map((c) => (
            <div key={c.name} className={k("swatch")}>
              <span className={k("swatchChip")} style={{ background: c.hex }} />
              <span className={k("swatchName")}>{c.name}</span>
              <span className={k("swatchHex")}>{c.hex}</span>
              <span className={k("swatchRole")}>{c.role}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section k={k} title="Type">
        <p className={k("fontNames")}>
          {spec.fonts.display} for display. {spec.fonts.text} for text.
        </p>
        <div className={k("typeStack")}>
          <div className={k("typeRow")}>
            <span className={k("typeLabel")}>Display</span>
            <p className={k("tDisplay")}>What&apos;s missing, I make.</p>
          </div>
          <div className={k("typeRow")}>
            <span className={k("typeLabel")}>Title</span>
            <p className={k("tTitle")}>Project Phoenix</p>
          </div>
          <div className={k("typeRow")}>
            <span className={k("typeLabel")}>Body</span>
            <p className={k("tBody")}>
              Catch the earliest cell changes in cervical cancer, and show why the model
              decided, not just how confident it is.
            </p>
          </div>
          <div className={k("typeRow")}>
            <span className={k("typeLabel")}>Caption</span>
            <p className={k("tCaption")}>Research, July 2025 to May 2026</p>
          </div>
        </div>
      </Section>

      <Section k={k} title="Shape">
        <div className={k("radii")}>
          {spec.radii.map((r) => (
            <div key={r.name} className={k("radius")}>
              <span className={k("radiusBox")} style={{ borderRadius: r.value }} />
              <span className={k("swatchName")}>{r.name}</span>
              <span className={k("swatchHex")}>{r.value}</span>
              <span className={k("swatchRole")}>{r.use}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section k={k} title="Components">
        <div className={k("componentGrid")}>
          <div className={k("componentCell")}>
            <h3 className={k("cellTitle")}>Buttons</h3>
            <div className={k("buttons")}>
              <button type="button" className={k("btnPrimary")}>
                <Label scramble={spec.scramble}>Visit the site</Label>
              </button>
              <button type="button" className={k("btnSecondary")}>
                <Label scramble={spec.scramble}>Read the note</Label>
              </button>
              <button type="button" className={k("btnQuiet")}>
                <Label scramble={spec.scramble}>Back to the dot</Label>
              </button>
              <button
                type="button"
                className={k("btnIcon")}
                aria-label="Back to the dot"
              >
                <span className={k("iconDot")} />
              </button>
            </div>
          </div>

          <div className={k("componentCell")}>
            <h3 className={k("cellTitle")}>Filter navigation</h3>
            <nav className={k("nav")} aria-label="Filter the sky">
              <span className={k("navDot")} aria-hidden />
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  className={k("navItem")}
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                >
                  <Label scramble={spec.scramble}>{f}</Label>
                </button>
              ))}
            </nav>
          </div>

          <div className={cx(k("componentCell"), base.wide)}>
            <h3 className={k("cellTitle")}>Case panel</h3>
            <article className={k("panel")}>
              <div className={k("panelHead")}>
                <span className={k("tag")}>Research</span>
                <span className={k("tCaption")}>2025 to 2026</span>
              </div>
              <h4 className={k("panelTitle")}>Project Phoenix</h4>
              <dl className={k("pairs")}>
                <div>
                  <dt>Goal</dt>
                  <dd>
                    Catch the earliest cell changes in cervical cancer, and show why the
                    model decided.
                  </dd>
                </div>
                <div>
                  <dt>What I owned</dt>
                  <dd>
                    Image cleanup on SipakMed and Herlev, the CNN models, and the visual
                    explanations.
                  </dd>
                </div>
                <div>
                  <dt>Impact</dt>
                  <dd>
                    Manuscript in preparation. The model runs live in the browser.
                  </dd>
                </div>
              </dl>
              <div className={k("panelActions")}>
                <a
                  className={k("btnPrimary")}
                  href="https://phoenix.meetbhatt.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Label scramble={spec.scramble}>Visit the site</Label>
                </a>
                <a
                  className={k("link")}
                  href="https://github.com/Meet2304/Project-Phoenix"
                  target="_blank"
                  rel="noreferrer"
                >
                  Source code
                </a>
              </div>
            </article>
          </div>
        </div>
      </Section>

      <Section k={k} title="Motion">
        <div className={k("motion")}>
          {spec.motion.map((m) => (
            <div key={m.name} className={k("motionRow")}>
              <div className={k("motionMeta")}>
                <span className={k("swatchName")}>{m.name}</span>
                <span className={k("swatchHex")}>
                  {m.ms} ms, {m.easing}
                </span>
                <span className={k("swatchRole")}>{m.use}</span>
              </div>
              <div
                className={k("track")}
                style={{ "--dur": `${m.ms}ms`, "--ease": m.easing } as CSSProperties}
              >
                <span className={k("trackDot")} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section k={k} title="Texture">
        <p className={k("lede")}>{spec.textureNote}</p>
        <div className={k("textureWrap")}>
          <ParticleField
            config={spec.texture}
            shape="gradient"
            still
            interactive={false}
            className={k("texture")}
          />
        </div>
      </Section>

      <footer className={k("footer")}>
        <Link href="/play/systems" className={k("link")}>
          All five systems
        </Link>
      </footer>
    </main>
  );
}

function Label({ children, scramble }: { children: string; scramble?: boolean }) {
  return scramble ? <Scramble text={children} /> : <>{children}</>;
}

function Section({
  k,
  title,
  children,
}: {
  k: (n: string) => string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={k("section")}>
      <h2 className={k("sectionTitle")}>{title}</h2>
      <div className={k("sectionBody")}>{children}</div>
    </section>
  );
}

/**
 * A label that decodes itself on hover or focus, the glyph field's version of
 * a hover state. The real text is always in the accessible name.
 */
function Scramble({ text }: { text: string }) {
  const [shown, setShown] = useState(text);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const glyphs = "·:-=+*#%@";

  const run = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (timer.current) clearInterval(timer.current);
    let f = 0;
    timer.current = setInterval(() => {
      f++;
      const settled = Math.floor(f / 1.6);
      setShown(
        text
          .split("")
          .map((ch, i) =>
            i < settled || ch === " "
              ? ch
              : glyphs[Math.floor(Math.random() * glyphs.length)],
          )
          .join(""),
      );
      if (settled >= text.length && timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
    }, 28);
  };

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  return (
    <span onMouseEnter={run}>
      <span className={base.srOnly}>{text}</span>
      <span aria-hidden>{shown}</span>
    </span>
  );
}
