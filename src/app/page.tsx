import type { Metadata } from "next";
import Link from "next/link";

import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: { absolute: "Pale Blue Dot — Coming Soon" },
  description:
    "Pale Blue Dot is an evolving record of what Meet Bhatt builds, learns, and chooses to pursue.",
};

export default function Home() {
  return (
    <main id="content" className="hz-launch">
      <div className="hz-launch-glow" aria-hidden />
      <section className="hz-launch-content" aria-labelledby="launch-title">
        <p className="hz-eyebrow hz-rise">Pale Blue Dot</p>

        <h1 id="launch-title" className="hz-launch-title hz-rise">
          From a single point of light <em>to a world of its own.</em>
        </h1>

        <p className="hz-launch-copy hz-rise">
          An evolving record of what I build, what I learn, and where I choose to go
          next. The full experience is taking shape.
        </p>

        <div className="hz-launch-actions hz-rise">
          <span className="hz-launch-status">
            <span aria-hidden />
            Coming soon
          </span>
          <Link href={routes.story} className="hz-launch-story">
            Read the story
            <span aria-hidden>↗</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
