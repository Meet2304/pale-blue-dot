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
  type Unit,
} from "@/content/work";
import { routes } from "@/lib/routes";
import { takeChapter } from "@/lib/visit";

import { KINDS } from "./encoding";
import { HeroAudio } from "./hero-audio";
import { Greeting, Headline, Intro, SpokenTitle } from "./intro";
import { FIRST } from "./chapters";
import { DOT_TITLE, SKY_TITLE } from "./intro-timeline";
import { lookColors, lookOf } from "./looks";
import { WorkMedia } from "./media";
import { UniverseNav } from "./nav";
import { Footer } from "./footer";
import { WayMark } from "./way-mark";
import { createSmoothScroll, type SmoothScroll } from "./smooth-scroll";
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

/* A piece of work's own colours: the ones its body is drawn in. */
const lookVars = (u: Unit) => {
  const c = lookColors(lookOf(u.id, u.kind));
  return { "--kind": c[2], "--kind-soft": c[3] } as CSSProperties;
};

/* A chapter's height: 100svh, which on a phone is not always the window's
   height (the address bar comes and goes). */
const chapterHeight = (section: HTMLElement) => section.offsetHeight / CHAPTERS.length;

/* The opening plays once per visit: on every fresh load, but not again when
   someone comes back to the home page from /story or a unit's page within
   the same visit. Module state lives exactly that long. */
let introPlayed = false;

type IntroPhase = "intro" | "landing" | "done";

export function Universe() {
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
  /* The page's scroll, smoothed (smooth-scroll.ts). */
  const scrollRef = useRef<SmoothScroll | null>(null);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const smooth = createSmoothScroll({
      stops: () => {
        const top = el.getBoundingClientRect().top + window.scrollY;
        const h = chapterHeight(el);
        return CHAPTERS.map((_, i) => top + i * h);
      },
    });
    scrollRef.current = smooth;
    return () => {
      smooth.destroy();
      scrollRef.current = null;
    };
  }, []);

  /* A glide to a chapter, for the menus and the index. */
  const goTo = useCallback((chapter: number) => {
    const el = sectionRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    scrollRef.current?.glideTo(top + chapter * chapterHeight(el));
  }, []);

  /* Asked for from another page's bar (page-nav.tsx): once the opening is
     over, fly there. */
  useEffect(() => {
    if (intro !== "done") return;
    const n = takeChapter();
    if (n !== null && n > 0) goTo(n);
  }, [intro, goTo]);

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
      <UniverseNav goTo={goTo} docked={active > 0} />
      <HeroAudio ready={intro === "done"} />
      <section
        ref={sectionRef}
        data-universe
        className={s.universe}
        style={{ height: `${CHAPTERS.length * 100}svh` }}
      >
        <div className={s.stage}>
          <UniverseCanvas
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
              I build AI products. MS in AI and Tech Management at Carnegie Mellon.
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
              That tiny dot is Earth, seen from very far away. It&apos;s where I live,
              learn and build everything you&apos;re about to see.
            </p>
            <p className={s.hint}>Scroll to see my work</p>
          </Chapter>

          <Chapter>
            <p className={s.kicker}>Further out</p>
            <SpokenTitle spoken={SKY_TITLE} className={s.title} />
            <p className={s.lede}>
              Each light out here is one thing I&apos;ve done: a degree, a job, a
              project, some research, or a team I led. Keep scrolling and I&apos;ll show
              you each one, newest first.
            </p>
            <p className={s.hint}>Scroll to visit them one by one</p>
          </Chapter>

          {PIECES.map(({ u, col, i }, k) => (
            <Piece key={u.id} u={u} col={col} i={i} index={k} />
          ))}

          <Chapter>
            <p className={s.kicker}>What&apos;s next</p>
            <h2 className={s.title}>I&apos;m just getting started.</h2>
            <p className={s.lede}>
              Everything you just scrolled through fits inside one small patch of sky.
              There&apos;s a lot of empty space left, and I want to fill it with things
              that help people. If you&apos;re working on something interesting,
              I&apos;d love to hear about it.
            </p>
            <nav className={s.links} aria-label="Elsewhere">
              <Link href={routes.story} data-icon="story">
                <WayMark icon="story" />
                Read the story
              </Link>
              <Link href={routes.contact} data-icon="contact">
                <WayMark icon="contact" />
                Say hello
              </Link>
              <a
                href={CONTACT.github}
                target="_blank"
                rel="noreferrer"
                data-icon="github"
              >
                <WayMark icon="github" />
                GitHub
              </a>
              <a
                href={CONTACT.linkedin}
                target="_blank"
                rel="noreferrer"
                data-icon="linkedin"
              >
                <WayMark icon="linkedin" />
                LinkedIn
              </a>
              <a
                href={CONTACT.resume}
                target="_blank"
                rel="noreferrer"
                data-icon="resume"
              >
                <WayMark icon="resume" />
                Resume
              </a>
            </nav>
          </Chapter>
        </div>
      </section>

      <Footer />
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
      (entries) => setOn(entries[entries.length - 1].intersectionRatio > 0.02),
      { threshold: [0, 0.02, 0.5, 1] },
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
  const aspect = u.media?.kind === "photo" ? u.media.width / u.media.height : 16 / 10;
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
      {(u.link || u.repo) && (
        <p className={s.visits}>
          {u.link && (
            <a className={s.visit} href={u.link.href} target="_blank" rel="noreferrer">
              {u.link.verb ?? "Visit"} {u.link.label} <span aria-hidden>↗</span>
            </a>
          )}
          {u.repo && (
            <a
              className={`${s.visit} ${s.code}`}
              href={u.repo}
              target="_blank"
              rel="noreferrer"
              data-icon="github"
            >
              <WayMark icon="github" className={s.codeMark} />
              See the code <span aria-hidden>↗</span>
            </a>
          )}
        </p>
      )}
    </Chapter>
  );
}
