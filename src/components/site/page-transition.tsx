import { ViewTransition, type ReactNode } from "react";

/**
 * How a page comes and goes (the keyframes are in globals.css). The
 * universe is the far view; every other page is a closer look. Leaving the
 * universe, it slips past as if the camera were moving in, and the page
 * comes forward out of the dark; going back, the page falls away and the
 * universe settles back into place. Updates within a page don't animate.
 */
export function PageTransition({
  universe = false,
  children,
}: {
  universe?: boolean;
  children: ReactNode;
}) {
  return (
    <ViewTransition
      enter={universe ? "vt-return" : "vt-arrive"}
      exit={universe ? "vt-recede" : "vt-leave"}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
