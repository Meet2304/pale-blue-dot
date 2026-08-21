"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";

import { AnimateIcon } from "@/components/animate-ui/icons/icon";

import { MOBILE_ITEMS } from "../items";
import { MobileLayer } from "../layer";

const spring = { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.7 };

export function HorizonDock({
  visible,
  preview = false,
}: {
  visible: boolean;
  preview?: boolean;
}) {
  const pathname = usePathname();

  return (
    <MobileLayer visible={visible} preview={preview} className="hz-dock">
      <nav className="hz-dock-bar" aria-label="Primary">
        {MOBILE_ITEMS.map((item) => {
          const current =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <DockItem
              key={item.href}
              href={item.href}
              label={item.label}
              Icon={item.Icon}
              current={current}
            />
          );
        })}
      </nav>
    </MobileLayer>
  );
}

function DockItem({
  href,
  label,
  Icon,
  current,
}: {
  href: string;
  label: string;
  Icon: (typeof MOBILE_ITEMS)[number]["Icon"];
  current: boolean;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <AnimateIcon asChild animateOnHover animate={focused}>
      <Link
        href={href}
        className="hz-dock-item"
        aria-current={current ? "page" : undefined}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        <span className="hz-dock-glyph">
          <AnimatePresence>
            {current && (
              <motion.span
                className="hz-dock-pill"
                layoutId="hz-dock-pill"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={spring}
                aria-hidden
              />
            )}
          </AnimatePresence>
          <Icon className="hz-nav-icon" size={18} />
        </span>
        <motion.span
          className="hz-dock-label"
          animate={{ opacity: current ? 1 : 0.55, y: current ? 0 : 2 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          {label}
        </motion.span>
      </Link>
    </AnimateIcon>
  );
}
