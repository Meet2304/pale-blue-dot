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
        <h1 id="launch-title" className="hz-launch-title hz-rise">
          Coming Soon
        </h1>

        <div className="hz-launch-actions hz-rise">
          <Link href={routes.story} className="hz-launch-story">
            Read the story
            <span aria-hidden>↗</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
