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

import {
  CONTACT,
  COLLECTIONS,
  UNITS,
  type Collection,
  type Kind,
  type Unit,
} from "@/content/work";
import { routes } from "@/lib/routes";

import { KINDS, kindColors } from "./encoding";
import { Greeting, Headline, Intro, SpokenTitle } from "./intro";
import { FIRST } from "./chapters";
import { DOT_TITLE, SKY_TITLE } from "./intro-timeline";
import { lookColors, lookOf } from "./looks";
import { WorkMedia } from "./media";
import { UniverseNav } from "./nav";
import { UniverseCanvas } from "./universe-canvas";
import s from "./universe.module.css";

/* The story: who I am, on Earth; Earth from far enough away to be a pale
   blue dot, where I build things; further out, my impact so far; then one
   piece of work at a time, newest first; and all of it, in the void still
   ahead. */
const CHAPTERS = ["earth", "dot", "impact", ...UNITS.map((u) => u.id), "next"];

/* The chapter index: each piece of work is marked by its year, which is
   named once, at the first of the year's pieces. */
const TICKS = [
  { label: "earth", first: true },
  { label: "dot", first: true },
  { label: "impact", first: true },
  ...COLLECTIONS.flatMap((c) =>
    c.units.map((_, i) => ({ label: c.tick, first: i === 0 })),
  ),
  { label: "next", first: true },
];

/* Each piece of work, with the year it belongs to and its place in it. */
const PIECES = COLLECTIONS.flatMap((col) => col.units.map((u, i) => ({ u, col, i })));

const kindVars = (k: Kind) => {
  const c = kindColors(k);
  return { "--kind": c[2], "--kind-soft": c[3] } as CSSProperties;
};

/* A piece of work's own colours: the ones its body is drawn in. */
const lookVars = (u: Unit) => {
  const c = lookColors(lookOf(u.id, u.kind));
  return { "--kind": c[2], "--kind-soft": c[3] } as CSSProperties;
};

const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* A chapter's height: 100svh, which on a phone is not always the window's
   height (the address bar comes and goes). */
const chapterHeight = (section: HTMLElement) => section.offsetHeight / CHAPTERS.length;

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
  const sectionRef = useRef<HTMLElement>(null);
  /* Where the last jump was headed, and when: a second key press during a
     smooth scroll steps on from the target, not from wherever the scroll has
     got to, so pressing twice always moves two chapters. */
  const aimRef = useRef({ chapter: 0, at: 0 });

  /* A glide, for the arrow keys and the menus: the page's own scroll,
     eased in and out, from wherever it is to a chapter. The visitor's own
     scrolling is never taken over. Any wheel or touch takes over from it. */
  const glideRef = useRef(0);
  const gliding = useRef(false);
  const glideTo = useCallback((top: number) => {
    cancelAnimationFrame(glideRef.current);
    const from = window.scrollY;
    const d = top - from;
    if (Math.abs(d) < 1) {
      gliding.current = false;
      return;
    }
    if (calm()) {
      window.scrollTo({ top, behavior: "auto" });
      return;
    }
    const span = Math.abs(d) / window.innerHeight;
    const dur = Math.min(1100, 520 + span * 300);
    const t0 = performance.now();
    gliding.current = true;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2;
      window.scrollTo({ top: from + d * e, behavior: "auto" });
      if (k < 1) glideRef.current = requestAnimationFrame(step);
      else gliding.current = false;
    };
    glideRef.current = requestAnimationFrame(step);
  }, []);
  useEffect(() => {
    const takeOver = () => {
      if (!gliding.current) return;
      cancelAnimationFrame(glideRef.current);
      gliding.current = false;
    };
    window.addEventListener("wheel", takeOver, { passive: true });
    window.addEventListener("touchstart", takeOver, { passive: true });
    return () => {
      window.removeEventListener("wheel", takeOver);
      window.removeEventListener("touchstart", takeOver);
    };
  }, []);
  const goTo = useCallback(
    (chapter: number) => {
      const el = sectionRef.current;
      if (!el) return;
      aimRef.current = { chapter, at: performance.now() };
      const top = el.getBoundingClientRect().top + window.scrollY;
      glideTo(top + chapter * chapterHeight(el));
    },
    [glideTo],
  );

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
      const s = -el.getBoundingClientRect().top / chapterHeight(el);
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
      const s = -el.getBoundingClientRect().top / chapterHeight(el);
      setActive(Math.max(0, Math.min(CHAPTERS.length - 1, Math.round(s))));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
      <UniverseNav
        filter={filter}
        setFilter={setFilter}
        goTo={goTo}
        chapter={active}
        docked={active > 0}
      />
      <section
        ref={sectionRef}
        data-universe
        className={s.universe}
        style={{ height: `${CHAPTERS.length * 100}svh` }}
      >
        <div className={s.stage}>
          <UniverseCanvas
            filter={filter}
            arriveRef={arriveRef}
            onPick={(i) => goTo(i + FIRST)}
            className={s.canvas}
          />
          <ol className={s.ticks} aria-label="Chapters">
            {TICKS.map(({ label, first }, i) => (
              <li key={`${label}-${i}`}>
                <button
                  type="button"
                  data-first={first}
                  aria-current={active === i ? "step" : undefined}
                  onClick={() => goTo(i)}
                >
                  <span>{label[0].toUpperCase() + label.slice(1)}</span>
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
              I build AI products. MS in AI Engineering at Carnegie Mellon.
            </p>
            <p className={`${s.hint} ${s.reveal}`}>Scroll to zoom out</p>
          </Chapter>

          {/* The pull-back, first as far as Earth becoming a point of light,
              then on to the impact so far, as one view. The pieces below
              take it apart. */}
          <Chapter>
            <p className={s.kicker}>Zoom out</p>
            <SpokenTitle spoken={DOT_TITLE} className={s.title} />
            <p className={s.lede}>
              Earth, from far enough away to see it whole: one point of light.
            </p>
            <p className={s.hint}>Scroll to see my impact</p>
          </Chapter>

          <Chapter>
            <p className={s.kicker}>Further out</p>
            <SpokenTitle spoken={SKY_TITLE} className={s.title} />
            <p className={s.lede}>
              Every light out here is something I&apos;ve built, researched or led.
            </p>
            <p className={s.hint}>Scroll to dive in, one piece at a time</p>
          </Chapter>

          {PIECES.map(({ u, col, i }, k) => (
            <Piece key={u.id} u={u} col={col} i={i} index={k} />
          ))}

          <Chapter>
            <p className={s.kicker}>What&apos;s next</p>
            <h2 className={s.title}>There&apos;s a long way to go.</h2>
            <p className={s.lede}>
              Everything I&apos;ve done so far fits in that one patch of light. All the
              dark around it is still to build.
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
        <p className={s.lede}>Every piece of work above, as a list.</p>
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

function Chapter({
  children,
  aside,
  className,
  style,
  piece,
}: {
  children: ReactNode;
  /** Beside the copy: a picture of the work. */
  aside?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** For a piece of work, its index: the canvas measures where its copy
      and picture sit, and fits the body into the space left. */
  piece?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    /* A chapter's words show whenever a real part of it is on screen, and
       stay as it scrolls away, so there is no point in a scroll where the
       words have gone: between two chapters, both are showing. A quick
       scroll can bring several crossings in one batch: the last is where
       the chapter is now. */
    const io = new IntersectionObserver(
      (entries) => setOn(entries[entries.length - 1].intersectionRatio > 0.12),
      { threshold: [0, 0.12, 0.5, 1] },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`${s.chapter} ${className ?? ""}`}
      style={style}
      data-on={on}
      data-piece={piece}
    >
      <div className={s.column} data-part="copy">
        {children}
      </div>
      {aside && (
        <div className={s.aside} data-part="media">
          {aside}
        </div>
      )}
    </div>
  );
}

/**
 * One piece of work: which year, what it is, what it was for, and why it is
 * drawn as the body it is, beside a picture of it where there is one. Its
 * body is on the canvas, in the same colours as the accents here, framed by
 * a reticle with its name, so the words and the body read as one.
 */
function Piece({
  u,
  col,
  i,
  index,
}: {
  u: Unit;
  col: Collection;
  i: number;
  index: number;
}) {
  const kind = KINDS[u.kind];
  const aspect =
    u.media?.kind === "photo" ? u.media.src.width / u.media.src.height : 16 / 10;
  return (
    <Chapter
      className={`${s.piece} ${u.media ? s.withMedia : ""} ${
        u.media?.kind === "photo" && u.media.logo ? s.withLogo : ""
      }`}
      style={{ ...lookVars(u), "--aspect": aspect } as CSSProperties}
      aside={u.media && <WorkMedia media={u.media} />}
      piece={index}
    >
      <p className={s.kicker}>
        {col.title}
        {col.title !== col.span && <span className={s.span}>, {col.span}</span>}
        {col.units.length > 1 && (
          <span className={s.count}>
            {i + 1} of {col.units.length}
          </span>
        )}
      </p>
      <h2 className={s.pieceName}>{u.name}</h2>
      <p className={s.pieceKind}>
        <span className={s.mark} aria-hidden>
          {kind.mark}
        </span>{" "}
        {kind.label}, {u.when}
      </p>
      <p className={s.pieceBrief}>{u.brief}</p>
      <p className={s.pieceBody}>
        <span className={s.bodyName}>Drawn as a {kind.bodyName}.</span>{" "}
        <span className={s.about}>{kind.about}</span>
      </p>
      {u.link && (
        <a className={s.visit} href={u.link.href} target="_blank" rel="noreferrer">
          {u.link.verb ?? "Visit"} {u.link.label} <span aria-hidden>↗</span>
        </a>
      )}
    </Chapter>
  );
}
