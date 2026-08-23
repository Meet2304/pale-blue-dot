"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/**
 * The body of the Note: five breaths, then a name.
 *
 * The photograph lives in the server page above this, so this file is only
 * the words — and the one reason it is a client component at all, which is
 * the same IntersectionObserver Arrival already uses. Each beat holds until
 * it is actually in view, so the letter is read rather than already present
 * as a block of type you scroll past.
 *
 * The signature face is passed in from the server page. It is not a face of
 * the system, and it has no business arriving on every route.
 */
export function TheNote({ signatureClassName }: { signatureClassName: string }) {
  return (
    <article className="hz-note-letter">
      <NoteBeat immediate>
        <p className="hz-note-copy">
          This picture was taken from about six billion kilometers away. The whole
          planet is a single point of light — barely there, easy to miss. Everything
          anyone has ever done, ever loved, ever built, happened on that point.
        </p>
      </NoteBeat>

      <NoteBeat>
        <p className="hz-note-pause">That still gets me.</p>
      </NoteBeat>

      <NoteBeat>
        <p className="hz-note-copy">
          This is the only place anything has ever been made. That is what the picture
          is for me. I want to add something to that point of light — work that is mine,
          that wasn&apos;t there before.
        </p>
      </NoteBeat>

      <NoteBeat>
        <p className="hz-note-copy">
          Everything I build is already that. Not a rehearsal, and not a wait for a
          purpose to arrive fully formed. The work is how the purpose shows up.
        </p>
      </NoteBeat>

      <NoteBeat>
        <p className="hz-note-copy hz-note-close">
          This site is that work, one piece at a time.
        </p>
      </NoteBeat>

      <NoteBeat>
        <hr className="hz-rule hz-note-rule" />
        <p className={`hz-note-sign ${signatureClassName}`}>Meet Bhatt</p>
      </NoteBeat>
    </article>
  );
}

/**
 * One breath of the letter. `data-arrived` sits on the wrapper and `.hz-arrive`
 * on the inner node because that is how the system's entrance is wired —
 * Arrival does the same, and inventing a second way to fade up 10px would be
 * the kind of accumulation the site is built against.
 */
function NoteBeat({
  children,
  immediate = false,
}: {
  children: ReactNode;
  immediate?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [arrived, setArrived] = useState(false);

  useEffect(() => {
    if (immediate) return;
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setArrived(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [immediate]);

  if (immediate) {
    return (
      <div className="hz-note-beat">
        <div
          className="hz-rise"
          style={
            {
              ["--hz-dur"]: "var(--dur-arrive)",
              ["--hz-delay"]: "180ms",
            } as CSSProperties
          }
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="hz-note-beat" data-arrived={arrived ? "true" : "false"}>
      <div className="hz-arrive">{children}</div>
    </div>
  );
}
