import type { Metadata } from "next";
import Link from "next/link";

import { SocialLogo } from "@/components/site/social-logo";
import { routes } from "@/lib/routes";
import { SOCIAL_LINKS } from "@/lib/socials";

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

        <nav className="hz-launch-socials" aria-label="Social profiles">
          {SOCIAL_LINKS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="hz-launch-social hz-rise"
              aria-label={item.label}
              title={item.label}
              target="_blank"
              rel="noreferrer"
            >
              <SocialLogo name={item.id} size={19} />
            </a>
          ))}
        </nav>
      </section>
    </main>
  );
}
