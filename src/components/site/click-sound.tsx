"use client";

import { useEffect } from "react";

import { createClickSound } from "@/components/universe/intro-sound";
import { getMuted } from "@/lib/sound-pref";

/* Things that are pressed, by what they are. */
const PRESSABLE =
  "a[href], button, summary, label, select, input, [role=button], [role=link], [role=tab], [role=menuitem], [role=switch], [role=checkbox], [tabindex]:not([tabindex='-1'])";

/* ...and by how they behave: the pointer turns to a hand over anything made
   clickable some other way (a picture that opens, a body on the canvas). */
const isPressable = (el: Element) => {
  const hit = el.closest(PRESSABLE);
  if (hit) return !hit.matches(":disabled, [aria-disabled='true']");
  return getComputedStyle(el).cursor === "pointer";
};

/**
 * A quiet tick, the same one that sounds as the opening loads, for every
 * press of a link, button or anything else that answers to one. Silent
 * when the music switch is off.
 *
 * A mouse press ticks at once, on pointer down. A touch or a key press
 * ticks on the click it makes instead: browsers only let a page start
 * sound from a touch when it ends, and a key has no pointer at all.
 */
export function ClickSound() {
  useEffect(() => {
    const sound = createClickSound();
    let mouseDown = false;

    const press = (e: Event) => {
      if (getMuted() || !(e.target instanceof Element)) return;
      if (isPressable(e.target)) sound.ping();
    };
    const onPointerDown = (e: PointerEvent) => {
      mouseDown = e.pointerType === "mouse";
      if (mouseDown) press(e);
    };
    const onClick = (e: MouseEvent) => {
      /* Already sounded on the press. */
      if (mouseDown && e.detail !== 0) {
        mouseDown = false;
        return;
      }
      press(e);
    };

    /* Any first gesture readies the audio (touch counts when it ends). */
    const unlock = () => sound.unlock();
    const gestures = ["pointerdown", "keydown", "touchend"] as const;
    gestures.forEach((g) =>
      document.addEventListener(g, unlock, { capture: true, passive: true }),
    );

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("click", onClick, true);
    return () => {
      gestures.forEach((g) => document.removeEventListener(g, unlock, true));
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("click", onClick, true);
    };
  }, []);
  return null;
}
