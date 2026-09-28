"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import Link from "next/link";

import { ACCENTS, accentOf, rampList, rampOf, type AccentKey } from "../current/color";
import type { BodyId } from "./bodies";
import { BodyCanvas } from "./body-canvas";
import { Decode } from "./decode";
import { MiniBody } from "./mini-body";
import s from "./terminal.module.css";

type Cat = {
  key: AccentKey;
  id: string;
  body: BodyId;
  bodyName: string;
  scanName: string;
  tagline: string;
  item: string;
  when: string;
  line: string;
  goal: string;
  owned: string;
  impact: string;
  readouts: { v: string; l: string }[];
  link: { label: string; href: string };
};

/** Each kind of work has its own body, its own colour and one item to show. */
const CATS: Cat[] = [
  {
    key: "home",
    id: "obj 00",
    body: "earth",
    bodyName: "earth",
    scanName: "graticule",
    tagline: "A whole world, in characters.",
    item: "The pale blue dot",
    when: "Home",
    line: "Where everything on this site happened.",
    goal: "Add something to the one point of light where everything has happened.",
    owned: "Everything on this site, one piece at a time.",
    impact: "Still being written.",
    readouts: [
      { v: "2021", l: "first light" },
      { v: "CMU", l: "now" },
    ],
    link: { label: "Read the note", href: "/story" },
  },
  {
    key: "projects",
    id: "obj 01",
    body: "nebula",
    bodyName: "nebula",
    scanName: "density contours",
    tagline: "Where new things form.",
    item: "Linea",
    when: "Project, 2026",
    line: "Lyrics that float over your work.",
    goal: "Lyrics that follow your music without taking you out of your work.",
    owned:
      "The whole app: the overlay, Windows media sessions, synced lyrics, the offline cache.",
    impact: "Free and open source, on version 0.2.0.",
    readouts: [
      { v: "0.2.0", l: "released" },
      { v: "open", l: "source" },
    ],
    link: { label: "Visit the site", href: "https://linea.meetbhatt.com" },
  },
  {
    key: "research",
    id: "obj 02",
    body: "blackhole",
    bodyName: "black hole",
    scanName: "gravity well",
    tagline: "Where ideas bend the light.",
    item: "Project Phoenix",
    when: "Research, 2025 to 2026",
    line: "Seeing why a model decides.",
    goal: "Catch the earliest cell changes in cervical cancer, and show why the model decided.",
    owned:
      "Image cleanup on SipakMed and Herlev, the CNN models, the visual explanations.",
    impact: "Manuscript in preparation. The model runs live in the browser.",
    readouts: [
      { v: "5", l: "cell classes" },
      { v: "live", l: "in browser" },
    ],
    link: { label: "Visit the site", href: "https://phoenix.meetbhatt.com" },
  },
  {
    key: "experience",
    id: "obj 03",
    body: "star",
    bodyName: "star system",
    scanName: "orbits",
    tagline: "Held in orbit, adding light.",
    item: "Blink Analytics",
    when: "Experience, 2024 to 2026",
    line: "From annotating data to leading product.",
    goal: "Human-feedback training for AI models, and the products built on it.",
    owned:
      "Led development of Serin, an AI hiring platform, and directed an intern team on fine-tuning.",
    impact: "A 222% increase in project revenue in two months.",
    readouts: [
      { v: "222%", l: "revenue, 2 mo" },
      { v: "3", l: "roles held" },
    ],
    link: { label: "Read the case", href: "#case" },
  },
  {
    key: "leadership",
    id: "obj 04",
    body: "constellation",
    bodyName: "constellation",
    scanName: "hidden members",
    tagline: "Separate stars, one shape.",
    item: "Mind Ripple",
    when: "Leadership, 2022 to 2026",
    line: "Thirty people, one escape room.",
    goal: "Grow the university's quizzing club and its flagship event.",
    owned: "Led a 30-member team as president, after heading its graphic design.",
    impact: "Matrix Breakout grew to 300+ participants, with earnings up 10% a year.",
    readouts: [
      { v: "300+", l: "participants" },
      { v: "30", l: "team" },
    ],
    link: { label: "Read the case", href: "#case" },
  },
];

const catOf = (k: AccentKey) => CATS.find((c) => c.key === k) ?? CATS[0];

const accentVars = (key: AccentKey) => {
  const r = rampOf(accentOf(key));
  return {
    "--accent": r.accent,
    "--accent-deep": r.deep,
    "--accent-dim": r.dim,
    "--accent-soft": r.soft,
    "--accent-white": r.white,
  } as CSSProperties;
};

export function TerminalSystem() {
  const [key, setKey] = useState<AccentKey>("home");
  const [sweep, setSweep] = useState(0);
  const cat = catOf(key);
  const ramp = useMemo(() => rampList(accentOf(key)), [key]);

  const choose = (k: AccentKey) => {
    if (k === key) return;
    setKey(k);
    setSweep((n) => n + 1);
  };

  return (
    <main id="content" className={s.root} style={accentVars(key)}>
      {sweep > 0 && <div key={sweep} className={s.sweep} aria-hidden />}

      <section data-scroll-hero className={s.tall}>
        <div className={s.hero} data-sticky>
          <BodyCanvas body={cat.body} ramp={ramp} className={s.field} />
          <Segmented
            className={s.nav}
            label="Filter by kind of work"
            value={key}
            onChange={(v) => choose(v as AccentKey)}
            items={ACCENTS.map((a) => ({ id: a.key, label: a.label, mark: a.mark }))}
            led
          />
          <div className={s.copy}>
            <p className={s.kicker}>Design system, Terminal</p>
            <h1 className={s.title}>Terminal</h1>
            <p className={s.tagline}>
              <Decode text={cat.tagline} />
            </p>
            <p className={s.idea}>
              Every body is drawn in characters, in one grid. Each kind of work has its
              own, and choosing one redraws the sky as the next.
            </p>
          </div>
          <dl className={s.hud} aria-label="Now showing">
            <div>
              <dt>obj</dt>
              <dd>
                <Decode text={cat.bodyName} />
              </dd>
            </div>
            <div>
              <dt>cat</dt>
              <dd>
                <Decode
                  text={cat.key === "home" ? "home" : accentOf(key).label.toLowerCase()}
                />
              </dd>
            </div>
            <div>
              <dt>item</dt>
              <dd>
                <Decode text={cat.item.toLowerCase()} />
              </dd>
            </div>
            <div>
              <dt>scan</dt>
              <dd>
                <Decode text={`hover: ${cat.scanName}`} />
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <div className={s.console}>
        <Section
          title="Bodies"
          note="Each kind of work is a different body, drawn in the same grid. Pick one to redraw the sky."
        >
          <div className={s.modules}>
            {CATS.map((c) => (
              <Module
                key={c.key}
                cat={c}
                active={c.key === key}
                onSelect={() => choose(c.key)}
              />
            ))}
          </div>
        </Section>

        <Section
          id="case"
          title="Case file"
          note="The long form of the selected body. It redraws with the sky."
        >
          <CaseFile cat={cat} ramp={ramp} />
        </Section>

        <Section
          title="Controls"
          note="Pressed from the same surface, lit from the same side as the planet."
        >
          <Controls />
        </Section>

        <Section
          title="System"
          note="One light, three surfaces, five colours, two faces, and the motions that tie them."
        >
          <SystemSheet onSweep={() => setSweep((n) => n + 1)} />
        </Section>

        <footer className={s.footer}>
          <Link href="/play/systems" className={s.link}>
            All design systems
          </Link>
        </footer>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------- Pieces */

function Section({
  id,
  title,
  note,
  children,
}: {
  id?: string;
  title: string;
  note: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);
  return (
    <section ref={ref} id={id} className={s.section} data-on={on}>
      <header className={s.sectionHead}>
        <span className={s.led} data-on="true" aria-hidden />
        <h2 className={s.h2}>{title}</h2>
        <p className={s.note}>{note}</p>
      </header>
      {children}
    </section>
  );
}

/**
 * A recessed track with a raised thumb that slides to the chosen item. The
 * thumb is positioned by writing to the DOM, not state, so moving it never
 * re-renders the list.
 */
function Segmented({
  items,
  value,
  onChange,
  label,
  className,
  led,
}: {
  items: { id: string; label: string; mark?: string }[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  className?: string;
  led?: boolean;
}) {
  const track = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const place = () => {
      const el = track.current?.querySelector<HTMLElement>(`[data-id="${value}"]`);
      if (!el || !thumb.current) return;
      thumb.current.style.transform = `translateX(${el.offsetLeft}px)`;
      thumb.current.style.width = `${el.offsetWidth}px`;
    };
    place();
    window.addEventListener("resize", place);
    document.fonts?.ready.then(place);
    return () => window.removeEventListener("resize", place);
  }, [value]);

  return (
    <div
      ref={track}
      className={`${s.segment} ${className ?? ""}`}
      role="group"
      aria-label={label}
    >
      {led && <span className={s.led} data-on="true" aria-hidden />}
      <span ref={thumb} className={s.thumb} aria-hidden />
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          data-id={it.id}
          className={s.segItem}
          aria-pressed={it.id === value}
          onClick={() => onChange(it.id)}
        >
          {it.mark && (
            <span className={s.mark} aria-hidden>
              {it.mark}
            </span>
          )}
          {it.label}
        </button>
      ))}
    </div>
  );
}

/** Tilt toward the cursor, and move the specular highlight with it. */
const tilt = {
  onPointerMove(e: ReactPointerEvent<HTMLElement>) {
    const el = e.currentTarget;
    const b = el.getBoundingClientRect();
    const x = (e.clientX - b.left) / b.width;
    const y = (e.clientY - b.top) / b.height;
    el.style.setProperty("--rx", `${(0.5 - y) * 6}deg`);
    el.style.setProperty("--ry", `${(x - 0.5) * 7}deg`);
    el.style.setProperty("--gx", `${x * 100}%`);
    el.style.setProperty("--gy", `${y * 100}%`);
  },
  onPointerLeave(e: ReactPointerEvent<HTMLElement>) {
    e.currentTarget.style.setProperty("--rx", "0deg");
    e.currentTarget.style.setProperty("--ry", "0deg");
  },
};

function Module({
  cat,
  active,
  onSelect,
}: {
  cat: Cat;
  active: boolean;
  onSelect: () => void;
}) {
  const [rescan, setRescan] = useState(0);
  const ramp = useMemo(() => rampList(accentOf(cat.key)), [cat.key]);
  const accent = accentOf(cat.key);

  return (
    <button
      type="button"
      className={s.module}
      style={accentVars(cat.key)}
      aria-pressed={active}
      onClick={onSelect}
      onPointerEnter={() => setRescan((n) => n + 1)}
      onPointerMove={tilt.onPointerMove}
      onPointerLeave={tilt.onPointerLeave}
    >
      <span className={s.moduleHead}>
        <span className={s.led} data-on={active} aria-hidden />
        <span className={s.monoMute}>{cat.id}</span>
        <span className={s.tag}>
          <span aria-hidden>{accent.mark}</span>{" "}
          {cat.key === "home" ? "Home" : accent.label}
        </span>
      </span>
      <span className={s.screen}>
        <MiniBody
          body={cat.body}
          ramp={ramp}
          rescan={rescan}
          scale={0.44}
          className={s.screenCanvas}
        />
        <span className={s.screenLabel}>{cat.bodyName}</span>
      </span>
      <span className={s.moduleTitle}>{cat.item}</span>
      <span className={s.moduleLine}>{cat.line}</span>
      <span className={s.wells}>
        {cat.readouts.map((r) => (
          <span key={r.l} className={s.well}>
            <span className={s.wellValue}>{r.v}</span>
            <span className={s.wellLabel}>{r.l}</span>
          </span>
        ))}
      </span>
    </button>
  );
}

function CaseFile({ cat, ramp }: { cat: Cat; ramp: string[] }) {
  const accent = accentOf(cat.key);
  return (
    <article
      className={s.case}
      onPointerMove={tilt.onPointerMove}
      onPointerLeave={tilt.onPointerLeave}
    >
      <div className={`${s.screen} ${s.caseScreen}`}>
        <MiniBody
          body={cat.body}
          ramp={ramp}
          scale={0.42}
          cellW={6}
          cellH={10}
          className={s.screenCanvas}
        />
        <span className={s.screenLabel}>
          <Decode text={`${cat.id} / ${cat.bodyName}`} />
        </span>
      </div>
      <div className={s.caseBody}>
        <div className={s.moduleHead}>
          <span className={s.led} data-on="true" aria-hidden />
          <span className={s.tag}>
            <span aria-hidden>{accent.mark}</span>{" "}
            {cat.key === "home" ? "Home" : accent.label}
          </span>
          <span className={s.monoMute}>
            <Decode text={cat.when} />
          </span>
        </div>
        <h3 className={s.caseTitle}>
          <Decode text={cat.item} step={32} />
        </h3>
        <dl className={s.rows}>
          <div>
            <dt>Goal</dt>
            <dd>
              <Decode text={cat.goal} step={8} />
            </dd>
          </div>
          <div>
            <dt>What I owned</dt>
            <dd>
              <Decode text={cat.owned} step={8} />
            </dd>
          </div>
          <div>
            <dt>Impact</dt>
            <dd>
              <Decode text={cat.impact} step={8} />
            </dd>
          </div>
        </dl>
        <div className={s.caseFoot}>
          <span className={s.wells}>
            {cat.readouts.map((r) => (
              <span key={r.l} className={s.well}>
                <span className={s.wellValue}>
                  <Decode text={r.v} step={40} />
                </span>
                <span className={s.wellLabel}>{r.l}</span>
              </span>
            ))}
          </span>
          <a className={s.btnPrimary} href={cat.link.href}>
            {cat.link.label}
          </a>
        </div>
      </div>
    </article>
  );
}

function Controls() {
  const [on, setOn] = useState(true);
  const [view, setView] = useState("sky");
  const [level, setLevel] = useState(62);
  return (
    <div className={s.controls}>
      <div className={s.bay}>
        <span className={s.bayLabel}>Buttons</span>
        <div className={s.row}>
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
          <button type="button" className={s.btnIcon} aria-label="Back to the dot">
            <span className={s.iconDot} />
          </button>
        </div>
      </div>

      <div className={s.bay}>
        <span className={s.bayLabel}>Switch</span>
        <div className={s.row}>
          <button
            type="button"
            role="switch"
            aria-checked={on}
            className={s.switch}
            onClick={() => setOn((v) => !v)}
          >
            <span className={s.switchKnob} />
          </button>
          <span className={s.monoMute}>Scanner {on ? "on" : "off"}</span>
          <span className={s.led} data-on={on} aria-hidden />
        </div>
      </div>

      <div className={s.bay}>
        <span className={s.bayLabel}>Segmented</span>
        <Segmented
          label="View"
          value={view}
          onChange={setView}
          items={[
            { id: "sky", label: "Sky" },
            { id: "list", label: "List" },
            { id: "time", label: "Timeline" },
          ]}
        />
      </div>

      <div className={s.bay}>
        <span className={s.bayLabel}>Dial</span>
        <label className={s.dial}>
          <span className={s.srOnly}>Glyph density</span>
          <input
            type="range"
            min={0}
            max={100}
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
            className={s.range}
            style={{ "--level": `${level}%` } as CSSProperties}
          />
          <output className={s.readout}>{String(level).padStart(3, "0")}</output>
        </label>
      </div>

      <div className={s.bay}>
        <span className={s.bayLabel}>Field</span>
        <label className={s.field2}>
          <span className={s.mark} aria-hidden>
            {">"}
          </span>
          <span className={s.srOnly}>Search the sky</span>
          <input className={s.input} placeholder="Search the sky" />
        </label>
      </div>

      <div className={s.bay}>
        <span className={s.bayLabel}>Tags</span>
        <div className={s.row}>
          {ACCENTS.slice(1).map((a) => (
            <span key={a.key} className={s.tag} style={accentVars(a.key)}>
              <span aria-hidden>{a.mark}</span> {a.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SystemSheet({ onSweep }: { onSweep: () => void }) {
  const [scan, setScan] = useState(0);
  const [word, setWord] = useState(0);
  const [pressed, setPressed] = useState(false);
  const words = ["Where new things form.", "Where ideas bend the light."];

  return (
    <div className={s.sheet}>
      <div className={s.panel}>
        <h3 className={s.h3}>One light</h3>
        <p className={s.body}>
          Every surface is lit from the upper left, by the same sun that lights the
          planet. Highlights take a trace of the colour on screen, so the console glows
          with the sky.
        </p>
        <div className={s.lightStage} aria-hidden>
          <span className={s.sun}>*</span>
          <span className={s.chipRaised} />
        </div>
      </div>

      <div className={s.panel}>
        <h3 className={s.h3}>Three surfaces</h3>
        <div className={s.surfaces}>
          <span className={s.surface} data-kind="raised">
            <span>Raised</span>
            <span className={s.monoMute}>modules, buttons</span>
          </span>
          <span className={s.surface} data-kind="flat">
            <span>Flat</span>
            <span className={s.monoMute}>the console</span>
          </span>
          <span className={s.surface} data-kind="inset">
            <span>Pressed</span>
            <span className={s.monoMute}>screens, wells, tracks</span>
          </span>
        </div>
      </div>

      <div className={`${s.panel} ${s.span2}`}>
        <h3 className={s.h3}>Five colours, five bodies</h3>
        <div className={s.accentRows}>
          {ACCENTS.map((a) => (
            <div key={a.key} className={s.accentRow} style={accentVars(a.key)}>
              <span className={s.led} data-on="true" aria-hidden />
              <span className={s.accentName}>
                <span className={s.mark}>{a.mark}</span>{" "}
                {a.key === "home" ? "Home" : a.label}
              </span>
              <span className={s.monoMute}>{catOf(a.key).bodyName}</span>
              <span className={s.rampBar}>
                {rampList(a).map((hex) => (
                  <span key={hex} style={{ background: hex }} />
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className={`${s.panel} ${s.span2}`}>
        <h3 className={s.h3}>Two faces</h3>
        <p className={s.typeDisplay}>What&apos;s missing, I make.</p>
        <p className={s.typeMono}>obj 02 / black hole / 5 cell classes</p>
        <p className={s.monoMute}>
          IBM Plex Sans, light, for voice. IBM Plex Mono for every readout.
        </p>
      </div>

      <div className={`${s.panel} ${s.span2}`}>
        <h3 className={s.h3}>Motion</h3>
        <div className={s.motions}>
          <div className={s.motion}>
            <div className={`${s.screen} ${s.motionStage}`}>
              <MiniBody
                body="blackhole"
                ramp={rampList(accentOf("research"))}
                rescan={scan}
                scale={0.3}
                className={s.screenCanvas}
              />
            </div>
            <span className={s.motionName}>Scan wave</span>
            <span className={s.monoMute}>1300 ms, from the centre out</span>
            <button
              type="button"
              className={s.btnSecondary}
              onClick={() => setScan((n) => n + 1)}
            >
              Run
            </button>
          </div>
          <div className={s.motion}>
            <div className={`${s.screen} ${s.motionStage} ${s.decodeStage}`}>
              <Decode text={words[word]} />
            </div>
            <span className={s.motionName}>Decode</span>
            <span className={s.monoMute}>24 ms a character</span>
            <button
              type="button"
              className={s.btnSecondary}
              onClick={() => setWord((n) => 1 - n)}
            >
              Run
            </button>
          </div>
          <div className={s.motion}>
            <div className={`${s.screen} ${s.motionStage} ${s.pressStage}`}>
              <span className={s.pressChip} data-pressed={pressed} />
            </div>
            <span className={s.motionName}>Press</span>
            <span className={s.monoMute}>raised to pressed, 160 ms</span>
            <button
              type="button"
              className={s.btnSecondary}
              onClick={() => setPressed((v) => !v)}
            >
              Run
            </button>
          </div>
          <div className={s.motion}>
            <div className={`${s.screen} ${s.motionStage} ${s.sweepStage}`}>
              <span />
            </div>
            <span className={s.motionName}>Refresh</span>
            <span className={s.monoMute}>900 ms sweep on every change</span>
            <button type="button" className={s.btnSecondary} onClick={onSweep}>
              Run
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
