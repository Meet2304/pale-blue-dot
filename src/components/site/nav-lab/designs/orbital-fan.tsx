"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";

import { AnimateIcon } from "@/components/animate-ui/icons/icon";

import { MOBILE_ITEMS } from "../items";
import { MobileLayer } from "../layer";
import { useNavMenu } from "../use-nav-menu";

const RADIUS = 132;
const FAN_SPRING = { type: "spring" as const, stiffness: 340, damping: 26, mass: 0.65 };

function polar(index: number, count: number) {
  const start = Math.PI * 0.52;
  const end = Math.PI * 0.98;
  const t = count === 1 ? 0.5 : index / (count - 1);
  const angle = start + (end - start) * t;
  return {
    x: Math.cos(angle) * RADIUS,
    y: -Math.sin(angle) * RADIUS,
  };
}

export function OrbitalFan({
  visible,
  preview = false,
}: {
  visible: boolean;
  preview?: boolean;
}) {
  const pathname = usePathname();
  const { open, toggle, close, panelId, triggerRef, panelRef } = useNavMenu({
    visible,
    preview,
  });

  return (
    <MobileLayer visible={visible} preview={preview} className="hz-orbit">
      <AnimatePresence>
        {open && (
          <motion.button
            type="button"
            className="hz-orbit-veil"
            aria-label="Close menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
            onClick={close}
          />
        )}
      </AnimatePresence>

      <div ref={panelRef} className="hz-orbit-stage">
        <svg className="hz-orbit-lines" viewBox="0 0 280 280" aria-hidden>
          {MOBILE_ITEMS.map((item, index) => {
            const { x, y } = polar(index, MOBILE_ITEMS.length);
            return (
              <motion.line
                key={item.href}
                x1="246"
                y1="246"
                x2={246 + x}
                y2={246 + y}
                initial={false}
                animate={{
                  opacity: open ? 0.55 : 0,
                  pathLength: open ? 1 : 0,
                }}
                transition={{
                  duration: 0.4,
                  delay: open ? 0.04 * index : 0,
                  ease: [0.16, 1, 0.3, 1],
                }}
              />
            );
          })}
        </svg>

        <div className="hz-orbit-nodes" id={panelId}>
          {MOBILE_ITEMS.map((item, index) => {
            const { x, y } = polar(index, MOBILE_ITEMS.length);
            const current = pathname === item.href;
            return (
              <OrbitNode
                key={item.href}
                href={item.href}
                label={item.label}
                Icon={item.Icon}
                current={current}
                open={open}
                x={x}
                y={y}
                delay={index * 0.045}
              />
            );
          })}
        </div>

        <motion.button
          ref={triggerRef}
          type="button"
          className="hz-orbit-fab"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={toggle}
          animate={{ rotate: open ? 45 : 0, scale: open ? 0.94 : 1 }}
          transition={FAN_SPRING}
        >
          <span className="hz-orbit-fab-dot" aria-hidden />
        </motion.button>
      </div>
    </MobileLayer>
  );
}

function OrbitNode({
  href,
  label,
  Icon,
  current,
  open,
  x,
  y,
  delay,
}: {
  href: string;
  label: string;
  Icon: (typeof MOBILE_ITEMS)[number]["Icon"];
  current: boolean;
  open: boolean;
  x: number;
  y: number;
  delay: number;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="hz-orbit-node"
          initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
          animate={{ opacity: 1, x, y, scale: 1 }}
          exit={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
          transition={{ ...FAN_SPRING, delay: open ? delay : 0 }}
        >
          <AnimateIcon asChild animateOnHover animate={focused}>
            <Link
              href={href}
              className="hz-orbit-link"
              aria-current={current ? "page" : undefined}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            >
              <Icon className="hz-nav-icon" size={18} />
              <span>{label}</span>
            </Link>
          </AnimateIcon>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
