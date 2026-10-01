"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

import { isTerminalRoute } from "@/lib/routes";

/* The Horizon chrome is its own chunk, fetched only when a Horizon page is
   shown: the home page, on Terminal, never loads its sky, bar or blurs. */
const HorizonChrome = dynamic(() =>
  import("./horizon-chrome").then((m) => m.HorizonChrome),
);

/**
 * Everything that sits outside the page and survives navigation: the sky, the
 * bar, and the skip link.
 *
 * It exists so the root layout can stay a server component while one client
 * boundary owns the hero gate — the star field and the nav ask the same
 * question ("are we past the warp?"), and asking it twice would mean two
 * IntersectionObservers watching the same 1px marker.
 */
export function SiteChrome() {
  const pathname = usePathname();

  /* The Terminal pages bring their own sky and their own controls; only the
     skip link carries over. */
  if (isTerminalRoute(pathname)) {
    /* In the system's own face: the Terminal pages load no Horizon font,
       and the link alone would otherwise fetch one. */
    return (
      <a
        href="#content"
        className="hz-skip"
        style={{ fontFamily: "system-ui, sans-serif" }}
      >
        Skip to content
      </a>
    );
  }

  return <HorizonChrome />;
}
