"use client";

import Link from "next/link";
import { useEffect, useRef, type PointerEvent, type ReactNode } from "react";

import { GLYPHS } from "./intro-timeline";
import s from "./piece-links.module.css";
import { WayMark, type WayIcon } from "./way-mark";

/* How long the words take to shuffle back into place, in ms. */
const SHUFFLE_MS = 380;

/* Where the pointer is over the link, for the light that follows it. */
const follow = (e: PointerEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--x", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`);
};

/**
 * A piece's own page, the main way on from a chapter, so it is the one in
 * a frame: the figures' frame, a hairline with corners in the piece's
 * colour, which open out when pointed at. A little of the piece's light
 * follows the pointer inside it, and the words run through the sky's
 * glyphs before they settle, left to right.
 */
export function PageLink({
  href,
  label,
  className = "",
}: {
  href: string;
  label: string;
  className?: string;
}) {
  const words = useRef<HTMLSpanElement>(null);
  const raf = useRef(0);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const shuffle = (e: PointerEvent<HTMLAnchorElement>) => {
    follow(e);
    /* The text node React rendered, rewritten in place, so React's own
       reference to it stays good. */
    const text = words.current?.firstChild;
    if (!text || e.pointerType !== "mouse") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    cancelAnimationFrame(raf.current);
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / SHUFFLE_MS);
      let out = "";
      for (let i = 0; i < label.length; i++) {
        const ch = label[i];
        const settled = ch === " " || p >= (i / label.length) * 0.6 + 0.4;
        out += settled ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      text.nodeValue = out;
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  return (
    <Link
      className={`${s.page} ${className}`}
      href={href}
      aria-label={label}
      onPointerEnter={shuffle}
      onPointerMove={follow}
    >
      <span ref={words} aria-hidden>
        {label}
      </span>
      <span className={s.on} aria-hidden>
        →
      </span>
    </Link>
  );
}

/**
 * Somewhere else: the thing itself, or its code. A mark and a short word,
 * quieter than the frame beside it and as tall, so the three sit in one
 * row. Pointed at, the mark plays its trick (way-mark.tsx), a line in the
 * piece's colour draws in under the word, and the arrow lifts off up and
 * away while the next one rises in behind it.
 */
export function AwayLink({
  href,
  icon,
  children,
  className = "",
}: {
  href: string;
  icon: WayIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      className={`${s.away} ${className}`}
      href={href}
      target="_blank"
      rel="noreferrer"
      data-icon={icon}
    >
      <WayMark icon={icon} className={s.mark} />
      <span className={s.words}>{children}</span>
      <span className={s.lift} aria-hidden>
        <span>↗</span>
        <span>↗</span>
      </span>
    </a>
  );
}
