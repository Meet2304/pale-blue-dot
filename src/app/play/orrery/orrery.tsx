"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";

import { now, person, projects, skills, socials, turns } from "../content";
import s from "./orrery.module.css";

type Body = {
  id: string;
  label: string;
  /** Orbit radius as a fraction of the model's half-width. */
  r: number;
  /** Diameter in px at the model's reference size. */
  size: number;
  moons?: number;
  ring?: boolean;
  tone: string;
  start: number;
};

/** Innermost outwards: why, what's live, the work, the craft that carries it. */
const BODIES: Body[] = [
  { id: "dot", label: "The dot", r: 0.19, size: 7, tone: "#9cc8ff", start: 0.4 },
  {
    id: "now",
    label: "Now",
    r: 0.28,
    size: 12,
    moons: now.length,
    tone: "#e9e0c9",
    start: 2.6,
  },
  { id: "p0", label: projects[0].name, r: 0.39, size: 24, tone: "#c9a45c", start: 4.1 },
  {
    id: "p1",
    label: projects[1].name,
    r: 0.5,
    size: 18,
    ring: true,
    tone: "#b58e57",
    start: 1.2,
  },
  { id: "p2", label: projects[2].name, r: 0.62, size: 14, tone: "#a7b6a3", start: 5.4 },
  {
    id: "craft",
    label: "Craft",
    r: 0.78,
    size: 16,
    moons: skills.length,
    tone: "#d7c9a6",
    start: 3.3,
  },
];

/** Decisions don't keep a circular orbit. They swing in, change course, and leave. */
const COMET = { a: 0.62, e: 0.55, tilt: -0.5 };

function detail(id: string): { title: string; body: ReactNode } {
  if (id === "sun") return { title: person.name, body: <p>{person.intro}</p> };
  if (id === "dot")
    return {
      title: "The dot",
      body: (
        <>
          <p>{person.whyShort}</p>
          <p>
            <Link href="/story">Read the note</Link>
          </p>
        </>
      ),
    };
  if (id === "now")
    return {
      title: "Now",
      body: (
        <ul>
          {now.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ),
    };
  if (id === "craft")
    return {
      title: "Craft",
      body: (
        <dl className={s.pairs}>
          {skills.map((g) => (
            <div key={g.group}>
              <dt>{g.group}</dt>
              <dd>{g.items.join(", ")}</dd>
            </div>
          ))}
        </dl>
      ),
    };
  if (id === "comet")
    return {
      title: "Turns",
      body: (
        <dl className={s.pairs}>
          {turns.map((t) => (
            <div key={t.year}>
              <dt>{t.year}</dt>
              <dd>{t.text}</dd>
            </div>
          ))}
        </dl>
      ),
    };
  const p = projects[Number(id.slice(1))];
  return {
    title: p.name,
    body: (
      <>
        <p className={s.move}>{p.move}</p>
        <dl className={s.pairs}>
          <div>
            <dt>Before</dt>
            <dd>{p.before}</dd>
          </div>
          <div>
            <dt>I took on</dt>
            <dd>{p.choice}</dd>
          </div>
          <div>
            <dt>Instead of</dt>
            <dd>{p.tradeoff}</dd>
          </div>
          <div>
            <dt>Since then</dt>
            <dd>{p.shift}</dd>
          </div>
        </dl>
      </>
    ),
  };
}

export function Orrery() {
  const modelRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const speed = useRef(1);
  const target = useRef(1);

  /* The model winds down while you are looking at something and winds back up
     when you let go, like a hand resting on the crank. */
  useEffect(() => {
    target.current = selected || hovered ? 0.08 : 1;
  }, [selected, hovered]);

  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let t = 0;
    let last = performance.now();

    const frame = (nowMs: number) => {
      const dt = Math.min(64, nowMs - last) / 1000;
      last = nowMs;
      speed.current += (target.current - speed.current) * 0.06;
      if (!still) t += dt * speed.current;

      const model = modelRef.current;
      const half = model ? model.clientWidth / 2 : 0;
      const bodyEl = (id: string) =>
        model?.querySelector<HTMLElement>(`[data-body="${id}"]`);

      for (const b of BODIES) {
        const el = bodyEl(b.id);
        if (!el) continue;
        /* Kepler's third law: period grows as r^1.5. */
        const angle = b.start + (t * 0.35) / Math.pow(b.r / 0.19, 1.5);
        el.style.transform = `translate(${Math.cos(angle) * b.r * half}px, ${Math.sin(angle) * b.r * half}px)`;
        const moonEls = el.querySelectorAll<HTMLElement>("[data-moon]");
        moonEls.forEach((m, i) => {
          const ma = t * 1.4 + (i * Math.PI * 2) / moonEls.length;
          const mr = b.size * 0.95;
          m.style.transform = `translate(${Math.cos(ma) * mr}px, ${Math.sin(ma) * mr}px)`;
        });
      }

      const comet = bodyEl("comet");
      if (comet) {
        const M = t * 0.06 + 2;
        const E = M + COMET.e * Math.sin(M) + 0.5 * COMET.e * COMET.e * Math.sin(2 * M);
        const x = COMET.a * (Math.cos(E) - COMET.e);
        const y = COMET.a * Math.sqrt(1 - COMET.e * COMET.e) * Math.sin(E);
        const c = Math.cos(COMET.tilt);
        const sn = Math.sin(COMET.tilt);
        const rx = (x * c - y * sn) * half;
        const ry = (x * sn + y * c) * half;
        const heading = Math.atan2(ry, rx);
        comet.style.transform = `translate(${rx}px, ${ry}px)`;
        comet.style.setProperty("--tail", `${heading}rad`);
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const open = selected ? detail(selected) : null;
  const focusId = selected ?? hovered;
  const b = (id: string) => ({
    "data-body": id,
    onClick: () => setSelected((cur) => (cur === id ? null : id)),
    onMouseEnter: () => setHovered(id),
    onMouseLeave: () => setHovered(null),
    onFocus: () => setHovered(id),
    onBlur: () => setHovered(null),
    "aria-pressed": selected === id,
  });

  /* The comet's orbit, drawn as the ellipse it actually follows. */
  const cb = COMET.a * Math.sqrt(1 - COMET.e * COMET.e);

  return (
    <main id="content" className={s.root}>
      <section className={s.plate}>
        <div className={s.text}>
          <p className={s.name}>{person.name}</p>
          <h1 className={s.line}>{person.heroLine}</h1>

          <div className={s.reading} aria-live="polite">
            {open ? (
              <div key={selected} className={s.card}>
                <h2>{open.title}</h2>
                {open.body}
                <button
                  type="button"
                  className={s.close}
                  onClick={() => setSelected(null)}
                >
                  Put it back
                </button>
              </div>
            ) : (
              <div className={s.card}>
                <p className={s.caption}>
                  Fig. 1. A working model of one life, in which everything turns about a
                  single choice.
                </p>
                <p className={s.hint}>Choose any body to read it.</p>
              </div>
            )}
          </div>
        </div>

        <div className={s.model} ref={modelRef} data-focus={focusId ?? ""}>
          <svg viewBox="-1 -1 2 2" className={s.orbits} aria-hidden>
            <defs>
              <path id="or-sun-ring" d="M 0,-0.135 a 0.135,0.135 0 1,1 -0.0001,0" />
            </defs>
            {BODIES.map((body) => (
              <circle
                key={body.id}
                r={body.r}
                className={focusId === body.id ? s.orbitOn : undefined}
              />
            ))}
            <ellipse
              cx={-COMET.a * COMET.e}
              rx={COMET.a}
              ry={cb}
              transform={`rotate(${(COMET.tilt * 180) / Math.PI})`}
              className={`${s.cometOrbit} ${focusId === "comet" ? s.orbitOn : ""}`}
            />
            {/* The thesis is engraved round the centre, where it holds everything
                else in place. */}
            <text className={s.engraved}>
              <textPath href="#or-sun-ring" startOffset="0">
                {person.thesis}
              </textPath>
            </text>
          </svg>

          <button
            type="button"
            className={s.sun}
            {...b("sun")}
            aria-label={`${person.name}: who I am`}
          >
            <span className={s.bodyLabel}>Me</span>
          </button>

          {BODIES.map((body) => (
            <button
              key={body.id}
              type="button"
              className={s.body}
              {...b(body.id)}
              style={{
                ["--size" as string]: `${body.size}px`,
                ["--tone" as string]: body.tone,
              }}
            >
              <span className={s.orb} data-ring={body.ring ? "true" : undefined} />
              {Array.from({ length: body.moons ?? 0 }, (_, i) => (
                <span key={i} className={s.moon} data-moon />
              ))}
              <span className={s.bodyLabel}>{body.label}</span>
            </button>
          ))}

          <button type="button" className={`${s.body} ${s.comet}`} {...b("comet")}>
            <span className={s.orb} />
            <span className={s.bodyLabel}>Turns</span>
          </button>
        </div>
      </section>

      <footer className={s.foot}>
        <p>
          Constructed by hand. <Link href="/story">Why the dot is blue</Link>
        </p>
        <nav aria-label="Elsewhere">
          {socials.map((l) => (
            <a key={l.label} href={l.href} target="_blank" rel="noreferrer">
              {l.label}
            </a>
          ))}
        </nav>
      </footer>
    </main>
  );
}
