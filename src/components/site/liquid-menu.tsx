"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from "motion/react";

import { NAV_ITEMS, RESUME_HREF, RESUME_READY } from "@/components/site/nav-items";

const spring = {
  type: "spring" as const,
  stiffness: 380,
  damping: 36,
  mass: 0.85,
};

const MOBILE_NAV = "(max-width: 880px)";
const OPEN_GUTTER = 24;
const OPEN_MAX_WIDTH = 420;
const CLOSED_WIDTH = 148;
const CLOSED_HEIGHT = 44;
const CLOSED_RADIUS = 22;
const OPEN_HEIGHT = 496;
const OPEN_RADIUS = 40;
const SCRUB_RANGE = 2000;

export function LiquidMenu({ visible }: { visible: boolean }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const playback = useRef<ReturnType<typeof animate> | null>(null);

  const progress = useMotionValue(0);
  const openWidth = useMotionValue(360);
  const [open, setOpen] = useState(false);
  const [p, setP] = useState(0);

  const width = useTransform(
    [progress, openWidth],
    ([t, w]) => CLOSED_WIDTH + ((w as number) - CLOSED_WIDTH) * (t as number),
  );
  const height = useTransform(progress, [0, 1], [CLOSED_HEIGHT, OPEN_HEIGHT]);
  const radius = useTransform(progress, [0, 1], [CLOSED_RADIUS, OPEN_RADIUS]);

  const goTo = useCallback(
    (target: number, immediate = false) => {
      const next = Math.min(1, Math.max(0, target));
      playback.current?.stop();
      if (immediate || reduce) {
        progress.set(next);
        return;
      }
      playback.current = animate(progress, next, spring);
    },
    [progress, reduce],
  );

  const close = useCallback(() => {
    setOpen(false);
    goTo(0);
  }, [goTo]);

  const toggle = useCallback(() => {
    if (progress.get() > 0.5) {
      setOpen(false);
      goTo(0);
      return;
    }
    setOpen(true);
    goTo(1);
  }, [goTo, progress]);

  const scrub = useCallback(
    (value: number) => {
      setOpen(value > 0.12);
      goTo(value, true);
    },
    [goTo],
  );

  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
    progress.set(0);
  }
  if (open && !visible) {
    setOpen(false);
    progress.set(0);
  }

  useMotionValueEvent(progress, "change", setP);

  useEffect(() => {
    const measure = () => {
      openWidth.set(Math.min(OPEN_MAX_WIDTH, window.innerWidth - OPEN_GUTTER));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [openWidth]);

  useEffect(() => {
    if (!open) return;

    const opener = toggleRef.current;
    document.documentElement.classList.add("hz-nav-lock");

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled])",
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const mobile = window.matchMedia(MOBILE_NAV);
    const onViewport = () => {
      if (!mobile.matches) close();
    };

    window.addEventListener("keydown", onKeyDown);
    mobile.addEventListener("change", onViewport);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      mobile.removeEventListener("change", onViewport);
      document.documentElement.classList.remove("hz-nav-lock");
      opener?.focus();
    };
  }, [open, close]);

  const shape = { width, height, borderRadius: radius };

  return (
    <div
      className="hz-liquid"
      data-nav={visible ? "visible" : "hidden"}
      data-open={open ? "true" : "false"}
      style={{ ["--liquid-p" as string]: p }}
      inert={!visible}
    >
      <MorphScrubber progress={p} onScrub={scrub} />

      <button
        type="button"
        className="hz-liquid-veil"
        aria-label="Close menu"
        tabIndex={-1}
        onClick={close}
      />

      <div ref={panelRef} className="hz-liquid-stage">
        <motion.div className="hz-liquid-shell" initial={false} style={shape}>
          <nav id={panelId} aria-label="Primary" inert={!open}>
            <ul className="hz-liquid-list">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="hz-liquid-link"
                    aria-current={pathname === item.href ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href={RESUME_HREF}
              className="hz-liquid-resume"
              {...(RESUME_READY ? { download: "Meet-Bhatt-Resume.pdf" } : {})}
            >
              Resume
            </Link>
          </nav>

          <button
            ref={toggleRef}
            type="button"
            className="hz-liquid-toggle"
            aria-label={p > 0.5 ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls={panelId}
            onClick={toggle}
          >
            <span className="hz-liquid-label">Menu</span>
            <span className="hz-liquid-icon" aria-hidden>
              <span />
              <span />
              <span />
            </span>
          </button>
        </motion.div>
      </div>
    </div>
  );
}

function MorphScrubber({
  progress,
  onScrub,
}: {
  progress: number;
  onScrub: (value: number) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 0) return;
    const next = progress * max;
    if (Math.abs(el.scrollLeft - next) < 1) return;
    syncing.current = true;
    el.scrollLeft = next;
    syncing.current = false;
  }, [progress]);

  return (
    <div className="hz-liquid-scrub">
      <div className="hz-liquid-scrub-meta">
        <span>Testing · scrub the morph</span>
        <span>{Math.round(progress * 100)}%</span>
      </div>
      <input
        type="range"
        className="hz-liquid-scrub-range"
        min={0}
        max={1000}
        step={1}
        value={Math.round(progress * 1000)}
        aria-label="Scrub menu morph"
        onChange={(event) => onScrub(Number(event.target.value) / 1000)}
      />
      <div
        ref={scrollerRef}
        className="hz-liquid-scrub-scroll"
        onScroll={(event) => {
          if (syncing.current) return;
          const el = event.currentTarget;
          const max = el.scrollWidth - el.clientWidth;
          if (max <= 0) return;
          onScrub(el.scrollLeft / max);
        }}
      >
        <div className="hz-liquid-scrub-track" style={{ width: SCRUB_RANGE }} />
      </div>
    </div>
  );
}
