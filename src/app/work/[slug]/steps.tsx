"use client";

import { useEffect, useRef, useState } from "react";

import s from "./award.module.css";

/**
 * The award page's rail: its parts, the one being read
 * marked. Beside the column on a wide screen; on a narrow one, a row under
 * the bar. Each is a plain link to its part, so it works before any script
 * has run; the script marks which is on screen, and makes a press glide to
 * its part (or jump, under reduced motion), lit at once.
 */
export function Steps({ parts }: { parts: { id: string; label: string }[] }) {
  const [on, setOn] = useState(parts[0].id);
  const listRef = useRef<HTMLOListElement>(null);

  /* As a row (a narrow screen), it slides to keep the part being read in
     view; as a rail it never needs to. */
  useEffect(() => {
    const list = listRef.current;
    const link = list?.querySelector<HTMLElement>(`a[href="#${on}"]`);
    if (!list || !link || list.scrollWidth <= list.clientWidth) return;
    const left = link.offsetLeft - list.offsetLeft;
    list.scrollTo({ left: Math.max(0, left - 16), behavior: "smooth" });
  }, [on]);

  useEffect(() => {
    const els = parts
      .map((p) => document.getElementById(p.id))
      .filter((el): el is HTMLElement => !!el);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setOn(e.target.id);
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [parts]);

  return (
    <nav className={s.steps} aria-label="On this page">
      <ol ref={listRef}>
        {parts.map((p) => (
          <li key={p.id}>
            <a
              href={`#${p.id}`}
              aria-current={on === p.id ? "step" : undefined}
              onClick={(e) => {
                const to = document.getElementById(p.id);
                if (!to) return;
                e.preventDefault();
                const calm = window.matchMedia(
                  "(prefers-reduced-motion: reduce)",
                ).matches;
                to.scrollIntoView({ behavior: calm ? "auto" : "smooth" });
                history.replaceState(null, "", `#${p.id}`);
                setOn(p.id);
              }}
            >
              {p.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
