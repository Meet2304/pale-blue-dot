"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";

import { NAV_ITEMS, RESUME_HREF, RESUME_READY } from "@/components/site/nav-items";

const spring = {
  type: "spring" as const,
  stiffness: 420,
  damping: 38,
  mass: 0.7,
};

const closed = { width: 148, height: 44, borderRadius: 999 };
const opened = { width: 300, height: 428, borderRadius: 40 };

export function LiquidMenu({ visible }: { visible: boolean }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((current) => !current), []);

  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }
  if (open && !visible) setOpen(false);

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

    const mobile = window.matchMedia("(max-width: 720px)");
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

  const shape = open ? opened : closed;
  const morph = reduce ? { duration: 0 } : spring;
  const trail = reduce
    ? { duration: 0 }
    : { ...spring, stiffness: 340, delay: open ? 0.016 : 0 };

  return (
    <div
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
        {!reduce && (
          <motion.div
            className="hz-liquid-trail"
            initial={false}
            animate={shape}
            transition={trail}
            aria-hidden
          />
        )}

        <motion.div
          className="hz-liquid-shell"
          initial={false}
          animate={shape}
          transition={morph}
        >
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
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls={panelId}
            onClick={toggle}
          >
            <span>Menu</span>
            <svg
              className="hz-liquid-icon"
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              aria-hidden
            >
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </svg>
          </button>
        </motion.div>
      </div>
    </div>
  );
}
