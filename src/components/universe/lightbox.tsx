"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";

import type { FramedMedia } from "@/content/work";

import { Picture } from "./picture";
import s from "./universe.module.css";

/* The size a live site is laid out at on a wide screen, then scaled. */
const LIVE_W = 1280;
const LIVE_H = 800;
const ZOOM = 420;

/**
 * A picture of the work, opened up: it grows out of where it was on the
 * page to fill the screen, over a dimmed sky, and shrinks back into place
 * when closed (the close button, Escape, or a click outside it). A website
 * opens on the screen that was showing, and can be stepped through (the
 * arrows, or the left and right keys) or tried live, at a size where it
 * can actually be used: laid out as on a laptop and scaled to fit on a
 * wide screen, or at the phone's own width on a phone. An album opens on
 * the photo that was showing, and steps through the rest the same way,
 * each in its own shape.
 *
 * While it is open the page beneath does not scroll, the keys belong to it,
 * and focus stays in it; closing hands focus back to what opened it.
 */
export function Lightbox({
  media,
  start,
  from,
  live: startLive,
  vars,
  onClose,
}: {
  media: FramedMedia;
  /** For a website or an album, the screen or photo to open on. */
  start: number;
  /** Where the picture was on the page, to grow out of and back into. */
  from: DOMRect | null;
  live: boolean;
  /** The piece's colours. */
  vars?: CSSProperties;
  onClose: () => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(start);
  const [live, setLive] = useState(
    startLive && !(media.kind === "site" && media.embed === false),
  );
  const [closing, setClosing] = useState(false);
  const [scale, setScale] = useState(1);
  /* Only ever rendered after a click, so the window is there. */
  const [narrow] = useState(() => window.matchMedia("(max-width: 860px)").matches);
  const site = media.kind === "site" ? media : null;
  const photo = media.kind === "photo" ? media : null;
  const album = media.kind === "album" ? media : null;
  const count = site ? site.screens.length : album ? album.photos.length : 1;
  /* What the arrows step through: a site's screens (unless it's live), or
     an album's photos. */
  const steps = (site && !live) || (album && count > 1);
  const calm = useRef(false);

  /* Grow out of the picture on the page: start drawn over it, then let go. */
  const fly = useCallback(
    (to: "in" | "out") => {
      const el = stageRef.current;
      if (!el || !from || calm.current) return;
      const box = el.getBoundingClientRect();
      const k = from.width / box.width;
      const dx = from.left + from.width / 2 - (box.left + box.width / 2);
      const dy = from.top + from.height / 2 - (box.top + box.height / 2);
      const away = `translate(${dx}px, ${dy}px) scale(${k})`;
      el.style.transition = "none";
      el.style.transform = to === "in" ? away : "none";
      void el.offsetWidth;
      el.style.transition = `transform ${ZOOM}ms cubic-bezier(0.2, 0.8, 0.2, 1)`;
      el.style.transform = to === "in" ? "none" : away;
    },
    [from],
  );

  useLayoutEffect(() => {
    calm.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    fly("in");
  }, [fly]);

  /* While it's open the sky behind holds still (universe-canvas.tsx), so
     opening and stepping through are never kept waiting by it. */
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.lightbox = "open";
    return () => {
      delete root.dataset.lightbox;
    };
  }, []);

  const close = useCallback(() => {
    if (closing) return;
    setClosing(true);
    fly("out");
    window.setTimeout(onClose, calm.current ? 0 : ZOOM);
  }, [closing, fly, onClose]);

  /* The page holds still beneath, and the keys are the lightbox's. */
  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const stop = (e: Event) => e.preventDefault();
    const onKey = (e: KeyboardEvent) => {
      const keys = ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"];
      const onButton = !!(e.target as HTMLElement)?.closest?.("button, a");
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (steps && e.key === "ArrowRight") {
        e.preventDefault();
        setAt((i) => (i + 1) % count);
      } else if (steps && e.key === "ArrowLeft") {
        e.preventDefault();
        setAt((i) => (i - 1 + count) % count);
      } else if (keys.includes(e.key) || (e.key === " " && !onButton)) {
        /* The page beneath never scrolls; Space still presses a button. */
        e.preventDefault();
      }
      if (e.key === "Tab") {
        /* Focus stays inside. */
        const els = [
          ...(stageRef.current?.parentElement?.querySelectorAll<HTMLElement>(
            "button, a, iframe",
          ) ?? []),
        ];
        if (!els.length) return;
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
      e.stopPropagation();
    };
    window.addEventListener("wheel", stop, { passive: false });
    window.addEventListener("touchmove", stop, { passive: false });
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchmove", stop);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [close, steps, count]);

  /* A live site on a wide screen is laid out at laptop size and scaled. */
  useEffect(() => {
    const el = screenRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / LIVE_W));
    ro.observe(el);
    return () => ro.disconnect();
  }, [live]);

  const shot = album ? album.photos[at] : photo;
  const label = site?.label ?? shot?.alt ?? "";
  const caption = site
    ? live
      ? `${site.label}, live.`
      : site.screens[at].alt
    : (shot?.caption ?? shot?.alt);

  return createPortal(
    <div
      className={s.lightbox}
      style={vars}
      data-closing={closing}
      role="dialog"
      aria-modal="true"
      aria-label={site ? `${site.label}, enlarged` : shot?.alt}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <button ref={closeRef} type="button" className={s.lbClose} onClick={close}>
        <span aria-hidden>×</span> Close
      </button>

      {/* An album's arrows, at the screen's left and right edges. */}
      {album && count > 1 && (
        <>
          <button
            type="button"
            className={s.lbEdge}
            data-side="prev"
            onClick={() => setAt((i) => (i - 1 + count) % count)}
            aria-label="Previous photo"
          >
            <svg viewBox="0 0 10 10" aria-hidden>
              <path d="M6.5 1.5 3 5l3.5 3.5" />
            </svg>
          </button>
          <button
            type="button"
            className={s.lbEdge}
            data-side="next"
            onClick={() => setAt((i) => (i + 1) % count)}
            aria-label="Next photo"
          >
            <svg viewBox="0 0 10 10" aria-hidden>
              <path d="M3.5 1.5 7 5 3.5 8.5" />
            </svg>
          </button>
        </>
      )}

      <div ref={stageRef} className={s.lbStage}>
        {shot ? (
          <Picture
            key={shot.src}
            src={shot.src}
            alt={shot.alt}
            width={shot.width}
            height={shot.height}
            sizes="92vw"
            load
            className={`${s.lbPhoto} ${album && at !== start ? s.lbSwap : ""}`}
          />
        ) : site ? (
          <div className={s.lbSite}>
            <div className={s.chrome}>
              <span className={s.dots} aria-hidden>
                <i />
                <i />
                <i />
              </span>
              <a
                className={s.address}
                href={site.href}
                target="_blank"
                rel="noreferrer"
                title={`Open ${site.label} in a new tab`}
              >
                {site.label} <span aria-hidden>↗</span>
              </a>
              {site.embed === false ? (
                /* This site refuses to be shown inside another page. */
                <a
                  className={s.close}
                  href={site.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open it live ↗
                </a>
              ) : (
                <button
                  type="button"
                  className={s.close}
                  onClick={() => setLive((v) => !v)}
                >
                  {live ? "Screens" : "Try it live"}
                </button>
              )}
            </div>
            <div
              ref={screenRef}
              className={s.lbScreen}
              data-live={live}
              data-narrow={narrow}
            >
              {live ? (
                <iframe
                  className={s.live}
                  src={site.href}
                  title={`${site.label}, live`}
                  {...(narrow
                    ? { width: "100%", height: "100%", style: { position: "static" } }
                    : {
                        width: LIVE_W,
                        height: LIVE_H,
                        style: { scale: String(scale) },
                      })}
                />
              ) : (
                <span className={s.strip} style={{ translate: `0 ${-at * 100}%` }}>
                  {site.screens.map((sc, i) => (
                    <Picture
                      key={i}
                      src={sc.src}
                      alt={sc.alt}
                      width={1280}
                      height={800}
                      sizes="92vw"
                      load
                      className={s.lbShot}
                    />
                  ))}
                </span>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div className={s.lbFoot}>
        {album && count > 1 && (
          <span className={s.pips} aria-hidden>
            {Array.from({ length: count }, (_, i) => (
              <i key={i} data-on={i === at} />
            ))}
          </span>
        )}
        {site && !live && (
          <span className={s.lbSteps}>
            <button
              type="button"
              onClick={() => setAt((i) => (i - 1 + count) % count)}
              aria-label="Previous screen"
            >
              ←
            </button>
            <span className={s.pips} aria-hidden>
              {Array.from({ length: count }, (_, i) => (
                <i key={i} data-on={i === at} />
              ))}
            </span>
            <button
              type="button"
              onClick={() => setAt((i) => (i + 1) % count)}
              aria-label="Next screen"
            >
              →
            </button>
          </span>
        )}
        <span className={s.lbCaption} title={label}>
          {caption}
        </span>
      </div>
    </div>,
    /* Inside the page's root, so it keeps the page's type and colours. */
    document.getElementById("content") ?? document.body,
  );
}
