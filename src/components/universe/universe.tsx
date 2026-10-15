"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import Link from "next/link";

import { CONTACT, COLLECTIONS, type Collection, type Unit } from "@/content/work";
import { routes } from "@/lib/routes";
import { markIntroOver } from "@/lib/sound-pref";
import {
  isReturning,
  markOpeningSeen,
  RETURNING_SCRIPT,
  takeChapter,
} from "@/lib/visit";

import { KINDS } from "./encoding";
import { Greeting, Headline, Intro, SpokenTitle } from "./intro";
import { FIRST } from "./chapters";
import { DOT_TITLE, SKY_TITLE } from "./intro-timeline";
import { lookColors, lookOf } from "./looks";
import { WorkMedia } from "./media";
import { AwayLink, PageLink } from "./piece-links";
import { UniverseNav } from "./nav";
import { Footer } from "./footer";
import { WayMark } from "./way-mark";
import { measureChapters } from "./chapter-map";
import { createSmoothScroll, type SmoothScroll } from "./smooth-scroll";
import { UniverseCanvas } from "./universe-canvas";
import s from "./universe.module.css";

/* The story, a chapter each: who I am, on Earth; Earth from far enough
   away to be a pale blue dot, where I build things; further out, my impact
   so far; then one piece of work at a time, newest first; and all of it, in
   the void still ahead. The chapter index names them, and marks each piece
   of work by its year, named once, at the first of the year's pieces. */
const TICKS = [
  { label: "earth", first: true },
  { label: "dot", first: true },
  { label: "impact", first: true },
  ...COLLECTIONS.flatMap((c) =>
    c.units.map((_, i) => ({ label: c.tick, first: i === 0 })),
  ),
  { label: "next", first: true },
];

/* Each piece of work, with the year it belongs to. */
const PIECES = COLLECTIONS.flatMap((col) => col.units.map((u) => ({ u, col })));

/* A piece of work's own colours: the ones its body is drawn in. */
const lookVars = (u: Unit) => {
  const c = lookColors(lookOf(u.id, u.kind));
  return { "--kind": c[2], "--kind-soft": c[3] } as CSSProperties;
};

/* A phone held upright, where a piece of work stacks: its body's stage,
   then its copy, then its picture (the same query as the stylesheet). */
const STACKED = "(max-width: 860px) and (max-aspect-ratio: 4/3)";
/* The docked bar's height on a phone, and a little air under it. */
const PHONE_BAR = 64;
const AIR = 16;

/**
 * Where a menu lands for chapter `n`, in px: measured, not multiplied out,
 * since chapters can be taller than the screen (chapter-map.ts). Its top,
 * except for a piece of work on a phone: there it lands on the piece
 * itself, its name, words and picture on screen together, with as much of
 * the body's stage above them as still fits. The camera holds the body
 * where it is, so the copy rises over the lower part of it.
 */
const chapterLanding = (section: HTMLElement, n: number) => {
  const el = section.querySelectorAll<HTMLElement>("[data-chapter]")[n];
  if (!el) return 0;
  const top = el.getBoundingClientRect().top + window.scrollY;
  const copy = el.querySelector('[data-part="copy"]');
  if (!el.hasAttribute("data-piece") || !copy || !window.matchMedia(STACKED).matches)
    return top;
  const media = el.querySelector('[data-part="media"]');
  const head = copy.getBoundingClientRect().top + window.scrollY;
  const foot = (media ?? copy).getBoundingClientRect().bottom + window.scrollY;
  /* All of it at the foot of the screen if it fits; if not, its name just
     under the bar. */
  const fitted = foot + AIR - window.innerHeight;
  const named = head - PHONE_BAR - AIR;
  return Math.max(top, Math.min(fitted, named));
};

/* The opening plays once per visit: on every fresh load, but not again when
   someone comes back to the home page from /story or a unit's page within
   the same visit. Module state lives exactly that long. */
let introPlayed = false;

type IntroPhase = "intro" | "landing" | "done";

export function Universe() {
  /* Past the hero, the bar docks. Only this crossing renders the page
     again; which chapter is on screen lives in the index (ChapterIndex). */
  const [docked, setDocked] = useState(false);
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
    markOpeningSeen();
    markIntroOver();
    setIntro("done");
  }, []);
  /* A recent visitor has heard the greeting: the hero is there at once
     (the server's HTML already shows it, see RETURNING_SCRIPT), and Earth
     grows in from a point of light as it does after the opening. Before
     the browser paints, so the opening is never seen. */
  useLayoutEffect(() => {
    if (introPlayed || !isReturning()) return;
    introPlayed = true;
    arriveRef.current = performance.now();
    markIntroOver();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- has to land before the first paint; the server can't know
    setIntro("done");
  }, []);
  const sectionRef = useRef<HTMLElement>(null);
  /* The page's scroll, smoothed (smooth-scroll.ts). */
  const scrollRef = useRef<SmoothScroll | null>(null);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const smooth = createSmoothScroll({
      /* Each chapter's top; and, for one taller than the screen, its last
         screen too, so the keys read a chapter to its end before moving on. */
      stops: () => {
        const top = el.getBoundingClientRect().top + window.scrollY;
        const view = window.innerHeight;
        const { tops, heights } = measureChapters(el);
        return tops.flatMap((t, i) =>
          heights[i] > view + 1 ? [top + t, top + t + heights[i] - view] : [top + t],
        );
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
    scrollRef.current?.glideTo(() => chapterLanding(el, chapter));
  }, []);

  /* Asked for from another page's bar (page-nav.tsx): once the opening is
     over, fly there. */
  useEffect(() => {
    if (intro !== "done") return;
    const n = takeChapter();
    if (n !== null && n > 0) goTo(n);
  }, [intro, goTo]);

  return (
    <main id="content" className={s.root} data-intro={intro}>
      <script dangerouslySetInnerHTML={{ __html: RETURNING_SCRIPT }} />
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
      <UniverseNav goTo={goTo} docked={docked} />
      <section ref={sectionRef} data-universe className={s.universe}>
        <div className={s.stage}>
          <UniverseCanvas
            arriveRef={arriveRef}
            onPick={(i) => goTo(i + FIRST)}
            className={s.canvas}
          />
          <ChapterIndex
            sectionRef={sectionRef}
            goTo={goTo}
            onChapter={(n) => setDocked(n > 0)}
          />
        </div>

        <div className={s.chapters}>
          <Chapter>
            <Greeting ref={greetingRef} className={s.greeting} />
            <Headline ref={headlineRef} className={s.hero} />
            <p className={s.srOnly}>Meet Bhatt, AI engineer and product builder.</p>
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

          {PIECES.map(({ u, col }, k) => (
            <Piece key={u.id} u={u} col={col} index={k} />
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

/**
 * The chapter index down the right edge, which knows which chapter is on
 * screen: the one across the middle of the screen, watched rather than
 * measured on every scroll (which forced the page's layout each time). It
 * keeps that to itself, so a chapter going by renders the index again, not
 * the whole page.
 */
function ChapterIndex({
  sectionRef,
  goTo,
  onChapter,
}: {
  sectionRef: RefObject<HTMLElement | null>;
  goTo: (chapter: number) => void;
  onChapter: (chapter: number) => void;
}) {
  const [active, setActive] = useState(0);
  const report = useRef(onChapter);
  useEffect(() => {
    report.current = onChapter;
  }, [onChapter]);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const chapters = [...el.querySelectorAll<HTMLElement>("[data-chapter]")];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const n = chapters.indexOf(e.target as HTMLElement);
          setActive(n);
          report.current(n);
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    chapters.forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [sectionRef]);

  return (
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
      data-chapter
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
function Piece({ u, col, index }: { u: Unit; col: Collection; index: number }) {
  const kind = KINDS[u.kind];
  const aspect =
    u.media?.kind === "photo" || u.media?.kind === "splat"
      ? u.media.width / u.media.height
      : u.media?.kind === "figure"
        ? 1.2
        : 16 / 10;
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
      </p>
      <h2 className={s.pieceName}>{u.name}</h2>
      <p className={s.pieceKind}>
        <span className={s.mark} aria-hidden>
          {kind.mark}
        </span>{" "}
        {kind.label}, {u.when}
      </p>
      <p className={s.pieceBrief}>{u.brief}</p>
      <ul className={s.skills} aria-label="Skills">
        {u.skills.map((k) => (
          <li key={k}>{k}</li>
        ))}
      </ul>
      <div className={s.visits}>
        <PageLink
          className={s.visit}
          href={`${routes.work}/${u.id}`}
          label="What I did"
        />
        {/* Short words, so the three fit one row: a site is "Live site",
            anything with its own verb says what it is ("Read the paper"). */}
        {u.link && (
          <AwayLink
            className={s.visit}
            href={u.link.href}
            icon={u.link.verb ? "story" : "home"}
          >
            {u.link.verb ? `${u.link.verb} ${u.link.label}` : "Live site"}
          </AwayLink>
        )}
        {u.repo && (
          <AwayLink className={s.visit} href={u.repo} icon="github">
            Code
          </AwayLink>
        )}
      </div>
    </Chapter>
  );
}
