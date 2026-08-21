"use client";

import { useRef, useState, type PointerEvent } from "react";
import Link from "next/link";

import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Download } from "@/components/animate-ui/icons/download";
import { RESUME_HREF, RESUME_READY } from "@/components/site/nav-items";

/** Matches `inset` on .hz-resume-glow, so the mapping stays exact. */
const GLOW_INSET = 14;

/**
 * The starry ground and the bloom are entirely CSS on .hz-resume — see
 * nav.css. All this has to do is be one hover (and tap) target, which is
 * what lets AnimateIcon slot onto it and animate the arrow from anywhere
 * inside, and hand the glow the pointer's position.
 */
export function ResumeLink({ size }: { size: number }) {
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLAnchorElement>(null);

  /* Written straight to the node rather than held in state: this fires on every
     pointer move across the control, and the repo's rule is that nothing in a
     hot path costs a render. The glow element is inset past the button, so the
     pointer's position has to be remapped onto that larger box or the light
     would lag the cursor toward the edges. */
  const track = (event: PointerEvent<HTMLAnchorElement>) => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const x = event.clientX - rect.left + GLOW_INSET;
    const span = rect.width + GLOW_INSET * 2;
    node.style.setProperty("--hz-glow-x", `${((x / span) * 100).toFixed(2)}%`);
  };

  const recentre = () => {
    ref.current?.style.setProperty("--hz-glow-x", "50%");
  };

  return (
    <AnimateIcon asChild animateOnHover animateOnTap animate={focused}>
      <Link
        ref={ref}
        href={RESUME_HREF}
        className="hz-resume"
        onPointerMove={track}
        onPointerLeave={recentre}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...(RESUME_READY ? { download: "Meet-Bhatt-Resume.pdf" } : {})}
      >
        <span className="hz-resume-glow" aria-hidden />
        <Download className="hz-nav-icon" size={size} />
        <span>Resume</span>
      </Link>
    </AnimateIcon>
  );
}
