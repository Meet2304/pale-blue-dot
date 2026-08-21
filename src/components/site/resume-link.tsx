"use client";

import { useState } from "react";
import Link from "next/link";

import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Download } from "@/components/animate-ui/icons/download";
import { RESUME_HREF, RESUME_READY } from "@/components/site/nav-items";

/**
 * The starry ground and the bloom are entirely CSS on .hz-resume — see
 * nav.css. All this has to do is be one hover (and tap) target, which is
 * what lets AnimateIcon slot onto it and animate the arrow from anywhere
 * inside.
 */
export function ResumeLink({ size }: { size: number }) {
  const [focused, setFocused] = useState(false);

  return (
    <AnimateIcon asChild animateOnHover animateOnTap animate={focused}>
      <Link
        href={RESUME_HREF}
        className="hz-resume"
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
