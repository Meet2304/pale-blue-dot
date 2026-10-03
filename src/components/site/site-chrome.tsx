"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { markIntroOver } from "@/lib/sound-pref";
import { notePath } from "@/lib/visit";

import { ClickSound } from "./click-sound";
import { Music } from "./music";

/**
 * What survives navigation, outside every page: the skip link, and a note
 * of where the visitor has been, for the back links (back-link.tsx).
 */
export function SiteChrome() {
  const pathname = usePathname();
  useEffect(() => notePath(pathname), [pathname]);
  /* Only the home page has an opening to wait for. */
  useEffect(() => {
    if (pathname !== "/") markIntroOver();
  }, [pathname]);
  return (
    <>
      <a href="#content" className="skip">
        Skip to content
      </a>
      <ClickSound />
      <Music />
    </>
  );
}
