"use client";

import { useEffect, useRef, useState } from "react";

const POOL = [":", ";", "-", "=", "+", "×", "/", "\\", "|", "~", "*", "·"];

/**
 * Text that decodes when it changes: the old string gives way to glyphs,
 * which settle left to right into the new one. The same motion as the scan
 * wave, at the size of a line. Screen readers get the real text at once.
 */
export function Decode({
  text,
  className,
  step = 24,
}: {
  text: string;
  className?: string;
  step?: number;
}) {
  const [shown, setShown] = useState(text);
  const prev = useRef(text);

  useEffect(() => {
    if (prev.current === text) return;
    prev.current = text;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let f = 0;
    const id = setInterval(
      () => {
        f++;
        const settled = calm ? text.length : Math.floor(f / 1.3);
        setShown(
          text
            .split("")
            .map((ch, i) =>
              i < settled || ch === " "
                ? ch
                : POOL[Math.floor(Math.random() * POOL.length)],
            )
            .join(""),
        );
        if (settled >= text.length) clearInterval(id);
      },
      calm ? 0 : step,
    );
    return () => clearInterval(id);
  }, [text, step]);

  return (
    <span className={className}>
      <span
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
        }}
      >
        {text}
      </span>
      <span aria-hidden>{shown}</span>
    </span>
  );
}
