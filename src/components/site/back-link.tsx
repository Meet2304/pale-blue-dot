"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft } from "@/components/animate-ui/icons/arrow-left";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { routes } from "@/lib/routes";
import { canGoBack, nextPage } from "@/lib/visit";

/**
 * "Back": to the page the visitor was on before this one, through the
 * browser's own history, so it opens where it was left (the same place in
 * the universe, the opening not played again). Stepping back through history
 * gets no page transition of its own, so it is given one: the browser's,
 * held until the page it goes back to is on screen. Arriving here from
 * outside the site, there is nothing to go back to, and it opens the
 * universe. The arrow moves when pointed at.
 */
export function BackLink({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <AnimateIcon asChild animateOnHover>
      <Link
        href={routes.home}
        className={className}
        onClick={(e) => {
          if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
            return;
          if (!canGoBack()) return;
          e.preventDefault();
          const back = () => {
            const shown = nextPage();
            router.back();
            return shown;
          };
          const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          if (!document.startViewTransition || calm) {
            void back();
            return;
          }
          /* Typed "back", for the same movement as any other step home
             (globals.css); a browser without types crossfades. */
          try {
            document.startViewTransition({ update: back, types: ["back"] });
          } catch {
            document.startViewTransition(back);
          }
        }}
      >
        <ArrowLeft size={14} aria-hidden />
        Back
      </Link>
    </AnimateIcon>
  );
}
