"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Link from "next/link";

import { CONTACT, COLLECTIONS, UNITS, type Kind, type Unit } from "@/content/work";
import { routes } from "@/lib/routes";

import { KINDS, KIND_ORDER, kindColors } from "./encoding";
import { Greeting, Headline, Intro, SpokenTitle } from "./intro";
import { MAP_TITLE } from "./intro-timeline";
import { UniverseNav } from "./nav";
import { UniverseCanvas } from "./universe-canvas";
import s from "./universe.module.css";

const CHAPTERS = ["earth", "map", ...COLLECTIONS.map((c) => c.id), "home"];
const TICKS = ["earth", "map", ...COLLECTIONS.map((c) => c.tick), "map"];

const kindVars = (k: Kind) => {
  const c = kindColors(k);
  return { "--kind": c[2], "--kind-soft": c[3] } as CSSProperties;
};

const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* The opening plays once per visit: on every fresh load, but not again when
   someone comes back to the home page from /story or a unit's page within
   the same visit. Module state lives exactly that long. */
let introPlayed = false;

type IntroPhase = "intro" | "landing" | "done";

export function Universe() {
  const [filter, setFilter] = useState<Kind | "all">("all");
  const [active, setActive] = useState(0);
  const [intro, setIntro] = useState<IntroPhase>(() =>
    introPlayed ? "done" : "intro",
  );
  const greetingRef = useRef<HTMLParagraphElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  /* When Earth began to arrive: not yet while the opening speaks (null),
     long ago if the opening has already played this visit (0). */
  const arriveRef = useRef<number | null>(introPlayed ? 0 : null);
  const onLand = useCallback(() => {
    arriveRef.current = performance.now();
    setIntro("landing");
  }, []);
  const onIntroDone = useCallback(() => {
    introPlayed = true;
    setIntro("done");
  }, []);
  const hoverRef = useRef<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  /* Where the last jump was headed, and when: a second key press during a
     smooth scroll steps on from the target, not from wherever the scroll has
     got to, so pressing twice always moves two chapters. */
  const aimRef = useRef({ chapter: 0, at: 0 });

  const goTo = useCallback((chapter: number) => {
    const el = sectionRef.current;
    if (!el) return;
    aimRef.current = { chapter, at: performance.now() };
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top: top + chapter * window.innerHeight,
      behavior: calm() ? "auto" : "smooth",
    });
  }, []);

  /* The arrow keys step through the chapters while the universe is on
     screen; below it, in the index, they scroll the page as usual. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey)
        return;
      const dir = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
      if (!dir) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      const el = sectionRef.current;
      if (!el) return;
      const last = CHAPTERS.length - 1;
      const s = -el.getBoundingClientRect().top / window.innerHeight;
      if (s > last + 0.5) return;
      const aim = aimRef.current;
      const from =
        performance.now() - aim.at < 900 ? aim.chapter : Math.round(Math.max(0, s));
      const next = from + dir;
      if (next < 0 || next > last) return;
      e.preventDefault();
      goTo(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo]);

  /* Which chapter is on screen, for the index on the right. */
  useEffect(() => {
    const onScroll = () => {
      const el = sectionRef.current;
      if (!el) return;
      const s = -el.getBoundingClientRect().top / window.innerHeight;
      setActive(Math.max(0, Math.min(CHAPTERS.length - 1, Math.round(s))));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const hover = (id: string | null) => () => {
    hoverRef.current = id;
  };

  return (
    <main id="content" className={s.root} data-intro={intro}>
      {intro !== "done" && (
        <Intro
          target={greetingRef}
          headline={headlineRef}
          onLand={onLand}
          onDone={onIntroDone}
        />
      )}
      {/* Outside the pinned stage, which is a layer of its own under the
          chapters' text: fixed here, the bar and its menu sit above both. */}
      <UniverseNav filter={filter} setFilter={setFilter} goTo={goTo} chapter={active} />
      <section
        ref={sectionRef}
        data-universe
        className={s.universe}
        style={{ height: `${CHAPTERS.length * 100}svh` }}
      >
        <div className={s.stage}>
          <UniverseCanvas
            filter={filter}
            hoverRef={hoverRef}
            arriveRef={arriveRef}
            onPick={(ci) => goTo(ci + 2)}
            className={s.canvas}
          />
          <ol className={s.ticks} aria-label="Chapters">
            {TICKS.map((label, i) => (
              <li key={`${label}-${i}`}>
                <button
                  type="button"
                  aria-current={active === i ? "step" : undefined}
                  onClick={() => goTo(i)}
                >
                  <span>{label}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div className={s.chapters}>
          <Chapter>
            <Greeting ref={greetingRef} className={s.greeting} />
            <Headline ref={headlineRef} className={s.hero} />
            <p className={`${s.lede} ${s.reveal}`}>
              AI engineer and product builder. MS in AI Engineering at Carnegie Mellon.
            </p>
            <p className={`${s.hint} ${s.reveal}`}>scroll to pull back</p>
          </Chapter>

          <Chapter>
            <p className={s.kicker}>The map</p>
            <SpokenTitle spoken={MAP_TITLE} className={s.title} />
            <p className={s.lede}>
              Every point of light out here is one part of my life. The small blue one
              is where all of it happened.
            </p>
            <table className={s.key}>
              <tbody>
                {KIND_ORDER.map((k) => (
                  <tr key={k} style={kindVars(k)}>
                    <td className={s.mark}>{KINDS[k].mark}</td>
                    <td>{KINDS[k].bodyName}</td>
                    <td className={s.muted}>{KINDS[k].label.toLowerCase()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className={s.rules}>
              <div>
                <dt>brightness</dt>
                <dd>impact</dd>
              </div>
              <div>
                <dt>distance</dt>
                <dd>time, newest closest</dd>
              </div>
              <div>
                <dt>closer</dt>
                <dd>scroll, and each one resolves</dd>
              </div>
            </dl>
          </Chapter>

          {COLLECTIONS.map((col, ci) => (
            <Chapter key={col.id}>
              <p className={s.kicker}>
                {ci + 1} of {COLLECTIONS.length}, {col.span}
              </p>
              <h2 className={s.title}>{col.title}</h2>
              <p className={s.lede}>{col.note}</p>
              <ul className={s.units}>
                {col.units.map((u) => (
                  <UnitRow
                    key={u.id}
                    u={u}
                    onEnter={hover(u.id)}
                    onLeave={hover(null)}
                  />
                ))}
              </ul>
            </Chapter>
          ))}

          <Chapter>
            <p className={s.kicker}>Home</p>
            <h2 className={s.title}>All of it happened here.</h2>
            <p className={s.lede}>
              On the pale blue dot, one piece at a time. It is a little brighter than it
              was.
            </p>
            <nav className={s.links} aria-label="Elsewhere">
              <Link href={routes.story}>Read the note</Link>
              <a href={`mailto:${CONTACT.email}`}>Email</a>
              <a href={CONTACT.github} target="_blank" rel="noreferrer">
                GitHub
              </a>
              <a href={CONTACT.linkedin} target="_blank" rel="noreferrer">
                LinkedIn
              </a>
              <a href={CONTACT.resume} target="_blank" rel="noreferrer">
                Resume
              </a>
            </nav>
          </Chapter>
        </div>
      </section>

      <section id="index" className={s.index} aria-labelledby="index-title">
        <h2 id="index-title" className={s.indexTitle}>
          Index
        </h2>
        <p className={s.lede}>The same map, as a list.</p>
        <table className={s.table}>
          <thead>
            <tr>
              <th>when</th>
              <th>name</th>
              <th>kind</th>
              <th>result</th>
            </tr>
          </thead>
          <tbody>
            {UNITS.map((u) => (
              <tr key={u.id} style={kindVars(u.kind)}>
                <td className={s.muted}>{u.when}</td>
                <td>
                  <Link href={`${routes.work}/${u.id}`}>{u.name}</Link>
                </td>
                <td>
                  <span className={s.mark}>{KINDS[u.kind].mark}</span>{" "}
                  {KINDS[u.kind].label.toLowerCase()}
                </td>
                <td className={s.muted}>{u.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function Chapter({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    /* A quick scroll can bring several crossings in one batch: the last
       is where the chapter is now. Reading the first could leave a chapter
       that is on screen marked as off it, and so invisible. */
    const io = new IntersectionObserver(
      (entries) => setOn(entries[entries.length - 1].intersectionRatio > 0.55),
      { threshold: [0, 0.55, 1] },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={s.chapter} data-on={on}>
      <div className={s.column}>{children}</div>
    </div>
  );
}

function UnitRow({
  u,
  onEnter,
  onLeave,
}: {
  u: Unit;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const kind = KINDS[u.kind];
  return (
    <li
      className={s.unit}
      style={kindVars(u.kind)}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
    >
      <div className={s.unitHead}>
        <span className={s.mark} aria-hidden>
          {kind.mark}
        </span>
        <Link className={s.unitName} href={`${routes.work}/${u.id}`}>
          {u.name}
        </Link>
        <span className={s.unitKind}>{kind.bodyName}</span>
      </div>
      <p className={s.unitLine}>{u.line}</p>
      <p className={s.unitResult}>{u.result}</p>
      {u.link && (
        <a className={s.unitLink} href={u.link.href} target="_blank" rel="noreferrer">
          {u.link.label}
        </a>
      )}
    </li>
  );
}
