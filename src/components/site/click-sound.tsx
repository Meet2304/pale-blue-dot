"use client";

import { useEffect } from "react";

import { createClickSound } from "@/components/universe/intro-sound";
import { getMuted } from "@/lib/sound-pref";

/**
 * A quiet tick, the same one that sounds as the opening loads, for every
 * press of a button or link. Silent when the music switch is off.
 */
export function ClickSound() {
  useEffect(() => {
    const sound = createClickSound();
    const onClick = (e: MouseEvent) => {
      if (getMuted() || !(e.target instanceof Element)) return;
      const hit = e.target.closest("a[href], button, [role='button']");
      if (hit && !hit.matches(":disabled")) sound.ping();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
