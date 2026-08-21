"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, type PanInfo } from "motion/react";

import { AnimateIcon } from "@/components/animate-ui/icons/icon";

import { MOBILE_ITEMS } from "../items";
import { MobileLayer } from "../layer";
import { useNavMenu } from "../use-nav-menu";

const sheetEase = [0.16, 1, 0.3, 1] as const;

export function StarSheet({
  visible,
  preview = false,
}: {
  visible: boolean;
  preview?: boolean;
}) {
  const pathname = usePathname();
  const { open, setOpen, close, panelId, triggerRef, closeRef, panelRef } = useNavMenu({
    visible,
    preview,
  });

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 72 || info.velocity.y > 640) close();
  };

  return (
    <MobileLayer visible={visible} preview={preview} className="hz-sheet">
      <AnimatePresence>
        {open && (
          <motion.button
            type="button"
            className="hz-sheet-veil"
            aria-label="Close menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
        )}
      </AnimatePresence>

      <motion.div
        ref={panelRef}
        id={panelId}
        className="hz-sheet-panel"
        role="dialog"
        aria-modal={open ? "true" : undefined}
        aria-label="Primary"
        initial={false}
        animate={{ y: open ? 0 : "calc(100% - 72px)" }}
        transition={{ duration: 0.48, ease: sheetEase }}
        drag={open ? "y" : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.04, bottom: 0.22 }}
        onDragEnd={onDragEnd}
      >
        <button
          ref={open ? closeRef : triggerRef}
          type="button"
          className="hz-sheet-handle"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((current) => !current)}
        >
          <span className="hz-sheet-grip" aria-hidden />
          <span className="hz-sheet-kicker">Menu</span>
        </button>

        <ul className="hz-sheet-list">
          {MOBILE_ITEMS.map((item, index) => (
            <SheetLink
              key={item.href}
              href={item.href}
              label={item.label}
              Icon={item.Icon}
              current={pathname === item.href}
              open={open}
              delay={0.05 * index}
            />
          ))}
        </ul>
      </motion.div>
    </MobileLayer>
  );
}

function SheetLink({
  href,
  label,
  Icon,
  current,
  open,
  delay,
}: {
  href: string;
  label: string;
  Icon: (typeof MOBILE_ITEMS)[number]["Icon"];
  current: boolean;
  open: boolean;
  delay: number;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <motion.li
      initial={false}
      animate={
        open
          ? { opacity: 1, y: 0, filter: "blur(0px)" }
          : { opacity: 0, y: 16, filter: "blur(6px)" }
      }
      transition={{ duration: 0.4, delay: open ? delay : 0, ease: sheetEase }}
    >
      <AnimateIcon asChild animateOnHover animate={focused}>
        <Link
          href={href}
          className="hz-sheet-link"
          aria-current={current ? "page" : undefined}
          tabIndex={open ? 0 : -1}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        >
          <Icon className="hz-nav-icon" size={22} />
          <span>{label}</span>
        </Link>
      </AnimateIcon>
    </motion.li>
  );
}
