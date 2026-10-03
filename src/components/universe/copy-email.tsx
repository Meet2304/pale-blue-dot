"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, X } from "lucide";
import { MorphIcon } from "morphicons/react";

import s from "./copy-email.module.css";

type State = "idle" | "done" | "failed";

const ICONS = { idle: Copy, done: Check, failed: X };
const SAID = { idle: "", done: "Copied", failed: "Couldn't copy" };

/**
 * The address, as a mail link, and a way to copy it, for anyone whose
 * computer has no mail app set up, which is most people's: one line of
 * text, the copy icon standing at its end like a last character, a single
 * hairline running under both. Pressed, the icon morphs (morphicons, on its
 * smooth spring) into a green check, or a red cross if the copy was
 * refused, while the hairline fills in that colour from the left, as if the
 * line had been read; a moment later both go back.
 */
export function CopyEmail({ email, className }: { email: string; className?: string }) {
  const [state, setState] = useState<State>("idle");
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    window.clearTimeout(timer.current);
    let next: State = "done";
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      /* No clipboard (an insecure page, or refused): the link still works. */
      next = "failed";
    }
    setState(next);
    timer.current = window.setTimeout(() => setState("idle"), 1800);
  };

  return (
    <span className={`${s.unit} ${className ?? ""}`} data-state={state}>
      <a className={s.address} href={`mailto:${email}`}>
        {email}
      </a>
      <button
        type="button"
        className={s.copy}
        aria-label="Copy email address"
        onClick={copy}
      >
        <MorphIcon
          icon={ICONS[state]}
          spring="smooth"
          reducedMotion="user"
          size="0.8em"
          strokeWidth={1.75}
        />
      </button>
      <span className={s.said} aria-live="polite">
        {SAID[state]}
      </span>
    </span>
  );
}
