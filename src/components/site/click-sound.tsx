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
    /* On the press itself, so it lands with the finger; a key press
       (which has no pointer) sounds on the click it makes. */
    const onPress = (e: Event) => {
      if (getMuted() || !(e.target instanceof Element)) return;
      if (e.type === "click" && (e as MouseEvent).detail !== 0) return;
      const hit = e.target.closest("a[href], button, [role='button']");
      if (hit && !hit.matches(":disabled")) sound.ping();
    };
    document.addEventListener("pointerdown", onPress, true);
    document.addEventListener("click", onPress, true);
    return () => {
      document.removeEventListener("pointerdown", onPress, true);
      document.removeEventListener("click", onPress, true);
    };
  }, []);
  return null;
}
