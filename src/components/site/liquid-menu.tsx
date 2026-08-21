"use client";

import { useId } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { MorphIcon } from "morphicons/react";

import { NAV_ITEMS, RESUME_HREF, RESUME_READY } from "@/components/site/nav-items";
import { useNavMenu } from "@/components/site/use-nav-menu";

/**
 * Overdamped on purpose: fast enough to feel immediate, no bounce on settle.
 * Critically damped at this mass would be ~c 34.
 */
const morphSpring = {
  type: "spring" as const,
  stiffness: 380,
  damping: 38,
  mass: 0.72,
};

const closedShape = {
  width: 148,
  height: 44,
  borderRadius: 999,
};

const openShape = {
  width: 300,
  height: 428,
  borderRadius: 40,
};

export function LiquidMenu({ visible }: { visible: boolean }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const filterId = useId().replace(/:/g, "");
  const { open, toggle, close, panelId, toggleRef, panelRef } = useNavMenu({
    visible,
  });

  const shape = open ? openShape : closedShape;
  const transition = reduce ? { duration: 0 } : morphSpring;
  const trailTransition = reduce
    ? { duration: 0 }
    : { ...morphSpring, stiffness: 320, damping: 36, delay: open ? 0.018 : 0 };

  return (
    <div
      className="hz-liquid"
      data-nav={visible ? "visible" : "hidden"}
      inert={!visible}
    >
      <svg className="hz-liquid-svg" aria-hidden>
        <filter id={filterId} x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8"
            result="goo"
          />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </svg>

      <AnimatePresence>
        {open && (
          <motion.button
            type="button"
            className="hz-liquid-veil"
            aria-label="Close menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
            onClick={close}
          />
        )}
      </AnimatePresence>

      <div
        ref={panelRef}
        className="hz-liquid-stage"
        data-open={open ? "true" : "false"}
      >
        <div className="hz-liquid-blobs" style={{ filter: `url(#${filterId})` }}>
          <motion.div
            className="hz-liquid-blob"
            initial={false}
            animate={shape}
            transition={transition}
          />
          <motion.div
            className="hz-liquid-blob hz-liquid-blob--trail"
            initial={false}
            animate={shape}
            transition={trailTransition}
          />
        </div>

        <motion.div
          className="hz-liquid-shell"
          initial={false}
          animate={shape}
          transition={transition}
          data-open={open ? "true" : "false"}
        >
          <nav id={panelId} aria-label="Primary">
            <ul className="hz-liquid-list" aria-hidden={!open}>
              {NAV_ITEMS.map((item, index) => (
                <motion.li
                  key={item.href}
                  initial={false}
                  animate={open ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                  transition={{
                    duration: reduce ? 0 : 0.22,
                    delay: reduce ? 0 : open ? 0.08 + index * 0.03 : 0,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <Link
                    href={item.href}
                    className="hz-liquid-link"
                    aria-current={pathname === item.href ? "page" : undefined}
                    tabIndex={open ? 0 : -1}
                  >
                    {item.label}
                  </Link>
                </motion.li>
              ))}
            </ul>
          </nav>

          <motion.div
            className="hz-liquid-resume-wrap"
            initial={false}
            animate={{ opacity: open ? 1 : 0 }}
            transition={{
              duration: reduce ? 0 : 0.2,
              delay: reduce ? 0 : open ? 0.12 : 0,
            }}
          >
            <Link
              href={RESUME_HREF}
              className="hz-liquid-resume"
              tabIndex={open ? 0 : -1}
              {...(RESUME_READY ? { download: "Meet-Bhatt-Resume.pdf" } : {})}
            >
              Resume
            </Link>
          </motion.div>

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
            <MorphIcon
              icon={open ? X : Menu}
              size={18}
              strokeWidth={1.75}
              spring="snappy"
              reducedMotion="user"
            />
          </button>
        </motion.div>
      </div>
    </div>
  );
}
