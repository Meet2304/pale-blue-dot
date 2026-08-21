"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";

import { NAV_VARIANTS, useNavLab } from "./provider";

export function LabSwitcher() {
  const pathname = usePathname();
  const { variant, variantId, setVariantId } = useNavLab();
  const [open, setOpen] = useState(false);

  return (
    <div className="hz-lab-switcher">
      <button
        type="button"
        className="hz-lab-chip"
        aria-expanded={open}
        aria-controls="hz-lab-picker"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="hz-lab-kicker">Nav lab</span>
        <span className="hz-lab-current">
          {variant.n === 0 ? "Now" : String(variant.n).padStart(2, "0")}
          <em>{variant.short}</em>
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id="hz-lab-picker"
            className="hz-lab-picker"
            role="listbox"
            aria-label="Mobile nav design"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {NAV_VARIANTS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={item.id === variantId}
                className="hz-lab-option"
                data-active={item.id === variantId ? "true" : "false"}
                onClick={() => {
                  setVariantId(item.id);
                  setOpen(false);
                }}
              >
                <span className="hz-lab-num">
                  {item.n === 0 ? "—" : String(item.n).padStart(2, "0")}
                </span>
                <span>{item.name}</span>
              </button>
            ))}
            <Link
              href="/nav-lab"
              className="hz-lab-option"
              data-active={pathname === "/nav-lab" ? "true" : "false"}
              onClick={() => setOpen(false)}
            >
              <span className="hz-lab-num">↗</span>
              <span>All six</span>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
