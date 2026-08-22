"use client";

import { useRef, useState, type PointerEvent } from "react";
import Link from "next/link";

import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Download } from "@/components/animate-ui/icons/download";
import { RESUME_HREF, RESUME_READY } from "@/components/site/nav-items";

/** Where the light rests when nothing is pointing at it: the bottom edge, middle. */
const REST_X = "0";
const REST_Y = "1";

/**
 * The starry ground and the bloom are entirely CSS on .hz-resume — see
 * nav.css. All this has to do is be one hover (and tap) target, which is what
 * lets AnimateIcon slot onto it and animate the arrow from anywhere inside, and
 * tell the glow which point of the button's outline the cursor is nearest. The
 * tracking is a pointer effect only — see onPointerCancel below for why a touch
 * never gets to drive it.
 */
export function ResumeLink({ size }: { size: number }) {
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLAnchorElement>(null);

  /* Written straight to the node rather than held in state: this fires on every
     pointer move across the control, and the repo's rule is that nothing in a
     hot path costs a render.

     What goes out is a direction, not a position — a point on the button's
     outline as a fraction of its own half-width and half-height, which is all
     the CSS needs and means nothing here has to know how big the glow is or how
     far past the button it is blown out. That mismatch was the old bug: this
     handler mapped the cursor onto a box 14px larger than the button while the
     glow had grown to 50px larger, so the light lagged the cursor. There is now
     no second number to keep in step. */
  const track = (event: PointerEvent<HTMLAnchorElement>) => {
    const node = ref.current;
    if (!node) return;

    /* The padding box, not the border box: an absolutely positioned child is
       laid out against its ancestor's padding box, so that is the rectangle the
       glow host — and therefore the outline the light rides — is measured from.
       One border-width out of true is invisible under a 9px blur, but it would
       be a puzzle to anyone who came here later and did the arithmetic. */
    const rect = node.getBoundingClientRect();
    const w = node.clientWidth;
    const h = node.clientHeight;
    if (w === 0 || h === 0) return;

    const x = (event.clientX - rect.left - node.clientLeft) / (w / 2) - 1;
    const y = (event.clientY - rect.top - node.clientTop) / (h / 2) - 1;

    /* Push the point outward along the ray from the centre until it meets the
       outline, rather than dropping it on whichever edge is nearest. Nearest-
       edge flips the moment the cursor crosses a diagonal, and the light would
       jump straight across the button to the other side; a ray only ever slides
       it around the outline, so every path between two points is a path the eye
       can follow. Dividing by the larger of the two puts whichever axis the
       cursor leans toward on ±1 — its edge — and leaves the other proportional,
       which is the corner. */
    const reach = Math.max(Math.abs(x), Math.abs(y));
    /* Dead centre has no direction to speak of. Leaving the light where it was
       is right: the cursor is a pixel from pointing somewhere definite again. */
    if (reach < 0.001) return;

    node.style.setProperty("--hz-glow-x", (x / reach).toFixed(3));
    node.style.setProperty("--hz-glow-y", (y / reach).toFixed(3));
  };

  const recentre = () => {
    const node = ref.current;
    if (!node) return;
    node.style.setProperty("--hz-glow-x", REST_X);
    node.style.setProperty("--hz-glow-y", REST_Y);
  };

  return (
    <AnimateIcon asChild animateOnHover animateOnTap animate={focused}>
      <Link
        ref={ref}
        href={RESUME_HREF}
        className="hz-resume"
        onPointerMove={track}
        onPointerLeave={recentre}
        /* A touch gets exactly one pointermove before the browser decides the
           drag is a pan, takes the gesture, and cancels the pointer — so the
           light cannot be walked around with a finger, and it should not be left
           wherever that one stray move put it. Recentring on cancel is what
           returns it to the bottom edge, which is where the mobile card wants it
           anyway: there is no hover on a phone, so the resting bloom is the
           whole effect there. */
        onPointerCancel={recentre}
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
