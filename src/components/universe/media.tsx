"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import dynamic from "next/dynamic";

import type { Media } from "@/content/work";

import { Picture } from "./picture";
import s from "./universe.module.css";

/* The zoom view's code is fetched on the first click, not with the page. */
const Lightbox = dynamic(() => import("./lightbox").then((m) => m.Lightbox), {
  ssr: false,
});

/* Each screen of a site holds for a moment, then the next scrolls up. */
const HOLD = 3400;
const SIZES = "(max-width: 860px) 92vw, 46rem";
/* A website's screens, as captured. */
const SCREEN_W = 1280;
const SCREEN_H = 800;

/**
 * A picture of a piece of work, beside it on the home page.
 *
 * Under the pointer it leans a few degrees towards it, as a print would
 * if picked up, and a soft sheen follows the pointer across it. Clicking
 * it opens it up (lightbox.tsx).
 *
 * A photo is shown whole, in its own shape.
 *
 * A website is shown in a browser frame, turning through a few of its
 * screens as if someone were scrolling it: plain images (picture.tsx), all
 * fetched together when the chapter is about two screens away. Opened up, its screens can be stepped through
 * or the live site tried, at a size where it can be used; "Try it live" on
 * the frame opens straight to that. Nothing of the live site loads until
 * then. The address in the frame's bar opens it in a new tab.
 *
 * The screens turn only while the frame is on screen, and nothing leans or
 * turns under reduced motion.
 */
export function WorkMedia({ media }: { media: Media }) {
  const ref = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const [seen, setSeen] = useState(false);
  /* Near: within two screens. From then on its pictures are fetched. */
  const [near, setNear] = useState(false);
  const [open, setOpen] = useState<{
    live: boolean;
    from: DOMRect | null;
    vars: CSSProperties;
  } | null>(null);
  const count = media.kind === "site" ? media.screens.length : 1;
  /* Until its screens have all been shown once, a site always starts from
     its first: the first look is the site as it opens. */
  const firstPass = useRef(true);
  /* Stepped through by hand: the screens hold a while before turning on. */
  const pausedUntil = useRef(0);
  const step = (d: number) => {
    firstPass.current = false;
    pausedUntil.current = Date.now() + HOLD * 1.5;
    setAt((i) => (i + d + count) % count);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    /* Seen: at least half of it on screen. */
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[entries.length - 1];
        const on = e.isIntersecting && e.intersectionRatio >= 0.5;
        if (on && firstPass.current) setAt(0);
        setSeen(on);
      },
      { threshold: [0, 0.5, 1] },
    );
    io.observe(el);
    const pre = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          pre.disconnect();
        }
      },
      { rootMargin: "200% 0px 200% 0px" },
    );
    pre.observe(el);
    return () => {
      io.disconnect();
      pre.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!seen || open || count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(
      () =>
        setAt((i) => {
          if (Date.now() < pausedUntil.current) return i;
          const next = (i + 1) % count;
          if (next === 0) firstPass.current = false;
          return next;
        }),
      HOLD,
    );
    return () => window.clearInterval(id);
  }, [seen, open, count]);

  /* The lean and the sheen follow the pointer. */
  const lean = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = el.getBoundingClientRect();
    const x = (e.clientX - box.left) / box.width;
    const y = (e.clientY - box.top) / box.height;
    el.style.setProperty("--ry", `${(x - 0.5) * 7}deg`);
    el.style.setProperty("--rx", `${(0.5 - y) * 5}deg`);
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
    el.dataset.lean = "true";
  };
  const rest = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--rx", "0deg");
    el.dataset.lean = "false";
  };

  /* What opened the lightbox gets focus back when it closes, once the
     picture is shown again. */
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open || !opener.current) return;
    opener.current.focus({ preventScroll: true });
    opener.current = null;
  }, [open]);
  const show = (live: boolean) => {
    opener.current = document.activeElement as HTMLElement | null;
    rest();
    const el = ref.current;
    /* The opened picture keeps the piece's colours. */
    const cs = el ? getComputedStyle(el) : null;
    setOpen({
      live,
      from: el?.getBoundingClientRect() ?? null,
      vars: {
        "--kind": cs?.getPropertyValue("--kind"),
        "--kind-soft": cs?.getPropertyValue("--kind-soft"),
      } as CSSProperties,
    });
  };

  return (
    <figure className={s.media}>
      <div
        ref={ref}
        className={`${s.tilt} ${media.kind === "photo" ? s.photo : s.site}`}
        onPointerMove={lean}
        onPointerLeave={rest}
        style={{ visibility: open ? "hidden" : undefined }}
      >
        {media.kind === "photo" ? (
          <button
            type="button"
            className={s.zoomIn}
            onClick={() => show(false)}
            aria-label={`Enlarge: ${media.alt}`}
          >
            <Picture
              src={media.src}
              alt={media.alt}
              width={media.width}
              height={media.height}
              sizes={SIZES}
              load={near}
              className={s.photoImg}
            />
          </button>
        ) : (
          <>
            <div className={s.chrome}>
              <span className={s.dots} aria-hidden>
                <i />
                <i />
                <i />
              </span>
              <a
                className={s.address}
                href={media.href}
                target="_blank"
                rel="noreferrer"
                title={`Open ${media.label} in a new tab`}
              >
                {media.label} <span aria-hidden>↗</span>
              </a>
            </div>
            <div className={s.screen}>
              <button
                type="button"
                className={s.tryLive}
                onClick={() => show(false)}
                aria-label={`Enlarge ${media.label}`}
              >
                <span className={s.strip} style={{ translate: `0 ${-at * 100}%` }}>
                  {media.screens.map((sc, i) => (
                    <Picture
                      key={i}
                      src={sc.src}
                      alt={sc.alt}
                      width={SCREEN_W}
                      height={SCREEN_H}
                      sizes={SIZES}
                      load={near}
                      className={s.shot}
                    />
                  ))}
                </span>
              </button>
              {media.embed === false ? (
                /* This site refuses to be shown inside another page, so
                   trying it live means going there. */
                <a
                  className={s.tryPill}
                  href={media.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open ${media.label} live, in a new tab`}
                >
                  Open it live ↗
                </a>
              ) : (
                <button
                  type="button"
                  className={s.tryPill}
                  onClick={() => show(true)}
                  aria-label={`Try ${media.label} live`}
                >
                  Try it live
                </button>
              )}
            </div>
          </>
        )}
        <span className={s.sheen} aria-hidden />
      </div>
      <figcaption className={s.caption}>
        {media.kind === "site" && (
          <span className={s.stepper}>
            <button
              type="button"
              className={s.stepButton}
              aria-label="Previous screen"
              onClick={() => step(-1)}
            >
              <svg viewBox="0 0 10 10" aria-hidden>
                <path d="M6.5 1.5 3 5l3.5 3.5" />
              </svg>
            </button>
            <span className={s.pips} aria-hidden>
              {media.screens.map((_, i) => (
                <i key={i} data-on={i === at} />
              ))}
            </span>
            <button
              type="button"
              className={s.stepButton}
              aria-label="Next screen"
              onClick={() => step(1)}
            >
              <svg viewBox="0 0 10 10" aria-hidden>
                <path d="M3.5 1.5 7 5 3.5 8.5" />
              </svg>
            </button>
          </span>
        )}
        {media.kind === "site" ? media.screens[at].alt : media.caption}
      </figcaption>
      {open && (
        <Lightbox
          media={media}
          start={at}
          from={open.from}
          live={open.live}
          vars={open.vars}
          onClose={() => setOpen(null)}
        />
      )}
    </figure>
  );
}
