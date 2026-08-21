"use client";

import { useId } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";

import { LIQUID_ITEMS } from "../items";
import { MobileLayer } from "../layer";
import { useNavMenu } from "../use-nav-menu";

const morph = {
  type: "spring" as const,
  stiffness: 240,
  damping: 28,
  mass: 0.95,
};

const closedShape = {
  width: 168,
  height: 54,
  borderRadius: 999,
};

const openShape = {
  width: 316,
  height: 468,
  borderRadius: 48,
};

export function LiquidMorph({
  visible,
  preview = false,
}: {
  visible: boolean;
  preview?: boolean;
}) {
  const pathname = usePathname();
  const filterId = useId().replace(/:/g, "");
  const { open, toggle, close, panelId, triggerRef, closeRef, panelRef } = useNavMenu({
    visible,
    preview,
  });

  return (
    <MobileLayer visible={visible} preview={preview} className="hz-liquid">
      <svg className="hz-liquid-svg" aria-hidden>
        <filter id={filterId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -8"
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
            animate={open ? openShape : closedShape}
            transition={morph}
          />
          <motion.div
            className="hz-liquid-blob hz-liquid-blob--trail"
            initial={false}
            animate={open ? openShape : closedShape}
            transition={{
              ...morph,
              stiffness: 180,
              damping: 22,
              delay: open ? 0.05 : 0,
            }}
          />
        </div>

        <motion.div
          className="hz-liquid-shell"
          initial={false}
          animate={open ? openShape : closedShape}
          transition={morph}
        >
          <button
            ref={triggerRef}
            type="button"
            className="hz-liquid-pill"
            aria-label={open ? undefined : "Open menu"}
            aria-expanded={open}
            aria-controls={panelId}
            tabIndex={open ? -1 : 0}
            onClick={toggle}
            data-hidden={open ? "true" : "false"}
          >
            <span>Menu</span>
            <span className="hz-liquid-burger" aria-hidden>
              <i />
              <i />
            </span>
          </button>

          <div
            id={panelId}
            className="hz-liquid-card"
            role={open ? "dialog" : undefined}
            aria-modal={open ? "true" : undefined}
            aria-label={open ? "Primary" : undefined}
            data-open={open ? "true" : "false"}
          >
            <motion.ul
              className="hz-liquid-list"
              initial={false}
              animate={{ opacity: open ? 1 : 0 }}
              transition={{ duration: 0.28, delay: open ? 0.18 : 0 }}
            >
              {LIQUID_ITEMS.map((item, index) => (
                <motion.li
                  key={item.href}
                  initial={false}
                  animate={open ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                  transition={{
                    duration: 0.36,
                    delay: open ? 0.2 + index * 0.05 : 0,
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
            </motion.ul>

            <div className="hz-liquid-foot">
              <span>Menu</span>
              <button
                ref={closeRef}
                type="button"
                className="hz-liquid-close"
                aria-label="Close menu"
                tabIndex={open ? 0 : -1}
                onClick={close}
              >
                <span aria-hidden>×</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </MobileLayer>
  );
}
