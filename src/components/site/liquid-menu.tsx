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

import { NAV_ITEMS } from "@/components/site/nav-items";
import { ResumeLink } from "@/components/site/resume-link";

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
const OPEN_HEIGHT = 440;
const OPEN_RADIUS = 40;

export function LiquidMenu({ visible }: { visible: boolean }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const playback = useRef<ReturnType<typeof animate> | null>(null);

  const progress = useMotionValue(0);
  const openWidth = useMotionValue(360);
  const [open, setOpen] = useState(false);

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

  useMotionValueEvent(progress, "change", (value) => {
    rootRef.current?.style.setProperty("--liquid-p", String(value));
  });

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
      ref={rootRef}
      className="hz-liquid"
      data-nav={visible ? "visible" : "hidden"}
      data-open={open ? "true" : "false"}
      inert={!visible}
    >
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
            <ResumeLink size={18} />
          </nav>

          <button
            ref={toggleRef}
            type="button"
            className="hz-liquid-toggle"
            aria-label={open ? "Close menu" : "Open menu"}
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
