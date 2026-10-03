"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, X } from "lucide";
import { MorphIcon } from "morphicons/react";

import s from "./copy-email.module.css";

type State = "idle" | "done" | "failed";

const ICONS = { idle: Copy, done: Check, failed: X };
const SAID = { idle: "", done: "Copied", failed: "Couldn't copy" };

/**
 * The address, as a mail link, with a button that copies it: for anyone
 * whose computer has no mail app set up, which is most people's. Pressed,
 * its icon morphs (morphicons, on its smooth spring) into a green check, or
 * a red cross if the copy was refused, and back again a moment later.
 */
export function CopyEmail({
  email,
  className,
  buttonClassName,
}: {
  email: string;
  className?: string;
  buttonClassName?: string;
}) {
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
    <>
      <a className={className} href={`mailto:${email}`}>
        {email}
      </a>
      <button
        type="button"
        className={`${s.button} ${buttonClassName ?? ""}`}
        data-state={state}
        aria-label="Copy email address"
        onClick={copy}
      >
        <MorphIcon icon={ICONS[state]} spring="smooth" reducedMotion="user" size={16} />
      </button>
      <span className={s.said} aria-live="polite">
        {SAID[state]}
      </span>
    </>
  );
}
