"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Where the warp lands. Deliberately almost empty: an eyebrow, a heading and a
 * rule. The project content isn't finalised, so this builds the destination the
 * transition needs without inventing work that would only be torn out.
 *
 * Entrance is the system's only entrance — fade and rise 10px — held until the
 * section is actually in view, so it reads as arriving rather than as already
 * having been there.
 */
export function Arrival() {
  const ref = useRef<HTMLElement>(null);
  const [arrived, setArrived] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setArrived(true);
          observer.disconnect();
        }
      },
      /* Low, so the section is already fading up as it enters rather than
         sitting blank for a quarter of its height first. */
      { threshold: 0.12 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      data-arrived={arrived ? "true" : "false"}
      style={{
        background: "var(--bg-page)",
        minHeight: "100svh",
        display: "flex",
        alignItems: "center",
      }}
    >
      <div
        style={{
          maxWidth: "var(--container-max)",
          margin: "0 auto",
          padding: "var(--space-10) var(--space-6)",
          width: "100%",
        }}
      >
        <div className="hz-arrive">
          <span className="hz-eyebrow">The other side</span>
          <h2
            style={{
              fontSize: "var(--text-display-l)",
              margin: "var(--space-5) 0 var(--space-7)",
              maxWidth: "20ch",
            }}
          >
            You came a long way <em>for a quiet room</em>
          </h2>
          <hr className="hz-rule" style={{ maxWidth: "var(--container-narrow)" }} />
          <p
            style={{
              marginTop: "var(--space-5)",
              color: "var(--text-muted)",
              fontSize: "var(--text-body-l)",
              maxWidth: "44ch",
            }}
          >
            The work goes here — one project at a time, once each one is finished enough
            to be worth the flight.
          </p>
        </div>
      </div>
    </section>
  );
}
