"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";

import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Download } from "@/components/animate-ui/icons/download";
import { RESUME_HREF, RESUME_READY } from "@/components/site/nav-items";

/** Resting place of the light: middle of the bottom edge. */
const REST_X = 0;
const REST_Y = 1;

/** How far outside the button the glow still follows the cursor. */
const NEAR = 64;

function writeGlow(node: HTMLElement, x: number, y: number) {
  node.style.setProperty("--hz-glow-x", x.toFixed(3));
  node.style.setProperty("--hz-glow-y", y.toFixed(3));
}

function restGlow(node: HTMLElement) {
  writeGlow(node, REST_X, REST_Y);
  node.removeAttribute("data-near");
}

/**
 * Project the cursor onto the button's outline. The glow is a circle centred
 * on that point, so what you see is a crescent riding the edge, never a blob
 * under the pointer.
 */
function followGlow(node: HTMLElement, clientX: number, clientY: number) {
  const w = node.clientWidth;
  const h = node.clientHeight;
  /* display:none (the bar control below 880px) reports a 0×0 rect at (0, 0),
     which would otherwise look like the cursor is "near" the origin. */
  if (w === 0 || h === 0) return;

  const rect = node.getBoundingClientRect();
  const near =
    clientX >= rect.left - NEAR &&
    clientX <= rect.right + NEAR &&
    clientY >= rect.top - NEAR &&
    clientY <= rect.bottom + NEAR;

  if (!near) {
    if (node.hasAttribute("data-near")) restGlow(node);
    return;
  }

  node.setAttribute("data-near", "");

  /* Padding box, not border box: the glow host is laid out against that. */
  const x = (clientX - rect.left - node.clientLeft) / (w / 2) - 1;
  const y = (clientY - rect.top - node.clientTop) / (h / 2) - 1;
  const reach = Math.max(Math.abs(x), Math.abs(y));
  if (reach < 0.001) return;

  writeGlow(node, x / reach, y / reach);
}

/**
 * The starry ground and the bloom are entirely CSS on .hz-resume — see
 * nav.css. All this has to do is be one hover (and tap) target, which is what
 * lets AnimateIcon slot onto it and animate the arrow from anywhere inside,
 * and tell the glow which point of the button's outline the cursor is nearest.
 *
 * Tracking lives on the document, not on the control: the bloom is meant to
 * wake as the cursor approaches, and a pointer listener on the button itself
 * cannot see that. Touches are ignored — a finger cannot walk the light around
 * without stealing the scroll, so the resting bloom is the whole effect there.
 */
export function ResumeLink({ size }: { size: number }) {
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const ditherId = `hz-rd-${useId().replace(/:/g, "")}`;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      followGlow(node, event.clientX, event.clientY);
    };

    const onLeave = () => restGlow(node);

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <span
      ref={ref}
      className="hz-resume-host"
      style={{ ["--hz-glow-dither" as string]: `url("#${ditherId}")` }}
    >
      {/*
        Sibling behind the chip, not a child of it. A CSS filter on a descendant
        can composite above later siblings in Chromium, which is how the bloom
        used to shine through the opaque plate. Sitting behind the painted link,
        it can only wrap the outline.
      */}
      <span className="hz-resume-glow" aria-hidden />
      <svg
        className="hz-resume-dither-src"
        aria-hidden
        focusable={false}
        width="0"
        height="0"
      >
        <filter
          id={ditherId}
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur
            in="SourceGraphic"
            stdDeviation="9"
            result="bloom"
          />
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="3"
            stitchTiles="stitch"
            result="noise"
          />
          <feColorMatrix
            in="noise"
            type="saturate"
            values="0"
            result="grain"
          />
          <feComponentTransfer in="grain" result="film">
            <feFuncA type="linear" slope="0.22" />
          </feComponentTransfer>
          {/* Grain only where the bloom is. Unclipped, feTurbulence paints a
              square of film the size of the filter region — the box behind
              the button. */}
          <feComposite
            in="film"
            in2="bloom"
            operator="in"
            result="dust"
          />
          <feBlend in="bloom" in2="dust" mode="overlay" />
        </filter>
      </svg>
      {/*
        Own compositor layer, wrapping the motion link. A filter on the glow
        sibling can still composite through the chip itself; this face sits
        above that filter with an opaque fill, so the bloom can only wrap the
        outline.
      */}
      <span className="hz-resume-face">
        <AnimateIcon asChild animateOnHover animateOnTap animate={focused}>
          <Link
            href={RESUME_HREF}
            className="hz-resume"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            {...(RESUME_READY ? { download: "Meet-Bhatt-Resume.pdf" } : {})}
          >
            <Download className="hz-nav-icon" size={size} />
            <span>Resume</span>
          </Link>
        </AnimateIcon>
      </span>
    </span>
  );
}
