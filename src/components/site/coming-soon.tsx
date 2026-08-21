import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";

/**
 * The placeholder every route wears until its real page is designed.
 *
 * It deliberately mirrors `arrival.tsx` — same eyebrow, same display heading,
 * same hairline rule, same muted note — so the site keeps one voice while the
 * real pages get written, instead of four different guesses at what a page
 * looks like here.
 *
 * Uses `.hz-rise` rather than `.hz-arrive`: the latter needs a client
 * IntersectionObserver to flip `data-arrived`, which buys nothing on a page
 * whose entire content is above the fold. `.hz-rise` is a pure CSS animation,
 * so this stays a server component. Both are already reduced-motion-safe.
 */
export function ComingSoon({
  eyebrow,
  title,
  note,
}: {
  eyebrow: string;
  title: ReactNode;
  note: string;
}) {
  return (
    <main
      id="content"
      style={{
        /* Transparent, not --bg-page: the star field is fixed behind the whole
           document and painting black over it would hide it on every route but
           the hero, which is the one route it is *supposed* to be hidden on. */
        background: "transparent",
        minHeight: "100svh",
        paddingTop: "var(--nav-h)",
        display: "flex",
        alignItems: "center",
      }}
    >
      <div
        style={{
          maxWidth: "var(--container-max)",
          margin: "0 auto",
          padding: "var(--space-9) var(--space-6)",
          width: "100%",
        }}
      >
        {/* 700ms, not the class default of --dur-cinematic. 1100ms is the
            hero's budget; a placeholder page has not earned it. */}
        <div className="hz-rise" style={{ "--hz-dur": "700ms" } as CSSProperties}>
          <span className="hz-eyebrow">{eyebrow}</span>
          <h1
            style={{
              fontSize: "var(--text-display-l)",
              margin: "var(--space-5) 0 var(--space-7)",
              maxWidth: "18ch",
            }}
          >
            {title}
          </h1>
          <hr className="hz-rule" style={{ maxWidth: "var(--container-narrow)" }} />
          <p
            style={{
              marginTop: "var(--space-5)",
              color: "var(--text-muted)",
              fontSize: "var(--text-body-l)",
              maxWidth: "46ch",
            }}
          >
            {note}
          </p>
          <p style={{ marginTop: "var(--space-7)" }}>
            <Link href="/" style={{ fontSize: "var(--text-body-s)" }}>
              Back to the beginning
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
