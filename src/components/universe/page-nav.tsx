"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { routes } from "@/lib/routes";
import { requestChapter } from "@/lib/visit";

import { UniverseNav } from "./nav";
import s from "./universe.module.css";

/**
 * The universe's bar, on the pages beside it (the story, contact, each
 * piece of work), docked at the top as it is past the hero, and the phone's
 * menu with it. What it would fly to on the home page (a chapter, a piece
 * of work) it opens the home page at instead.
 */
export function PageNav() {
  const router = useRouter();
  const goTo = useCallback(
    (chapter: number) => {
      requestChapter(chapter);
      router.push(routes.home);
    },
    [router],
  );
  return (
    <div className={s.root} data-universe-root>
      <UniverseNav goTo={goTo} docked />
    </div>
  );
}
