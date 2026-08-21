"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";

import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Menu } from "@/components/animate-ui/icons/menu";
import { X } from "@/components/animate-ui/icons/x";

import { MOBILE_ITEMS } from "../items";
import { MobileLayer } from "../layer";
import { useNavMenu } from "../use-nav-menu";

const islandSpring = {
  type: "spring" as const,
  stiffness: 320,
  damping: 30,
  mass: 0.85,
};

export function MagneticIsland({
  visible,
  preview = false,
}: {
  visible: boolean;
  preview?: boolean;
}) {
  const pathname = usePathname();
  const { open, toggle, close, panelId, triggerRef, closeRef, panelRef } = useNavMenu({
    visible,
    preview,
  });

  const current =
    MOBILE_ITEMS.find((item) => pathname === item.href) ?? MOBILE_ITEMS[0];

  return (
    <MobileLayer visible={visible} preview={preview} className="hz-island">
      <AnimatePresence>
        {open && (
          <motion.button
            type="button"
            className="hz-island-veil"
            aria-label="Close menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
        )}
      </AnimatePresence>

      <motion.nav
        ref={panelRef}
        id={panelId}
        className="hz-island-card"
        aria-label="Primary"
        layout
        transition={islandSpring}
        data-open={open ? "true" : "false"}
      >
        <button
          ref={open ? closeRef : triggerRef}
          type="button"
          className="hz-island-handle"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={toggle}
        >
          <span className="hz-island-now">
            {current && <current.Icon className="hz-nav-icon" size={16} />}
            <span>{open ? "Menu" : current?.label}</span>
          </span>
          <AnimateIcon animate={open}>
            {open ? <X size={16} /> : <Menu size={16} />}
          </AnimateIcon>
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.ul
              className="hz-island-list"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={islandSpring}
            >
              {MOBILE_ITEMS.map((item, index) => (
                <IslandLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  Icon={item.Icon}
                  current={pathname === item.href}
                  delay={0.03 * index}
                />
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </motion.nav>
    </MobileLayer>
  );
}

function IslandLink({
  href,
  label,
  Icon,
  current,
  delay,
}: {
  href: string;
  label: string;
  Icon: (typeof MOBILE_ITEMS)[number]["Icon"];
  current: boolean;
  delay: number;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
    >
      <AnimateIcon asChild animateOnHover animate={focused}>
        <Link
          href={href}
          className="hz-island-link"
          aria-current={current ? "page" : undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        >
          <Icon className="hz-nav-icon" size={18} />
          <span>{label}</span>
        </Link>
      </AnimateIcon>
    </motion.li>
  );
}
