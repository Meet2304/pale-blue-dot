import type { Metadata } from "next";

import { plexVariables } from "@/app/fonts";
import { StarField } from "@/components/site/star-field";
import { BackLink } from "@/components/site/back-link";
import { PageTransition } from "@/components/site/page-transition";
import { CopyEmail } from "@/components/universe/copy-email";
import { Footer } from "@/components/universe/footer";
import { PageNav } from "@/components/universe/page-nav";
import { ResumeMark } from "@/components/universe/resume-mark";
import { CONTACT } from "@/content/work";
import { SOCIAL_LINKS } from "@/lib/socials";

import s from "./contact.module.css";
import { HorizonGlyphs } from "./horizon-glyphs";

export const metadata: Metadata = {
  title: "Contact",
  description: "How to reach Meet Bhatt: email, LinkedIn, GitHub and X.",
};

/* Each profile's mark, from svglogos.dev (public/logos/social/). */
const MARKS: Record<(typeof SOCIAL_LINKS)[number]["id"], string> = {
  github: "/logos/social/github-icon.svg",
  linkedin: "/logos/social/linkedin-icon.svg",
  x: "/logos/social/x.svg",
};

/**
 * The contact page: a horizon. The rim of a world rises at the foot of the
 * screen, lit from behind, its air drawn in the terminal's characters and
 * alive (horizon-glyphs.tsx), under a twinkling sky; above it, "Say hello.",
 * the address with a way to copy it, and where else Meet is. The world's
 * dark runs on, without an edge, into the foot of the page. Arriving, the
 * world rises into place; leaving, it sets below the screen.
 */
export default function ContactPage() {
  return (
    <PageTransition>
      <div className={plexVariables}>
        <PageNav />
        <main id="content" className={s.root}>
          <StarField />
          {/* The air glows up from behind the world's rim; the two come
              and go together with the page (globals.css, "horizon"). */}
          <div
            className={s.horizon}
            style={{ viewTransitionName: "horizon" }}
            aria-hidden
          >
            <HorizonGlyphs className={s.air} />
            <span className={s.planet} data-planet />
          </div>

          <header className={s.top}>
            <BackLink className={s.back} />
          </header>

          <section className={s.center}>
            <p className={s.kicker}>Contact</p>
            <h1 className={s.title}>Say hello.</h1>
            <p className={s.lede}>
              Questions, ideas, or work you think I&apos;d care about: write to me. I
              read everything.
            </p>
            <div className={s.mail}>
              <CopyEmail
                email={CONTACT.email}
                className={s.address}
                buttonClassName={s.copy}
              />
            </div>
            <ul className={s.channels}>
              {SOCIAL_LINKS.map((l) => (
                <li key={l.id}>
                  <a href={l.href} target="_blank" rel="noreferrer" data-id={l.id}>
                    <span
                      className={s.mark}
                      style={{ maskImage: `url(${MARKS[l.id]})` }}
                      aria-hidden
                    />
                    {l.label}
                  </a>
                </li>
              ))}
              <li>
                <a href={CONTACT.resume} target="_blank" rel="noreferrer">
                  <ResumeMark className={s.resumeMark} />
                  Resume
                </a>
              </li>
            </ul>
          </section>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
}
