"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";

import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Menu } from "@/components/animate-ui/icons/menu";
import { X } from "@/components/animate-ui/icons/x";

import { MOBILE_ITEMS, RESUME_HREF, RESUME_READY } from "../items";
import { MobileLayer } from "../layer";
import { useNavMenu } from "../use-nav-menu";

const veilEase = [0.22, 1, 0.32, 1] as const;

export function WarpVeil({
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

  return (
    <MobileLayer visible={visible} preview={preview} className="hz-warp">
      <AnimateIcon asChild animateOnHover>
        <button
          ref={triggerRef}
          type="button"
          className="hz-warp-trigger"
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(true)}
        >
          <Menu className="hz-nav-icon" size={18} />
        </button>
      </AnimateIcon>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            id={panelId}
            className="hz-warp-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Primary"
            initial={{ clipPath: "circle(18px at calc(100% - 38px) 30px)" }}
            animate={{ clipPath: "circle(160% at calc(100% - 38px) 30px)" }}
            exit={{ clipPath: "circle(18px at calc(100% - 38px) 30px)" }}
            transition={{ duration: 0.62, ease: veilEase }}
          >
            <div className="hz-warp-head">
              <AnimateIcon asChild animateOnHover>
                <button
                  ref={closeRef}
                  type="button"
                  className="hz-warp-trigger"
                  aria-label="Close menu"
                  onClick={close}
                >
                  <X className="hz-nav-icon" size={18} />
                </button>
              </AnimateIcon>
            </div>

            <ul className="hz-warp-list">
              {MOBILE_ITEMS.filter((item) => item.href !== RESUME_HREF).map(
                (item, index) => (
                  <WarpLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    Icon={item.Icon}
                    current={pathname === item.href}
                    delay={0.08 + index * 0.07}
                  />
                ),
              )}
            </ul>

            <WarpLink
              href={RESUME_HREF}
              label="Resume"
              Icon={MOBILE_ITEMS[MOBILE_ITEMS.length - 1]!.Icon}
              current={pathname === RESUME_HREF}
              delay={0.08 + 4 * 0.07}
              resume
            />
          </motion.div>
        )}
      </AnimatePresence>
    </MobileLayer>
  );
}

function WarpLink({
  href,
  label,
  Icon,
  current,
  delay,
  resume = false,
}: {
  href: string;
  label: string;
  Icon: (typeof MOBILE_ITEMS)[number]["Icon"];
  current: boolean;
  delay: number;
  resume?: boolean;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 28, filter: "blur(12px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: 10, filter: "blur(8px)" }}
      transition={{ duration: 0.5, delay, ease: veilEase }}
    >
      <AnimateIcon asChild animateOnHover animate={focused}>
        <Link
          href={href}
          className={resume ? "hz-warp-resume" : "hz-warp-link"}
          aria-current={current ? "page" : undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...(resume && RESUME_READY ? { download: "Meet-Bhatt-Resume.pdf" } : {})}
        >
          <Icon className="hz-nav-icon" size={resume ? 18 : 26} />
          <span>{label}</span>
        </Link>
      </AnimateIcon>
    </motion.div>
  );
}
